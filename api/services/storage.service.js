/**
 * services/storage.service.js
 * ─────────────────────────────────────────────────────────────
 * Aggregates storage data across PDF and Video collections.
 *
 * In Mongoose you'd use the .aggregate() pipeline for this.
 * Example (Mongoose):
 *
 *   const result = await Pdf.aggregate([
 *     { $group: {
 *         _id: null,
 *         totalBytes: { $sum: "$sizeBytes" },
 *         count:      { $sum: 1 }
 *     }}
 *   ]);
 * ─────────────────────────────────────────────────────────────
 */

// TODO: const Pdf   = require('../models/pdf.model');
// TODO: const Video = require('../models/video.model');

/**
 * getStorageUsage
 * @returns {{ totalBytes, totalPdfs, totalVideos, totalPdfBytes, totalVideoBytes }}
 */
const getStorageUsage = async () => {
  // TODO: run aggregate queries on Pdf and Video collections
  return {
    totalBytes:      0,
    totalPdfs:       0,
    totalVideos:     0,
    totalPdfBytes:   0,
    totalVideoBytes: 0,
  };
};

/**
 * getContentStats
 * @returns {{ bySubject: Array, byUser: Array }}
 */
const getContentStats = async () => {
  // TODO: join Subject → Chapter → Subtopic → (Pdf | Video)
  // group by subject and by uploadedBy user
  return {
    bySubject: [],
    byUser:    [],
  };
};

module.exports = { getStorageUsage, getContentStats };