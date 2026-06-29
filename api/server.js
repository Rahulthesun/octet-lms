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
app.use(cors());

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

app.use("/api/content/pdf",  pdfRouter);
app.use("/api/content/video", videoRouter);
app.use("/api/subjects",      subjectRouter);
app.use("/api/chapters",      chapterRouter);
//app.use("/api/subtopics",     subtopicRouter); DEPRECATED USE OF SUBTOPIC ROUTER
app.use("/api/storage",       storageRouter);

//For indexed file search 
app.use("/api/search", require("./routes/search.routes"));

//For analytics related routes!!!
app.use("/api/analytics", analyticsRouter );

//Students Management 
app.use("/api/students", studentRouter);
 
// For Attendance related Ops:
app.use("/api/attendance", attendanceRouter);
 

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
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});