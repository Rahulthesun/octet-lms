/**
 * controllers/storage.controller.js
 * ─────────────────────────────────────────────────────────────
 * Read-only analytics endpoints. No POST/PUT/DELETE here –
 * these just aggregate data that already exists.
 * ─────────────────────────────────────────────────────────────
 */

const storageService = require("../services/storage.service");

/**
 * GET /api/storage/usage
 *
 * Returns high-level totals:
 *  {
 *    totalBytes: 10737418240,
 *    totalPdfs: 142,
 *    totalVideos: 37,
 *    totalPdfBytes: 2147483648,
 *    totalVideoBytes: 8589934592
 *  }
 */
const getStorageUsage = async (req, res) => {
  try {
    const usage = await storageService.getStorageUsage();
    res.status(200).json(usage);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/**
 * GET /api/storage/content-stats
 *
 * Returns a richer breakdown:
 *  {
 *    bySubject: [ { subjectId, name, pdfCount, videoCount, bytes } ],
 *    byUser:    [ { userId, uploadCount, bytes } ]
 *  }
 */
const getContentStats = async (req, res) => {
  try {
    const stats = await storageService.getContentStats();
    res.status(200).json(stats);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

module.exports = { getStorageUsage, getContentStats };