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

---

# Change set 2: Question bank and image questions

## Setup
1. Run `api/sql/question_bank_and_image_questions.sql` in the Supabase SQL editor (staging first). It adds the
   `question_bank` table, the image columns on `test_questions`, and back-fills the bank from every existing test.
2. The R2 bucket CORS from section 0 must allow PUT from the web origin (question images upload from the browser).
3. Optional: `POST /api/question-bank/backfill` re-runs the back-fill (idempotent).

## What was built
- MCQ creator is image-first for the question and each of the four options. Ctrl+V / Cmd+V a screenshot, drag and
  drop, or click to choose. Images are resized to at most 1600 px wide and encoded as WebP (PNG fallback) in the
  browser, then uploaded straight to R2 with a presigned URL. A small toggle per field switches it to plain text.
  Preview, Replace and Remove are available; a question or option with neither image nor text is rejected in the
  UI and by the API.
- Students see images (test screen, results, answer review) and admins see them in attempt review, all through
  6-hour signed URLs, responsive on mobile. Storage keys are never sent to students. Grading is unchanged (compares
  the chosen option letter).
- Question bank: every question is saved automatically when a test's questions are written, grouped under the test
  title. "Import from question bank" in the test creator lists past tests (with search), shows their questions,
  and imports selected questions or a whole test as independent copies. Copies can be edited or deleted freely; the
  source is kept only as a tracking reference (`test_questions.bank_question_id`).
- Deleting a test never deletes bank rows (`source_test_id` is deliberately not a foreign key) and does not delete
  question images. The same question is never stored twice (unique content hash, matched between JS and SQL).
- Old text-only tests are untouched: all new type columns default to `text`.

---

# Change set 3: Exam security, chapters, test analytics, batch cleanup

## Setup
1. Run `api/sql/test_chapter_link.sql` in the Supabase SQL editor (adds `tests.chapter_id`).
2. Run `api/sql/remove_stray_all_students_batch.sql` — it first SHOWS what it would remove, then only deletes the
   stray "All Students Batch" row from `public.batches` if no student is enrolled in or assigned to it. Read its
   output before re-running the delete step.
3. Restart the API so the new schedulers start (`services/testResultReportScheduler.service.js`).

## What was built

### 1. Results withheld until the test ends, plus exam/review screenshot deterrents
- Marks, the correct answers and the question/answer review are now withheld from a student until the test's own
  `scheduled_end` has passed — even if that student submitted early and their MCQ was auto-graded instantly.
  A student who finishes early sees "Submitted — results available after <time>" with no questions shown.
- The result-report email/PDF (previously sent the instant an MCQ auto-graded) is deferred the same way, by a new
  scheduler (`testResultReportScheduler.service.js`, every 2 minutes) that sends it once the test's window closes.
- The live exam screen and the post-exam review screen both apply best-effort anti-copy protection
  (`components/shared/ExamSecurity.tsx`): right-click, text selection, copy/cut, image drag, Ctrl+S/P/C/U, devtools
  shortcuts and the PrintScreen key are blocked where a browser allows blocking them; the page blurs the instant
  the tab loses focus or is hidden. No browser can make OS-level screenshotting or screen recording impossible —
  this is stated plainly in the code comments, not oversold.
- The review screen additionally shows a translucent "OCTET" + student name/roll tiled watermark, so a leaked
  screenshot can be traced. The watermark only appears there — never during the live exam, and never in the admin
  question bank or test authoring screens.

### 2. Google account connect + admin access for ralinraju107@gmail.com
- That account's role is now `both` (full access) — done directly against the database for this session.
- No Google token was ever stored for that account (confirmed against `google_admin_tokens`), so the failure is
  the Google Cloud OAuth consent screen: it is in Testing mode and this Gmail is not on the Test users list —
  the same cause diagnosed earlier for this same account. This can only be fixed in Google Cloud Console, not in
  this codebase: APIs & Services > OAuth consent screen > Test users > add ralinraju107@gmail.com, then have them
  reconnect from Admin > Online Classes. `GET /api/google/config-check` (admin-only) reports the server's own
  redirect URIs/origins to compare against the Console.

### 3. Chapter dropdown replaces the Subject dropdown in the test creator
- New `GET /api/chapters` (flat list, every chapter across every subject) backs a new "Chapter" field in the test
  creator, replacing the old "Subject" dropdown.
- `tests.chapter_id` is the new, specific reference; `tests.subject_id` is still auto-filled from the chosen
  chapter's own subject, so nothing that reads subject stops working.

### 4. Test result analytics ("Report" button)
- Every test card in Admin > Tests now has a Report button. It opens a modal with: a summary (targeted/attempted/
  evaluated/pass-fail), a score-distribution graph, per-question correctness (MCQ), a batch-wise breakdown (only
  shown when relevant — an All Students test spans several batches), and the full per-student table.
- Each graph can be switched between bar, pie and line (the same chart component already used for attendance).
- "Download as PDF" (`GET /api/tests/:id/analytics/pdf`) exports the same analytics as a formatted report.
- Everything is computed from `test_attempts`/`test_answers`/`test_questions` — no placeholder numbers.

### 5. Removed the stray "All Students Batch" duplicate
- "All Students" is a virtual, database-free option (see the earlier All Students change set) — a real batch row
  with that name was a leftover duplicate. `createBatch` now rejects creating a batch named/id'd "All Students"
  again, and `sql/remove_stray_all_students_batch.sql` removes the existing stray row (guarded — see Setup above).

---

# Change set 4: Online class auto-close and attendance fix

- Root causes found on live data (class "Test 1", 8:20-8:25 PM IST): (1) the Meet conference had no end time and was
  still live hours later - a Calendar-created Meet link never closes while anyone stays connected; (2) both students
  who attended were "unmatched" because they had never linked a Google account, so they were marked absent; (3)
  attendance was measured against the scheduled window even though the host only joined 2 minutes in.
- Auto-close: `services/meetAutoClose.service.js` ends any still-live Meet once the class's scheduled end has passed
  (checked every minute). It needs two extra Google permissions (meetings.space.created / .settings). Reconnect the
  Google account ONCE (Admin > Online Classes shows a warning until you do). Optional grace for overruns:
  env MEET_AUTO_CLOSE_GRACE_MINUTES. Students also no longer see the Join link after the end time.
- Attendance: participants are matched by linked Google account first, then by the student's REGISTERED email/name
  (`utils/participantMatch.js`, conservative: strong unique matches only, then linked permanently). The host is never
  listed as unmatched. Students are measured against the time the host was actually present, with a small grace for
  arriving late or leaving early. Classes with unmatched participants are re-checked automatically for 48 hours, and
  linking a Google account re-runs the class immediately. Students get a "Link Google account" banner.

---

# Change set 5: Auto-close removed, attendance matching hardened, thresholds corrected

- Removed the automatic Meet-closing feature entirely, per instruction: the meeting now only ends when the host
  ends it. Deleted `services/meetAutoClose.service.js`, its scheduler call in `server.js`, the manual
  `/end-meeting` route, and the extra Google scopes (`meetings.space.created`/`.settings`) that were only needed
  for it — no reconnect is required for this.
- Student-facing "Join Google Meet" is now a disabled button once the class's scheduled end time has passed
  (previously it just showed text) — the live meeting itself is left alone.
- Found and fixed a real matching bug: the host's own numeric Google account id was looked up once and cached in
  memory; if that lookup failed for any reason (e.g. right after a server restart) the failure was cached as "no
  organizer", and the host's own join then fell through to student-matching and could show up as an "unmatched
  participant". The lookup no longer swallows errors or caches a failure — a lookup failure now fails that sync
  attempt loudly (and is retried automatically), never silently mis-identifies the host.
- Attendance thresholds corrected in the live database to match exactly what was asked: present at 75% and above,
  partial from 50% up to 75%, absent below 50% (`attendance_settings.partial_threshold` was 40, now 50). These
  values were already read live from the database everywhere (roster, reports, PDFs) — only the stored numbers
  were wrong, not the code path.
- Re-ran attendance sync on the affected class after these fixes and confirmed the host no longer appears in
  "unmatched participants". Checked Google's own Meet API data directly for the specific class the user reported:
  Google itself never recorded a join from that student's account for that particular meeting — see the reply for
  what to check (right Google account, actually admitted into the room, and allowing a few minutes after the class
  for Google to finalize the record) before re-testing.

---

# Change set 6: Forgot password

## Setup (required before this works)
Run `api/sql/password_reset.sql` in the Supabase SQL editor (staging first). It adds one new table,
`password_reset_tokens`. Nothing else needs to run or restart beyond the normal API restart.

## What was built
- Login's "Forgot password?" link went nowhere (`href="#"`) and nothing in the codebase sent a reset email —
  built the whole flow from scratch.
- `/forgot-password`: asks for the registered email, calls `POST /api/auth/forgot-password`. The response is
  identical whether or not the email has an account, so the page can never be used to discover who is registered.
- If the email matches an account (student or staff — both are in Supabase Auth), a one-time link valid for 30
  minutes is emailed through the existing Brevo sender (`sendPasswordResetEmail` in `utils/email.js` — already
  written, just never wired up).
- `/reset-password?token=...`: validates the token up front, then lets the user set a new password.
  `POST /api/auth/reset-password` writes it straight into Supabase Auth via the Admin API
  (`auth.admin.updateUserById`) — it becomes the account's real login credential immediately, the same table every
  login checks. The token is single-use (and every other outstanding token for that account is invalidated at the
  same time), and the account's existing sessions are revoked so a reset also forces a fresh login everywhere.
- Only the token's sha256 hash is ever stored in the database; the raw token exists only in the emailed link.
