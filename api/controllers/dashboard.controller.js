/**
 * controllers/dashboard.controller.js
 * ─────────────────────────────────────────────────────────────
 * Thin wrappers around dashboard.service.js — one call per dashboard,
 * both read-only.
 * ─────────────────────────────────────────────────────────────
 */

const dashboardService = require("../services/dashboard.service");

/** GET /api/dashboard/admin — admin/developer only */
const getAdminOverview = async (req, res) => {
  try {
    const overview = await dashboardService.getAdminOverview();
    res.status(200).json(overview);
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
};

/** GET /api/dashboard/me — the logged-in student's own overview */
const getMyOverview = async (req, res) => {
  try {
    const overview = await dashboardService.getStudentOverview(req.user.id);
    res.status(200).json(overview);
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
};

module.exports = { getAdminOverview, getMyOverview };
