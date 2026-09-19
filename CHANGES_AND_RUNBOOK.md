# Change set: Alumni, Exam Documents, All Students, Access fixes

Mr. Raju is the admin. This file is the runbook and the written record for the tickets.

## 0. One-time setup (do this first)

1. Run the migration in the Supabase SQL editor (staging first):
   `api/sql/alumni_exams_all_students.sql`
   It is additive and idempotent. It adds `students.graduation_date` / `is_alumni`, the `alumni`,
   `exam_events`, `exam_submissions` tables, the `audience` columns for the All Students option, the two
   new notification types and the `revoke_user_sessions()` function.
2. Cloudflare R2 bucket CORS (required for browser -> R2 uploads, file bytes never touch Fly.io):

   ```json
   [
     {
       "AllowedOrigins": ["https://<your-production-web-domain>", "http://localhost:3000"],
       "AllowedMethods": ["PUT", "GET", "HEAD"],
       "AllowedHeaders": ["*"],
       "ExposeHeaders": ["ETag"],
       "MaxAgeSeconds": 3600
     }
   ]
   ```
3. API environment (Fly.io secrets / `api/.env`). Existing ones stay; make sure these are correct for production:
   `FRONTEND_URL` (production web URL, also used for CORS and email deep links), `GOOGLE_REDIRECT_URI`
   (production API callback URL), `GOOGLE_IDENTITY_REDIRECT_URI`, `LMS_TIMEZONE` (Asia/Kolkata),
   optional `CORS_ORIGINS` (comma separated extra web origins).
4. Web environment: `NEXT_PUBLIC_SERVER_URL` = the API base URL.

## 1. Commands

API (from `octet-lms/api`):

```bash
npm install
npm run dev          # nodemon, http://localhost:8000
npm start            # production style
# Deploy
fly deploy
# Roles
node scripts/admin-roles.js list
node scripts/admin-roles.js show <email>
node scripts/admin-roles.js set <raju-email> both
```

Web (from `octet-lms/web`):

```bash
npm install
npm run dev          # http://localhost:3000
npm run build && npm start
```

## 2. What was built

### 1.1 Hall ticket and 12th marksheet collection
- Admin > Exam Documents (`/admin/exams`): create an exam event (name, date, All Students or chosen batches).
- "Open hall ticket window" notifies every targeted active student (in-app notification + email) through the
  existing `notifications.service.js`. No new sender. The notification and email link to
  `/student/exam-documents/<id>?kind=hall-ticket`.
- "Open results window" is only allowed after the exam date passes and sends the marksheet prompt.
- Student upload screen: JPG, PNG or PDF, 10 MB limit, clear error messages. Flow: API signs a presigned PUT
  URL -> browser PUTs to R2 -> API verifies the stored object (type and size) and records it.
  Marksheet can also be entered manually (marks obtained, maximum, grade).
- Student dashboard banner shows until every requested document is submitted.
- Admin tracking table per event, per document type, with a "Pending only" filter and View / Download links.
- Submissions are stored against `student_id` + `exam_event_id` and stay with the student when they move to Alumni.

### 1.2 Alumni and automatic access revoke
- Graduation date is editable in the student edit form, inline in the Student Database table, and as a bulk
  action per batch.
- Access is decided from `graduation_date` on every authenticated API request (`middleware/auth.js`) and at
  login, so it ends on the same day even if the archive job has not run. The student's sessions are destroyed.
  Login message is exactly: "Your access has been revoked because you graduated."
- Archive job (every 10 minutes, plus immediately when a past/today date is saved) copies the record to
  `public.alumni`, removes roster enrollments (stored for restore) and flags the student. Nothing is deleted.
- Admin > Alumni (`/admin/alumni`, admin only): search by name / roll / batch / year, filter by batch and batch
  year, full record view (profile, contact, parents, batch, attendance, tests, documents, exam documents).
- Restore: clears the graduation date, re-enrolls the original batches, re-enables access.
- Alumni are excluded from attendance rosters, online class invites, test access and notifications.
- Design note: the `students` row is kept (flagged) because attendance, test and document history is keyed on it.
  Moving or deleting it would cascade-delete or orphan that history, which the ticket forbids.

### 2.1 All Students
- New "All Students" option in: online class scheduling, attendance (Grade row), test scheduling and the test
  filter, and exam events.
- It is a rule (`audience = 'ALL'`), never a batch students are added to. Resolved at time of use to every
  active student, so students added later are included and alumni are excluded automatically.
- A student in several batches counts once (id de-duplication; attendance uses a set of session ids).
- Mixing rule (chosen): All Students and individual batches are mutually exclusive. The UI clears one when the
  other is chosen and the API rejects a mixed request with 400.
- Existing batch classes, tests and attendance rows are untouched (default `audience = 'BATCH'`).

## 3. Written record for the tickets

### 3.1 Admin access audit (comment for the ticket)
Root cause: `lib/pageStatus.ts` applied the release-status gate ("coming soon") to admin accounts too. Only the
`both` role (Buildify) bypassed it, so a plain `admin` account saw placeholders for any admin page not marked
production. The API side was already correct for `both` in `middleware/auth.js`, but `utils/requireRole.js`
rejected `both` whenever a caller forgot to list it.

Fixed:
- `canAccessPage`: admin and both always reach every `/admin/*` page; the gate only applies to student pages.
- `TestingGuard`: guest-mode evaluation only applies on `/student/*`; admin pages are never downgraded.
- `utils/requireRole.js`: `both` passes every guard.
- Login: student checks now go through the API (`/api/students/access-check`) instead of a direct table read
  that depended on row-level policies; developer role routes to analytics; errors are read from the API's
  `error` field (the shared client previously read `message`, so real errors were hidden).
- CORS now includes `FRONTEND_URL` and `CORS_ORIGINS`, so production web origins are never blocked.
- Nav: Students, Exam Documents and Alumni appear for every admin role.

Checked in code (repeat live as Mr. Raju and as a plain student after `scripts/admin-roles.js set <email> both`):
Dashboard, Content, Attendance, Online Classes, Test Results, Students (all tabs), Exam Documents, Alumni,
Notifications, My Profile, guest mode on and off, login as admin and as student, student Dashboard, Courses,
Notes, Attendance, Classes, Tests, Exam Documents, Notifications, Profile.

Analytics stays limited to admin / developer / both.

Action for the account: `node scripts/admin-roles.js set <raju-email> both`, then Mr. Raju signs out and in.

### 3.2 Google "access blocked" (comment for the ticket)
Cause: the OAuth consent screen is in Testing mode and Mr. Raju's Gmail is not a test user. This is a Google
Cloud Console setting; it cannot be changed from this repository. Steps:
1. Now: APIs & Services > OAuth consent screen > Test users > add Mr. Raju's Gmail. He reconnects. Testing mode
   expires refresh tokens after 7 days (weekly reconnect), so this is a stopgap.
2. Proper fix: set publishing status to In production. Scopes requested (see `googleAuth.service.js`):
   `calendar.events` and `meetings.space.readonly` (sensitive) and `userinfo.email`. Until verification users
   see "Google hasn't verified this app" and can continue via Advanced. For full verification Google needs a
   domain you own (fly.dev does not count), a privacy policy page and a homepage on the Chemistry@OCTET domain.
3. Credentials > OAuth client: Authorised redirect URIs must contain the production `GOOGLE_REDIRECT_URI` and
   `GOOGLE_IDENTITY_REDIRECT_URI`; Authorised JavaScript origins must contain the production web URL.
   `GET /api/google/config-check` (admin) prints exactly what the server is configured with and warns about
   localhost values.
4. Tokens are stored per teacher (`google_admin_tokens.admin_user_id` is unique) and auto-refresh; a failed
   refresh returns `GOOGLE_REAUTH_REQUIRED`, which the page turns into "Reconnect".
5. The Online Classes page now explains an `access_denied` result instead of a generic error.
6. After connecting, schedule a real class and confirm the Meet link appears.

Status to record on the ticket after doing it: consent screen mode = ____ ; verification = pending domain,
privacy policy and homepage.

### 3.3 Guest mode off -> "coming soon" (comment for the ticket)
Root cause (confirmed in code): leaving guest mode cleared the flag while the student page was still mounted,
so `TestingGuard` re-evaluated the same student URL as the admin's own role against the release-status gate and
rendered "Coming soon" before the redirect to `/admin` completed. The same gate also applied to `/admin/*` for
plain admin accounts, which is why it never showed for the Buildify (`both`) account. Fix: the gate no longer
applies to admin accounts on admin pages or during the guest-mode exit (`lib/pageStatus.ts`,
`components/TestingGuard.tsx`). The admin layout still clears the guest flag on load.
Verify on production: log in as Mr. Raju, toggle guest mode on and off several times, confirm the URL ends on
`/admin` each time.

## 4. Staging test plan (dummy student first)
1. Run the migration on staging.
2. Create a dummy student, set graduation date to today from Admin > Students. Log in as them: exact message
   appears. Check Admin > Alumni shows them with batch year and full history; active list no longer does.
3. Restore from Alumni: student can log in again, enrollments are back.
4. Create an exam event for the dummy student's batch, open the hall ticket window, confirm the notification
   and email, upload a JPG from the linked screen, confirm it appears in the tracking table. After the exam
   date passes, repeat with the marksheet (upload and manual entry).
5. Create an online class, an attendance session and a test with All Students; confirm every active student sees
   them once and the alumnus does not.
