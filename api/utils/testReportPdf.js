/**
 * utils/testReportPdf.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Builds the downloadable PDF for a student's consolidated monthly test
 * report (the admin's Test Reports → per-student modal). Mirrors
 * attendanceReportFormat.js's buildStudentReportPdf: same drawStatisticsChart/
 * drawTable primitives, same overall document shape, so every report PDF in
 * the app looks and reads consistently.
 * ─────────────────────────────────────────────────────────────────────────────
 */

const { drawStatisticsChart, drawTable } = require("./attendanceReportFormat");
const { drawOctetEmblem } = require("./octetEmblem");

// 0-39 -> red, 40-74 -> amber, 75-100 -> emerald. Same cut-offs and colors as
// scoreBandColor() in web/components/admin/TestReportsTab.tsx so the on-screen
// chart and every downloaded PDF agree on what a score's color means.
const SCORE_BAND_COLORS = {
  low: "#dc2626",
  mid: "#d97706",
  high: "#059669",
};

function scoreBandColor(pct) {
  if (pct < 40) return SCORE_BAND_COLORS.low;
  if (pct < 75) return SCORE_BAND_COLORS.mid;
  return SCORE_BAND_COLORS.high;
}

function monthLabel(month) {
  const [y, m] = month.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString("en-IN", { month: "long", year: "numeric" });
}

/** Writes a single student's monthly test report onto an open PDFDocument. */
function buildStudentTestReportPdf(doc, report) {
  const { student, month, points, absentDates } = report;

  const left = doc.page.margins.left;
  const top = doc.y;
  drawOctetEmblem(doc, left + 24, top + 24, 48);
  doc.font("Helvetica-Bold").fontSize(18).text("Student Test Report", left + 60, top + 6);
  doc.font("Helvetica-Bold").fontSize(14).fillColor("#dc2626").text(student.name, left + 60);
  doc.fillColor("black");
  doc.x = left;
  doc.y = Math.max(doc.y, top + 54);
  doc.moveDown(0.5);

  doc.font("Helvetica-Bold").fontSize(13).text(`Octetians — Tests Performance Graph for the Month of ${monthLabel(month)}`);
  doc.moveDown(0.5);

  const totalTests = points.length;
  const avgPct = totalTests > 0
    ? Math.round(points.reduce((sum, p) => sum + (p.maxMarks > 0 ? (p.marksAwarded / p.maxMarks) * 100 : 0), 0) / totalTests)
    : null;

  doc.font("Helvetica-Bold").fontSize(12).text("Summary");
  doc.font("Helvetica").fontSize(11);
  doc.text(`Tests evaluated: ${totalTests}`);
  doc.text(`Absent/missed: ${absentDates.length}`);
  if (avgPct !== null) {
    doc.fillColor(scoreBandColor(avgPct)).text(`Average score: ${avgPct}%`).fillColor("black");
  } else {
    doc.text("Average score: N/A");
  }
  doc.moveDown(1);

  const scorePoints = points.map((p) => {
    const pct = p.maxMarks > 0 ? Math.round((p.marksAwarded / p.maxMarks) * 100) : 0;
    const label = new Date(p.date).toLocaleDateString("en-IN", { day: "2-digit", month: "short" });
    return { label, value: pct, color: scoreBandColor(pct), tooltipLabel: `${p.testTitle} — ${pct}%`, testTitle: p.testTitle };
  });

  const barData = scorePoints;
  const pieData = [
    { label: "0-39%", value: points.filter((p) => (p.maxMarks > 0 ? (p.marksAwarded / p.maxMarks) * 100 : 0) < 40).length, color: SCORE_BAND_COLORS.low },
    { label: "40-74%", value: points.filter((p) => { const pct = p.maxMarks > 0 ? (p.marksAwarded / p.maxMarks) * 100 : 0; return pct >= 40 && pct < 75; }).length, color: SCORE_BAND_COLORS.mid },
    { label: "75-100%", value: points.filter((p) => (p.maxMarks > 0 ? (p.marksAwarded / p.maxMarks) * 100 : 0) >= 75).length, color: SCORE_BAND_COLORS.high },
  ];
  const lineData = scorePoints;

  if (totalTests > 0) {
    drawStatisticsChart(doc, {
      type: "bar",
      barData,
      pieData,
      lineData,
      valueSuffix: "%",
      color: "#5B21B6",
      description: "Score (%) on each test taken this month, colored by score band (red below 40%, amber 40-74%, green 75-100%).",
      axisLabels: { x: "Date", y: "Score %" },
    });
  } else {
    doc.font("Helvetica-Oblique").fontSize(10).fillColor("#9ca3af").text("No tests evaluated this month.").fillColor("black").font("Helvetica");
  }
  doc.moveDown(0.5);

  doc.font("Helvetica-Bold").fontSize(12).text("Test-wise breakdown");
  doc.moveDown(0.3);

  if (totalTests > 0) {
    drawTable(doc, {
      headers: ["Date", "Test", "Marks", "Percentage"],
      rows: points.map((p) => {
        const pct = p.maxMarks > 0 ? Math.round((p.marksAwarded / p.maxMarks) * 100) : 0;
        return [p.date, p.testTitle, `${p.marksAwarded}/${p.maxMarks}`, `${pct}%`];
      }),
      colWidths: [80, 220, 80, 80],
    });
  }

  if (absentDates.length > 0) {
    doc.moveDown(0.5);
    doc.font("Helvetica-Bold").fontSize(11).text("Absent/missed dates (day of month)");
    doc.font("Helvetica").fontSize(10).text(absentDates.join(", "));
  }
}

module.exports = { buildStudentTestReportPdf, scoreBandColor, SCORE_BAND_COLORS };
