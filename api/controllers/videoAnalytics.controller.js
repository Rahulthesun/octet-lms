/**
 * controllers/videoAnalytics.controller.js
 * ─────────────────────────────────────────────────────────────
 * Reporting endpoints — session-wise stats, drop-off, and heatmap.
 * Thin wrappers around services/videoAnalytics.service.js.
 * ─────────────────────────────────────────────────────────────
 */

const videoAnalyticsService = require("../services/videoAnalytics.service");

// ─── Student: my own reports ────────────────────────────────────

const getMyWatchedVideos = async (req, res) => {
  try {
    const videos = await videoAnalyticsService.listWatchedVideosForUser(req.user.id);
    res.status(200).json(videos);
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
};

const getMyVideoReport = async (req, res) => {
  try {
    const report = await videoAnalyticsService.getStudentVideoReport(req.params.videoId, req.user.id);
    res.status(200).json(report);
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
};

// ─── Admin: any video / any student / any batch ─────────────────

const getVideoReportAdmin = async (req, res) => {
  try {
    const report = await videoAnalyticsService.getVideoAnalyticsFull(req.params.videoId);
    res.status(200).json(report);
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
};

const getStudentWatchedVideosAdmin = async (req, res) => {
  try {
    const result = await videoAnalyticsService.listWatchedVideosForStudent(req.params.studentId);
    res.status(200).json(result);
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
};

const getStudentVideoReportAdmin = async (req, res) => {
  try {
    const report = await videoAnalyticsService.getStudentVideoReportForAdmin(req.params.videoId, req.params.studentId);
    res.status(200).json(report);
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
};

const getBatchVideoReport = async (req, res) => {
  try {
    const report = await videoAnalyticsService.getBatchVideoReport(req.params.batchId);
    res.status(200).json(report);
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
};

module.exports = {
  getMyWatchedVideos,
  getMyVideoReport,
  getVideoReportAdmin,
  getStudentWatchedVideosAdmin,
  getStudentVideoReportAdmin,
  getBatchVideoReport,
};
