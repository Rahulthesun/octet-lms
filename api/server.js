/**
 * server.js
 * ─────────────────────────────────────────────────────────────
 * Entry point for the CO Admin Dashboard API.
 *
 * How Express boots up:
 *  1. We create an `app` instance – this is just an object that
 *     holds all your middleware and route definitions.
 *  2. We attach middleware (functions that run on EVERY request
 *     before it hits a route handler).
 *  3. We mount routers – each router owns a "prefix" like
 *     /api/content/pdf and handles all sub-routes under it.
 *  4. We call app.listen() to actually start the HTTP server.
 * ─────────────────────────────────────────────────────────────
 */

const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const { globalLimiter } = require("./middleware/rateLimit");
const sanitizeErrors = require("./middleware/sanitizeErrors");
const app = express();

const IS_PROD = process.env.NODE_ENV === "production";

// Behind Fly.io's proxy: trust one hop so rate limiting sees the real client IP.
app.set("trust proxy", 1);

// This is a JSON API (no HTML), so a strict default policy is safe. The
// cross-origin resource policy is relaxed because the web app on another
// origin fetches signed/streamed responses from here.
app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));

app.use(cors({
  origin(origin, callback) {

    if (!origin) return callback(null, true);

    // Production / staging web origins come from the environment so the
    // live site is never blocked: FRONTEND_URL plus an optional
    // comma-separated CORS_ORIGINS list.
    const configured = [process.env.FRONTEND_URL, ...(process.env.CORS_ORIGINS || "").split(",")]
      .map((o) => (o || "").trim().replace(/\/$/, ""))
      .filter(Boolean);

    // Local/LAN origins are a development convenience only — never trusted in
    // production. Tunnel domains (e.g. trycloudflare.com) must be listed
    // explicitly in CORS_ORIGINS; a wildcard would trust anyone's subdomain.
    const devOrigin = !IS_PROD && (
      origin.startsWith("http://localhost") ||
      origin.startsWith("http://192.168.") ||
      origin.endsWith(".trycloudflare.com") ||
      origin.endsWith(".vercel.app") ||
      configured.includes(origin.replace(/\/$/, ""))
    ) {
      return callback(null, true);
    }

    callback(new Error("Not allowed by CORS"));
  },

  credentials: true,
}));
// ── Middleware ────────────────────────────────────────────────
// express.json() parses incoming request bodies that have the
// Content-Type: application/json header. Without this, req.body
// would be undefined in your route handlers.
app.use(express.json({ limit: "1mb" }));

// Blanket per-IP request ceiling; stricter limiters sit on the sensitive routes.
app.use("/api", globalLimiter);
app.use(sanitizeErrors);

// express.urlencoded() handles form submissions (HTML <form> POST).
// { extended: true } allows nested objects in the body.
app.use(express.urlencoded({ extended: true, limit: "1mb" }));



// ── Routers ───────────────────────────────────────────────────
// Each router file defines a group of related routes.
// The string you pass to app.use() is the "mount path" – every
// route defined inside that router is relative to this prefix.
//
// Example: pdfRouter has a route GET /  → actual URL is GET /api/content/pdf
const pdfRouter      = require("./routes/pdf.routes");
const videoRouter    = require("./routes/video.routes");
const subjectRouter  = require("./routes/subject.routes");
const chapterRouter  = require("./routes/chapter.routes");
const subtopicRouter = require("./routes/subtopic.routes");
const storageRouter  = require("./routes/storage.routes");

const studentRouter  = require("./routes/students.routes");
const analyticsRouter = require("./routes/analytics.routes")
const attendanceRouter = require("./routes/attendance.routes");
const securityRouter = require("./routes/security.routes")
const searchRouter = require("./routes/search.routes")
const onlineClassesRouter = require("./routes/onlineClasses.routes");
const googleAuthRouter = require("./routes/googleAuth.routes");
const googleIdentityRouter = require("./routes/googleIdentity.routes");
const attendanceSettingsRouter = require("./routes/attendanceSettings.routes");
const testSettingsRouter = require("./routes/testSettings.routes");
const dashboardRouter = require("./routes/dashboard.routes");
const personalTasksRouter = require("./routes/personalTasks.routes");
const parentReportsRouter = require("./routes/parentReports.routes");
const progressReportsRouter = require("./routes/progressReports.routes");
const testsRouter = require("./routes/tests.routes");
const videoAnalyticsRouter = require("./routes/videoAnalytics.routes");
const notificationsRouter = require("./routes/notifications.routes");
const alumniRouter = require("./routes/alumni.routes");
const passwordResetRouter = require("./routes/passwordReset.routes");
const questionBankRouter = require("./routes/questionBank.routes");
const examDocumentsRouter = require("./routes/examDocuments.routes");
const qaContentRouter = require("./routes/qaContent.routes");
const { startAlumniScheduler } = require("./services/alumniScheduler.service");
const { startScheduler: startAttendanceSyncScheduler } = require("./services/onlineAttendanceSync.service");
const { startMonthlyReportScheduler } = require("./services/parentReportScheduler.service");
const { startAbsenceNotifyScheduler } = require("./services/absenceNotifyScheduler.service");
const { startTestAutoSubmitScheduler } = require("./services/testAutoSubmitScheduler.service");
const { startTestResultReportScheduler } = require("./services/testResultReportScheduler.service");
const { startNotificationRemindersScheduler } = require("./services/notificationReminders.service");

app.use("/api/content/pdf",  pdfRouter);
app.use("/api/content/video", videoRouter);
app.use("/api/subjects",      subjectRouter);
app.use("/api/chapters",      chapterRouter);
// Re-enabled for the new Q&A / Practice Questions feature, which needs a
// working POST /api/subtopics to create a "Class" under a Unit (chapter).
// The old admin Content Manager UI never called this route, but the
// backend route itself is functional — confirmed via subtopic.controller.js
// / subtopic.service.js.
app.use("/api/subtopics",     subtopicRouter);
app.use("/api/storage",       storageRouter);

//For indexed file search 
app.use("/api/search", searchRouter);

//For analytics related routes!!!
app.use("/api/analytics", analyticsRouter );

//Students Management 
app.use("/api/students", studentRouter);
 
// For Attendance related Ops:
app.use("/api/attendance", attendanceRouter);

// Online classes (Google Calendar + Google Meet integration)
app.use("/api/online-classes", onlineClassesRouter);
app.use("/api/google", googleAuthRouter);
app.use("/api/google-identity", googleIdentityRouter);
app.use("/api/attendance-settings", attendanceSettingsRouter);
app.use("/api/test-settings", testSettingsRouter);
app.use("/api/dashboard", dashboardRouter);
app.use("/api/personal-tasks", personalTasksRouter);
app.use("/api/parent-reports", parentReportsRouter);
app.use("/api/progress-reports", progressReportsRouter);
app.use("/api/tests", testsRouter);
app.use("/api/video-analytics", videoAnalyticsRouter);
app.use("/api/notifications", notificationsRouter);
app.use("/api/alumni", alumniRouter);
app.use("/api/auth", passwordResetRouter);
app.use("/api/question-bank", questionBankRouter);
app.use("/api/exam-documents", examDocumentsRouter);
app.use("/api/qa-content", qaContentRouter);

app.use("/api/security" , securityRouter)
 

// ── Health check ──────────────────────────────────────────────
// A simple GET / so you can confirm the server is running.
// Hit http://localhost:5000 in the browser or with curl.
app.get("/", (req, res) => {
  res.json({ message: "Chemistry@OCTET API is running !!" });
});

// ── 404 handler ───────────────────────────────────────────────
// If no route matched, Express falls through to here.
// The order matters – this must come AFTER all route definitions.
app.use((req, res) => {
  res.status(404).json({ error: "Route not found" });
});

// ── Global error handler ──────────────────────────────────────
// Any route/middleware that calls next(err) lands here.
// Express identifies error-handling middleware by its 4-argument
// signature: (err, req, res, next).
app.use((err, req, res, next) => {
  console.error(err.stack);
  // Never send stack traces / raw database errors to the client in production.
  if (err.message === "Not allowed by CORS") return res.status(403).json({ error: "Origin not allowed" });
  const body = { error: "Internal server error" };
  if (!IS_PROD) body.detail = err.message;
  res.status(err.status && err.status < 500 ? err.status : 500).json(body);
});

// ── Start listening ───────────────────────────────────────────
const PORT = process.env.PORT || 8000;

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on http://0.0.0.0:${PORT}`);

  // Post-class Google Meet attendance sync — checks periodically for
  // classes whose scheduled end + configured delay has passed and
  // calculates/writes their attendance automatically. See
  // services/onlineAttendanceSync.service.js.
  startAttendanceSyncScheduler();

  // Same-day "your ward is absent" parent alerts — checks periodically for
  // sessions whose class has actually ended. See
  // services/absenceNotifyScheduler.service.js.
  startAbsenceNotifyScheduler();

  // Monthly attendance PDF report to father/mother/student — checks
  // periodically for the last day of the month at/after 6:30 PM IST. See
  // services/parentReportScheduler.service.js.
  startMonthlyReportScheduler();

  // Safety net for MCQ test attempts that were never explicitly submitted
  // (closed tab, lost connection) — auto-grades them once their test's
  // scheduled end has passed. See services/testAutoSubmitScheduler.service.js.
  startTestAutoSubmitScheduler();

  // Sends result-report emails deferred while a test was still open for
  // other students, the moment its window closes. See
  // services/testResultReportScheduler.service.js.
  startTestResultReportScheduler();

  // Test-starting-soon and task-due-soon in-app/email reminders. See
  // services/notificationReminders.service.js.
  startNotificationRemindersScheduler();

  // Graduation archive: moves students whose graduation date has arrived
  // into Alumni. Access is already blocked by the auth middleware from the
  // date itself; this job is the tidy-up. See services/alumniScheduler.service.js.
  startAlumniScheduler();
});
// trigger nodemon restart
