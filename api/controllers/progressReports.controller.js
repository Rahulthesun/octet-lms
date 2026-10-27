/**
 * controllers/progressReports.controller.js
 * ─────────────────────────────────────────────────────────────
 * OCTET Annual Progress Report — thin wrapper around
 * services/progressReports.service.js + utils/progressReportPdf.js.
 * ─────────────────────────────────────────────────────────────
 */

const PDFDocument = require("pdfkit");
const svc = require("../services/progressReports.service");
const { buildStudentProgressReportPdf } = require("../utils/progressReportPdf");

const downloadStudentProgressReportPdf = async (req, res) => {
  try {
    const year = req.query.year || new Date().getFullYear();
    const report = await svc.getStudentProgressReport(req.params.studentId, year);
    const who = (report.student.roll || report.student.name || report.student.id).toString().replace(/[^a-zA-Z0-9_-]/g, "_");
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="progress_report_${who}_${report.year}.pdf"`);

    const doc = new PDFDocument({
      margin: 40,
      size: "A4",
      bufferPages: true,
      info: {
        Title: `OCTET Annual Progress Report ${report.year} — ${report.student.name}`,
        Author: "Chemistry@OCTET",
        Copyright: "© Chemistry@OCTET. All rights reserved.",
      },
    });
    doc.pipe(res);
    buildStudentProgressReportPdf(doc, report);
    doc.end();
  } catch (err) {
    console.error(`[progress-reports] ${err.status || 500} — ${err.message}`);
    res.status(err.status || 500).json({ error: err.message });
  }
};

module.exports = { downloadStudentProgressReportPdf };
