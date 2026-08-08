# Google Meet + Google Calendar Integration

How the LMS schedules real online classes: the admin fills in one form in
the LMS, and the backend talks to the Google Calendar API to create the
event, attach a Google Meet conference, invite the students, and (via
Calendar's own notification mechanism plus the LMS's existing email system)
notify them — all without the admin ever opening Google Calendar or Meet
directly.

On top of that, the LMS also **automatically records attendance** for
those classes: after each class ends, the backend reads the real
participation data for that Meet conference (who joined, when, for how
long) via the official Google Meet REST API, and writes it straight into
the same attendance tables used for offline/QR attendance. No one has to
manually take attendance for an online class.

No browser automation, no scraping. Everything goes through Google's
official Calendar API + Meet API + OAuth 2.0.

---

## 1. Architecture recap

```
LMS Frontend (Next.js)
      |  HTTPS, Supabase JWT
      v
LMS Backend (Express)
      |
      +--> LMS Database (Supabase/Postgres) — online_classes, google_admin_tokens
      |
      +--> Google Calendar API (googleapis, server-side only)
                |
                +--> creates the event
                +--> attaches a Google Meet conference (conferenceData)
                +--> invites attendees -> Google sends the Calendar invite/notification
                |
      +--> LMS email system (existing nodemailer/Brevo transporter) — its own copy of the notification

--- after the class ends (in-process scheduler, no external cron) ---

LMS Backend (Express)
      |
      +--> Google Meet API v2 (googleapis, server-side only, admin's token)
                |
                +--> conferenceRecords: find the record for that Meet space/time window
                +--> participants + participantSessions: real join/leave timestamps
      |
      +--> merge/clamp intervals -> minutes attended -> % -> present/partial/absent
      |
      +--> LMS Database — attendance_sessions / attendance_records (the SAME tables
           offline QR attendance already writes to)
```

Calendar's `conferenceData.createRequest` is Google's documented way of
creating a Meet conference as part of creating the event, in one request —
that part of the flow never calls the Meet API directly. The Meet API is
only used afterwards, read-only, to pull attendance for a conference that
already happened.

### Where everything lives

| Concern | File |
|---|---|
| OAuth token encryption | `api/utils/googleTokenCrypto.js` |
| OAuth CSRF (`state`) signing | `api/utils/oauthState.js` |
| Timezone math | `api/utils/timezone.js` |
| Google OAuth client + token storage/refresh | `api/services/googleAuth.service.js` |
| Calendar event create/update/cancel | `api/services/googleCalendar.service.js` |
| Google Meet API calls (conference record + participants) | `api/services/googleMeet.service.js` |
| Student's own Google identity link (for attendance matching) | `api/services/googleIdentity.service.js`, `api/controllers/googleIdentity.controller.js`, `api/routes/googleIdentity.routes.js` → mounted at `/api/google-identity` |
| Attendance interval math (merge/clamp/%/classify) | `api/utils/meetInterval.js` |
| Automatic post-class attendance sync engine + scheduler | `api/services/onlineAttendanceSync.service.js` |
| Configurable attendance thresholds (singleton settings row) | `api/services/attendanceSettings.service.js`, `api/controllers/attendanceSettings.controller.js`, `api/routes/attendanceSettings.routes.js` → mounted at `/api/attendance-settings` |
| Online class business logic (idempotency, conflicts, notifications, attendance session linkage) | `api/services/onlineClasses.service.js` |
| Attendance business logic (offline + online, override, unmatched participants) | `api/services/attendance.service.js` |
| Google connect/callback/status/disconnect | `api/controllers/googleAuth.controller.js`, `api/routes/googleAuth.routes.js` → mounted at `/api/google` |
| Online class CRUD + manual sync trigger | `api/controllers/onlineClasses.controller.js`, `api/routes/onlineClasses.routes.js` → mounted at `/api/online-classes` |
| LMS email notification | `sendOnlineClassEmail` in `api/utils/email.js` |
| DB schema — classes | `api/sql/online_classes.sql` |
| DB schema — online attendance sync + settings + student Google identity | `api/sql/online_attendance.sql` |
| Admin UI — schedule/manage classes, sync status, attendance settings | `web/app/admin/online-classes/page.tsx` |
| Admin UI — attendance reports, per-session drill-down, override | `web/components/admin/AttendanceReportsTab.tsx`, `web/components/admin/SessionAttendanceModal.tsx` |
| Student UI — join class | `web/app/student/classes/page.tsx` |
| Student UI — attendance history (shows online-class duration/status) | `web/app/student/attendance/page.tsx` |
| Student UI — link/unlink Google account | `web/app/student/profile/page.tsx` (`GoogleIdentityCard`) |
| Student notification bell | `web/components/student/NotificationBell.tsx` |
| Frontend data hooks | `web/hooks/useOnlineClasses.ts`, `web/hooks/useAttendanceData.ts` |

Nothing here duplicates existing systems: scheduling reuses the existing
`batches`/`batch_enrollments` tables for "Student Group", the existing
`subjects` table for "Course/Subject", the existing `verifyToken`/
`requireRole` middleware for auth, and the existing nodemailer/Brevo
transporter for email. Attendance reuses the existing
`attendance_sessions`/`attendance_records` tables — online-class attendance
is additive columns on those same tables, not a parallel system, so it
automatically counts towards each student's existing overall attendance
percentage.

---

## 2. Google Cloud Console setup

1. Go to <https://console.cloud.google.com/> and create (or reuse) a project.
2. **APIs & Services → Library** → enable:
   - **Google Calendar API** — creates the event + Meet conference.
   - **Google Meet API** — reads conference/participant data for automatic
     attendance. This is a separate API from Calendar and must be enabled
     on its own; if it's not enabled, attendance sync fails with a clear
     `SYNC_FAILED` error mentioning the API, so it's easy to spot if this
     step gets missed.
3. **APIs & Services → OAuth consent screen**:
   - User type: **Internal** if your Google Workspace admin account belongs
     to a Workspace domain and only staff on that domain will ever connect;
     otherwise **External** (and add the admin's Google account under
     **Test users** while the app is in "Testing" publishing status — no
     Google verification review is required as long as it stays in Testing
     and only test users use it).
   - App name / support email / logo: whatever fits your institution.
   - Scopes: add the three admin scopes listed below (§4). If a student
     Google-identity-link flow will be used, no extra consent-screen setup
     is needed for it — it requests only the basic `openid email` scopes,
     which don't need to be pre-declared.
4. **APIs & Services → Credentials → Create Credentials → OAuth client ID**:
   - Application type: **Web application**.
   - Authorized redirect URIs — add **both**:
     - Admin scheduling flow: `<API_BASE_URL>/api/google/callback`
     - Student identity-link flow: `<API_BASE_URL>/api/google-identity/callback`
     - Local dev: `http://localhost:8000/api/google/callback` and
       `http://localhost:8000/api/google-identity/callback` (or whatever
       `PORT` your API runs on).
     - Production: `https://<your-api-domain>/api/google/callback` and
       `https://<your-api-domain>/api/google-identity/callback`.
   - Save the generated **Client ID** and **Client Secret** — both flows
     share the same OAuth client, just different redirect URIs and scopes.

> **Already connected an admin account before this attendance feature was
> added?** The admin must **reconnect** (disconnect then Connect Google
> Account again in the Online Classes page) so the new
> `meetings.space.readonly` scope (§4) is actually granted — an existing
> token issued under the old, narrower scope set will not have access to
> the Meet API and attendance sync will fail with a permission error until
> they reconnect.

---

## 3. Environment variables

Add to `api/.env` (never commit this file):

```env
# Google OAuth
GOOGLE_CLIENT_ID=xxxxxxxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=xxxxxxxx
GOOGLE_REDIRECT_URI=http://localhost:8000/api/google/callback

# Redirect URI for the separate, lightweight student "link your Google
# account" identity flow (used only to match Meet attendance to a student —
# no tokens are stored for this flow, just the verified Google user id)
GOOGLE_IDENTITY_REDIRECT_URI=http://localhost:8000/api/google-identity/callback

# Secret used to sign the OAuth CSRF `state` param (any long random string) —
# reused for both the admin and the student identity OAuth flows
GOOGLE_OAUTH_STATE_SECRET=replace-with-a-long-random-string

# Secret used to encrypt stored Google tokens at rest (any long random string —
# it's hashed down to 32 bytes internally, so it doesn't need to be exactly 32)
GOOGLE_TOKEN_ENCRYPTION_KEY=replace-with-a-different-long-random-string

# Where the browser should land after the OAuth consent flow completes
FRONTEND_URL=http://localhost:3000

# Institutional timezone — every class's displayed time (LMS + Calendar +
# email) is computed in this zone
LMS_TIMEZONE=Asia/Kolkata
```

Generate strong random values for the two secrets, e.g.:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

The existing `BREVO_SMTP_*`, `BREVO_FROM_EMAIL`, `BREVO_FROM_NAME`, and
`LOGIN_URL` variables are reused as-is for the email notification — nothing
new needed there.

**Never commit** `.env`, any downloaded `client_secret.json`, or any of the
above values to Git. All of it stays in environment variables /
your hosting provider's secrets manager.

---

## 4. OAuth scopes requested

**Admin scheduling flow** (`/api/google/*`, token stored encrypted):

```
https://www.googleapis.com/auth/calendar.events
https://www.googleapis.com/auth/meetings.space.readonly
https://www.googleapis.com/auth/userinfo.email
```

`calendar.events` is intentionally narrow — it can create/update/delete
events and their conference data, but cannot touch calendar *settings* or
other calendars. `meetings.space.readonly` is what lets the backend read
conference records and participant sessions for the attendance sync — it
cannot create, join, or modify a meeting. `userinfo.email` is only used to
show which Google account is connected in the admin UI ("Connected as
teacher@school.edu").

**Student identity-link flow** (`/api/google-identity/*`, no token stored):

```
openid
email
```

This flow only verifies who the student's Google account is (via
`verifyIdToken`) so their Meet participant records can be matched to them —
it never requests Calendar or Meet access and never stores an access/refresh
token, only the verified Google user id (`sub`) and email on the `students`
row.

---

## 5. Database schema

Run **both** SQL files once, in order, in the Supabase SQL editor
(**Project → SQL Editor → New query** → paste → Run):

**1. `api/sql/online_classes.sql`** — creates:

- `google_admin_tokens` — one encrypted token pair per admin who has
  connected a Google account.
- `online_classes` — the scheduled classes themselves (title, description,
  times, timezone, `google_event_id`, `google_meet_url`, `status`,
  `idempotency_key`), linked to the existing `batches` and `subjects`
  tables.
- `online_class_attendees` — optional individually-added students beyond
  the batch roster.

**2. `api/sql/online_attendance.sql`** — extends the *existing* attendance
tables and adds a settings table:

- `attendance_sessions` gains: `source` (`'QR'` or `'GOOGLE_MEET'`),
  `online_class_id` (links a session to the online class it was generated
  from), `sync_status` (`NOT_STARTED` / `LIVE` / `AWAITING_ATTENDANCE_SYNC`
  / `SYNCED` / `SYNC_FAILED` / `MANUALLY_REVIEWED`), `last_synced_at`,
  `google_conference_record_name`, `sync_error`, `sync_attempts`,
  `unmatched_participants` (jsonb).
- `attendance_records` gains: `status` (tri-state present/partial/absent),
  `duration_minutes`, `automatic_pct`, `automatic_status` (what the sync
  engine calculated — preserved forever, even after an override),
  `final_pct`, `final_status` (what's actually used — equals the automatic
  values unless an admin overrode them), `was_overridden`, `override_by`,
  `override_reason`, `override_at`, `synced_at`. The legacy `present`
  boolean column is untouched and kept in sync, so every existing
  percentage calculation in the codebase keeps working unmodified.
- `attendance_settings` — a **singleton** row (fixed id
  `00000000-0000-0000-0000-000000000001`) holding the configurable
  `present_threshold` / `partial_threshold` percentages and the post-class
  sync delay, editable from the admin UI.
- `students` gains `google_user_id` (unique, nullable), `google_identity_email`,
  `google_identity_linked_at` — populated only when a student links their
  Google account from their profile page.

No existing table is dropped or has data removed; both files use
`CREATE TABLE IF NOT EXISTS` / `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` /
`CREATE INDEX IF NOT EXISTS`, so re-running either is safe.

---

## 6. How automatic online-class attendance works

1. **Class ends.** Nothing happens immediately — Google Meet itself can
   take a few minutes to finalize the conference record after the last
   participant leaves.
2. **A configurable delay later** (default 5 minutes, editable in the admin
   "Attendance Settings" panel on the Online Classes page), the in-process
   scheduler (`onlineAttendanceSync.service.js`, polling every 60s) or an
   admin's manual **Sync Attendance** button calls `syncClassAttendance`.
3. It looks up the Meet **conference record** for that class's Meet space
   and time window (`googleMeet.service.js`). If Google hasn't finalized it
   yet, the session is marked `AWAITING_ATTENDANCE_SYNC` and the function
   returns — **no attendance is written, no one is marked absent**; the
   next scheduler pass (or a manual **Retry Sync**) tries again, up to 5
   automatic attempts before it needs a manual retry.
4. Once the record exists, it lists every **participant** and their
   **join/leave sessions**. A participant is matched to an LMS student
   **only** by their verified Google user id (`google_user_id`, set when
   the student links their Google account from their profile) — never by
   display name, which anyone can set to anything. Participants that can't
   be matched go into an **Unknown Participant** queue on that session
   (visible in the attendance drill-down modal) with **Ignore** /
   **Manually Assign Student** actions.
5. For each matched student, their session intervals are merged (no
   double-counting overlapping/re-joins) and clamped to the official class
   start/end window, then summed into minutes attended → a percentage of
   class duration → classified **Present** (≥ present threshold, default
   75%) / **Partial** (≥ partial threshold, default 40%) / **Absent**,
   using `api/utils/meetInterval.js`.
6. A row is written for **every enrolled student**, including ones who
   never joined at all (0 minutes → Absent) — the roster is always
   complete, never just "whoever showed up."
7. Rows are **upserted** (`onConflict: session_id,student_id`) — running
   sync again (scheduler retry, or an admin clicking Sync again) updates
   the same rows rather than duplicating them. If an admin has already
   **overridden** a student's status for that session, the resync
   preserves that override instead of silently recalculating over it; the
   automatically-calculated values are always kept too (`automatic_pct`/
   `automatic_status`), separately from whatever is currently "final."
8. Because attendance is written into the existing
   `attendance_sessions`/`attendance_records` tables (just with
   `source = 'GOOGLE_MEET'`), it shows up automatically in every existing
   attendance view — student attendance history/percentage, admin batch
   summaries, and PDF/CSV reports — with no separate "online attendance
   percentage" to reconcile.

**Admin controls**, all in the Online Classes page and the attendance
drill-down modal:

- **Attendance Settings** panel — edit present/partial thresholds and the
  post-class sync delay.
- Per-class **sync status badge** (Not Started / Live / Awaiting Sync /
  Synced / Sync Failed / Manually Reviewed) plus **Sync Attendance** /
  **Retry Sync** buttons — safe to click any number of times.
- **View attendance** on a class or in the Attendance Reports' day-by-day
  breakdown opens the same drill-down modal used for offline sessions: full
  roster with duration/%/status, an **Override** control per student (with
  a required reason, fully audited), the Unknown Participant queue, and a
  **Mark Reviewed** button once an admin has checked a session over.

---

## 7. Local development

```bash
# 1. Backend
cd api
npm install              # installs googleapis alongside existing deps
# fill in api/.env as above
npm run dev               # nodemon, http://localhost:8000

# 2. Frontend
cd ../web
npm install
npm run dev                # http://localhost:3000
```

Then, as an admin:

1. Log in and go to **Online Classes** in the sidebar.
2. Click **Connect Google Account** → sign in with the Google account that
   should organize classes → you'll land back on the same page with
   "Google account connected". (If this account was connected before the
   attendance feature existed, disconnect and reconnect it once, so the new
   `meetings.space.readonly` scope is granted.)
3. Click **Schedule Online Class**, fill the form, submit.
4. Check: the class appears in the admin table with a **Join** button; the
   organizer's real Google Calendar shows the event with a Meet link; every
   enrolled student's email inbox gets both Google's calendar invite and
   the LMS's own notification email; each student sees the class (with a
   working **Join Google Meet** button) under **Online Classes** in their
   own portal, on the calendar, and via the notification bell.

As a student, from **Profile**, click **Link Google Account** and sign in
with the same Google account you'll use to join classes — this is what
lets the sync engine match your Meet participation to you. (Not required
before joining a class, only before attendance can be automatically
matched — anyone who joins without linking first shows up as an Unknown
Participant for the admin to manually assign.)

After a class's scheduled end time (plus the configured sync delay), check
**Online Classes** for the sync status badge to turn **Synced**, then open
**Attendance** on that class (or the day-by-day breakdown in **Attendance
Reports**) to see the calculated roster.

---

## 8. Testing checklist

- **Schedule**: fill the form, submit once → exactly one Google Calendar
  event + one Meet link is created; the class appears immediately in both
  the admin table and every enrolled student's portal.
- **Double-submit**: click "Schedule Online Class" twice quickly (or resend
  the same request with the same `idempotencyKey`) → only one Google Meet
  is created; the second response returns the same class.
- **Time conflict**: try to schedule two classes for the same batch with
  overlapping times → the second is rejected with a clear error before any
  Google API call is made.
- **Reschedule**: change the time on an existing class → the Google
  Calendar event's time updates, the Meet link stays the same, and
  attendees get an updated Calendar notification.
- **Cancel**: cancel a class → the Google Calendar event is removed
  (attendees get Google's cancellation notice), the LMS row is kept with
  `status = 'cancelled'`, and the Join button disappears from the student
  UI.
- **Google not connected**: with no Google account connected, try to
  schedule → a clear "Google account not connected" error is shown, no LMS
  row is left behind.
- **Token expired/revoked**: manually revoke access at
  <https://myaccount.google.com/permissions>, then try to schedule or
  reschedule → the admin gets an error indicating they need to reconnect
  (`GOOGLE_REAUTH_REQUIRED`), and no fake/empty-link class is created.
- **Role checks**: confirm a student JWT gets `403` from every
  `/api/online-classes` write route and from all of `/api/google/*`; confirm
  a student can only ever see their own classes via `GET
  /api/online-classes/me/upcoming`.
- **Attendance — normal sync**: after a class ends and the sync delay
  passes, the scheduler (or a manual **Sync Attendance** click) marks the
  session `SYNCED` and every enrolled student gets an attendance row —
  including students who never joined (0 min → Absent).
- **Attendance — not ready yet**: sync before Google has finalized the
  conference record → session goes to `AWAITING_ATTENDANCE_SYNC`, **no**
  attendance rows are written, nobody is marked absent; a later retry
  succeeds once the record exists.
- **Attendance — re-sync is idempotent**: click **Sync Attendance** /
  **Retry Sync** multiple times on an already-synced class → row count per
  session stays exactly one per enrolled student (no duplicates), values
  simply refresh.
- **Attendance — partial join**: a student who joins late/leaves early for
  less than the present threshold but at least the partial threshold →
  classified **Partial**; below the partial threshold (or never joined) →
  **Absent**; at/above the present threshold → **Present**.
- **Attendance — multiple sessions**: a student who leaves and rejoins the
  same Meet → their disjoint intervals are merged/summed, not
  double-counted and not overwritten by the later session alone.
- **Attendance — override persists across resync**: override a student's
  status with a reason, then trigger sync again → the override is kept
  (`final_status`/`final_pct` unchanged), while `automatic_status`/
  `automatic_pct` still reflect the freshly recalculated Meet data.
- **Attendance — unmatched participant**: have someone join the Meet using
  a Google account not linked to any student → they appear in that
  session's Unknown Participant queue (not silently dropped, not
  guessed-by-name); **Manually Assign Student** creates their attendance
  row and links their Google id for future auto-matching; **Ignore**
  removes them from the queue without creating a row.
- **Attendance — feeds existing stats**: confirm a synced online-class
  session changes the student's overall attendance percentage on the
  existing student attendance page and the existing admin batch
  summary/report — no separate "online %" appears anywhere.
- **Attendance — student cannot see others' data**: confirm a student JWT
  can only ever fetch their **own** attendance history/records — never
  another student's Meet session detail, duration, or unmatched-participant
  data (that stays admin-only).
- **Meet API not enabled / OAuth missing scope**: temporarily disable the
  Google Meet API (or test with a not-yet-reconnected admin token) → sync
  fails cleanly into `SYNC_FAILED` with a readable `sync_error`, and no
  attendance rows are corrupted or left half-written.

---

## 9. Production deployment

1. Set all the §3 environment variables on your production host (same
   names, including `GOOGLE_IDENTITY_REDIRECT_URI`). Use a **different**
   `GOOGLE_OAUTH_STATE_SECRET` and `GOOGLE_TOKEN_ENCRYPTION_KEY` than local
   dev.
2. In Google Cloud Console, add **both** production redirect URIs
   (`https://<your-api-domain>/api/google/callback` and
   `https://<your-api-domain>/api/google-identity/callback`) to the OAuth
   client's **Authorized redirect URIs** (you can keep the localhost ones
   too — Google allows multiple).
3. Confirm both **Google Calendar API** and **Google Meet API** are enabled
   for the production project (they're per-project, so enabling them in a
   dev project doesn't carry over to a separate production project).
4. Set `FRONTEND_URL` to your production frontend origin so the OAuth
   callback redirects to the right place.
5. If your OAuth consent screen is in "Testing" publishing status, add every
   admin's Google account under **Test users** (Testing mode allows up to
   100 test users and needs no Google review). Move to "In production" only
   if you need more than that or a broader Workspace domain — that requires
   Google's verification review since the `calendar.events` and
   `meetings.space.readonly` scopes are sensitive/restricted.
6. Re-run `api/sql/online_classes.sql` **and** `api/sql/online_attendance.sql`
   against the production database if they haven't been applied yet (order
   matters — `online_attendance.sql` alters tables the first file creates).
7. Any admin who connected their Google account against the production
   project before this attendance feature shipped needs to reconnect once,
   same as in dev, to pick up the new scope.
8. Deploy normally (this repo's existing Dockerfile/Fly.io config is
   untouched by this feature) — the attendance sync scheduler starts
   in-process automatically when the API boots (`startAttendanceSyncScheduler`
   in `api/server.js`), no separate worker/cron service to deploy.

---

## 10. Security notes

- Google tokens are stored **only** in `google_admin_tokens`, encrypted
  with AES-256-GCM under `GOOGLE_TOKEN_ENCRYPTION_KEY`, and are never sent
  to the frontend — the browser only ever receives `{ connected, email }`.
- The OAuth `state` parameter is an HMAC-signed, timestamped token (10
  minute expiry) — Google's redirect back to `/api/google/callback` can't
  carry a normal Authorization header, so this signed state is what proves
  the callback belongs to the admin who initiated it (CSRF protection).
- All scheduling/reschedule/cancel routes require `verifyToken` +
  `requireRole(["admin", "developer"])` (the same middleware every other
  admin-only feature in this codebase uses). Students can only hit
  `GET /api/online-classes/me/upcoming`, which is scoped server-side to
  their own batch/enrollment via their JWT — there is no way for a student
  to request another student's or another batch's classes.
- Scheduling is idempotent: the class row is claimed (`status='pending'`)
  in the database *before* Google is called; if Google fails, the pending
  row is deleted and a clear error is returned — an LMS class is never left
  in a "successful" state without a real Meet link.
- **Meet attendance data is only ever fetched server-side**, using the
  admin's stored, encrypted token — the Meet API is never called from the
  browser and no participant/session data is ever sent to the frontend
  except as already-computed, per-session attendance rows scoped to what
  the caller is authorized to see.
- **Students can only ever see their own attendance.** Every student-facing
  attendance route is scoped server-side to the caller's own student id from
  their JWT — a student cannot request another student's Meet session
  detail, duration, or the Unknown Participant queue (which is admin-only)
  by any route in this codebase.
- **Participant matching never trusts display names.** A Meet participant
  is only linked to a student via their verified `google_user_id`, captured
  through Google's own `verifyIdToken` during the student's identity-link
  flow — never guessed from the `displayName` string the Meet API returns,
  which any participant can set to anything.
- **The student identity-link flow stores no tokens at all** — it uses
  `access_type: "online"`, only reads the verified `sub`/`email` from the
  ID token once during the callback, and persists only those two values (plus
  a linked timestamp) on the student's own row. There is nothing here for
  an attacker to steal that would grant ongoing access to the student's
  Google account.
- **Overrides are fully audited and non-destructive.** An admin override
  writes `final_status`/`final_pct`/`was_overridden`/`override_by`/
  `override_reason`/`override_at` without ever touching `automatic_status`/
  `automatic_pct` — the system's own calculation is always recoverable, and
  who changed what, when, and why is always on record.
- Sync is idempotent the same way scheduling is: `attendance_records` rows
  are `upsert`ed on the same `(session_id, student_id)` uniqueness the
  offline QR/manual-mark paths already relied on — re-running sync (retry,
  scheduler re-poll, manual re-click) can never create duplicate rows.

---

## 11. Designed-in extensibility (not built now, per the current scope)

- **Per-faculty Google accounts**: `google_admin_tokens` is already keyed
  one row per admin user id, not a single global row — letting additional
  staff connect their own account later needs no schema change, only
  relaxing the `requireRole(["admin","developer"])` check on the scheduling
  routes to include a "teacher" role once one exists.
- **Real-time attendance** (join/leave events as they happen, instead of
  polling after class ends): the Google Workspace Events API can push
  Meet conference/participant events directly — `onlineAttendanceSync.
  service.js` is deliberately structured so a future events-webhook handler
  could call the same interval-merge/classify/upsert logic per event
  instead of the current end-of-class batch read, without changing the
  attendance data model at all. Not built now.
- **Recordings**: `online_classes` has room to add a `recording_url` column
  later without touching anything else, once Meet recordings-to-Drive is
  wired up — also deliberately not built now.
