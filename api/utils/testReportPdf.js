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

// 0-34 -> red, 35-79 -> orange, 80-100 -> green. Mirrors scoreBandColor() in
// web/components/admin/TestReportsTab.tsx so the on-screen chart and the
// downloaded PDF's chart use the exact same score-band colors.
const SCORE_BAND_COLORS = {
  low: "#d03b3b",
  mid: "#fab219",
  high: "#0ca30c",
};

function scoreBandColor(pct) {
  if (pct < 35) return SCORE_BAND_COLORS.low;
  if (pct < 80) return SCORE_BAND_COLORS.mid;
  return SCORE_BAND_COLORS.high;
}

function monthLabel(month) {
  const [y, m] = month.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString("en-IN", { month: "long", year: "numeric" });
}

/** Writes a single student's monthly test report onto an open PDFDocument. */
function buildStudentTestReportPdf(doc, report) {
  const { student, month, points, absentDates } = report;

  doc.font("Helvetica-Bold").fontSize(18).text("Student Test Report");
  doc.moveDown(0.5);

  doc.font("Helvetica").fontSize(11);
  doc.text(`Name: ${student.name}`);
  doc.text(`Month: ${monthLabel(month)}`);
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
    { label: "0-34%", value: points.filter((p) => (p.maxMarks > 0 ? (p.marksAwarded / p.maxMarks) * 100 : 0) < 35).length, color: SCORE_BAND_COLORS.low },
    { label: "35-79%", value: points.filter((p) => { const pct = p.maxMarks > 0 ? (p.marksAwarded / p.maxMarks) * 100 : 0; return pct >= 35 && pct < 80; }).length, color: SCORE_BAND_COLORS.mid },
    { label: "80-100%", value: points.filter((p) => (p.maxMarks > 0 ? (p.marksAwarded / p.maxMarks) * 100 : 0) >= 80).length, color: SCORE_BAND_COLORS.high },
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
      description: "Score (%) on each test taken this month, colored by score band (red < 35%, orange 35-79%, green 80-100%).",
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

module.exports = { buildStudentTestReportPdf, scoreBandColor };
