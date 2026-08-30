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
const app = express();

app.use(cors({
  origin(origin, callback) {

    if (!origin) return callback(null, true);

    if (
      origin.startsWith("http://localhost") ||
      origin.startsWith("http://192.168.") ||
      origin.endsWith(".trycloudflare.com")
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
app.use(express.json());

// express.urlencoded() handles form submissions (HTML <form> POST).
// { extended: true } allows nested objects in the body.
app.use(express.urlencoded({ extended: true }));



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
const dashboardRouter = require("./routes/dashboard.routes");
const personalTasksRouter = require("./routes/personalTasks.routes");
const parentReportsRouter = require("./routes/parentReports.routes");
const testsRouter = require("./routes/tests.routes");
const videoAnalyticsRouter = require("./routes/videoAnalytics.routes");
const notificationsRouter = require("./routes/notifications.routes");
const { startScheduler: startAttendanceSyncScheduler } = require("./services/onlineAttendanceSync.service");
const { startMonthlyReportScheduler } = require("./services/parentReportScheduler.service");
const { startAbsenceNotifyScheduler } = require("./services/absenceNotifyScheduler.service");
const { startTestAutoSubmitScheduler } = require("./services/testAutoSubmitScheduler.service");
const { startNotificationRemindersScheduler } = require("./services/notificationReminders.service");

app.use("/api/content/pdf",  pdfRouter);
app.use("/api/content/video", videoRouter);
app.use("/api/subjects",      subjectRouter);
app.use("/api/chapters",      chapterRouter);
//app.use("/api/subtopics",     subtopicRouter); DEPRECATED USE OF SUBTOPIC ROUTER
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
app.use("/api/dashboard", dashboardRouter);
app.use("/api/personal-tasks", personalTasksRouter);
app.use("/api/parent-reports", parentReportsRouter);
app.use("/api/tests", testsRouter);
app.use("/api/video-analytics", videoAnalyticsRouter);
app.use("/api/notifications", notificationsRouter);

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
  res.status(500).json({ error: "Internal server error", detail: err.message });
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

  // Test-starting-soon and task-due-soon in-app/email reminders. See
  // services/notificationReminders.service.js.
  startNotificationRemindersScheduler();
});