/**
 * utils/progressReportPdf.js
 * ─────────────────────────────────────────────────────────────────────────────
 * OCTET Annual Progress Report — a cover page with a year-at-a-glance table,
 * then one page per month carrying that month's two graphs:
 *   1. Tests Performance Graph (each evaluated test's score, 0-100%, colored
 *      by score band; black bars below the axis = test scheduled, not attempted)
 *   2. Attendance Graph (one bar per session date, same status palette as the
 *      admin attendance report; black = never logged into the online class)
 * Every page carries the OCTET emblem and the copyright notice.
 * ─────────────────────────────────────────────────────────────────────────────
 */

const { CHART_STATUS_COLORS, NEVER_JOINED_COLOR, drawTable } = require("./attendanceReportFormat");
const { scoreBandColor, SCORE_BAND_COLORS } = require("./testReportPdf");
const { drawOctetEmblem, COPYRIGHT_NOTICE } = require("./octetEmblem");

const ACCENT = "#5e4075";
const NAME_RED = "#dc2626";
const ABSENT_MARKER_VALUE = -12;
const FOOTER_HEIGHT = 34;

function monthLabel(month) {
  const [y, m] = month.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString("en-IN", { month: "long", year: "numeric" });
}

function pct(p) {
  return p.maxMarks > 0 ? Math.round((p.marksAwarded / p.maxMarks) * 100) : 0;
}

function drawFooter(doc, bottomMargin) {
  const x = doc.page.margins.left;
  const width = doc.page.width - doc.page.margins.left - doc.page.margins.right;
  const y = doc.page.height - bottomMargin - FOOTER_HEIGHT + 6;
  doc.moveTo(x, y - 4).lineTo(x + width, y - 4).lineWidth(0.5).strokeColor("#d4d4d8").stroke();
  doc.font("Helvetica").fontSize(6.5).fillColor("#71717a")
    .text(COPYRIGHT_NOTICE, x, y, { width, align: "center", lineBreak: true });
  doc.fillColor("black").strokeColor("black").lineWidth(1);
}

/**
 * 0-100% bar chart with a solid Y-axis (0/25/50/75/100 ticks), a bold 0-line,
 * a dashed 100% ceiling, and room below the 0-line for negative "absent"
 * markers. Mirrors the on-screen AttendanceChart bar variant.
 */
function drawPercentBarChart(doc, { x, y, width, height, data, emptyMessage }) {
  const yAxisSpace = 30;
  const labelSpace = 14;
  const hasNegative = data.some((d) => d.value < 0);
  const minValue = hasNegative ? -20 : 0;
  const plotX = x + yAxisSpace;
  const plotW = width - yAxisSpace;
  const plotTop = y + 6;
  const plotBottom = y + height - labelSpace;
  const plotH = plotBottom - plotTop;
  const toY = (v) => plotBottom - ((v - minValue) / (100 - minValue)) * plotH;
  const zeroY = toY(0);

  // Gridlines + Y tick labels
  doc.font("Helvetica").fontSize(7).fillColor("#71717a");
  [0, 25, 50, 75, 100].forEach((t) => {
    const ty = toY(t);
    if (t > 0 && t < 100) {
      doc.moveTo(plotX, ty).lineTo(plotX + plotW, ty).dash(2, { space: 2 }).lineWidth(0.4).strokeColor("#e5e7eb").stroke();
      doc.undash();
    }
    doc.moveTo(plotX - 3, ty).lineTo(plotX, ty).lineWidth(0.8).strokeColor("#18181b").stroke();
    doc.fillColor("#71717a").text(`${t}%`, x, ty - 3.5, { width: yAxisSpace - 5, align: "right", lineBreak: false });
  });

  // Solid Y-axis
  doc.moveTo(plotX, plotTop).lineTo(plotX, plotBottom).lineWidth(1.2).strokeColor("#18181b").stroke();
  // Dashed 100% ceiling
  doc.moveTo(plotX, toY(100)).lineTo(plotX + plotW, toY(100)).dash(3, { space: 3 }).lineWidth(1).strokeColor("#6f4f8e").stroke();
  doc.undash();

  if (data.length === 0) {
    doc.font("Helvetica-Oblique").fontSize(9).fillColor("#a1a1aa")
      .text(emptyMessage, plotX, plotTop + plotH / 2 - 10, { width: plotW, align: "center" });
  } else {
    const slot = plotW / data.length;
    const barW = Math.max(3, Math.min(28, slot * 0.55));
    data.forEach((d, i) => {
      const bx = plotX + i * slot + (slot - barW) / 2;
      const vy = toY(d.value);
      const top = Math.min(vy, zeroY);
      const h = Math.max(1.5, Math.abs(zeroY - vy));
      doc.rect(bx, d.value < 0 ? zeroY : top, barW, h).fill(d.color || ACCENT);
      if (d.value >= 0 && data.length <= 20) {
        doc.font("Helvetica-Bold").fontSize(6.5).fillColor("#3f3f46")
          .text(`${d.value}%`, bx - 8, top - 9, { width: barW + 16, align: "center", lineBreak: false });
      }
      doc.font("Helvetica").fontSize(7).fillColor("#71717a")
        .text(d.label, bx - 8, plotBottom + 3, { width: barW + 16, align: "center", lineBreak: false });
    });
  }

  // Bold 0-line drawn last so bars sit flush on it.
  doc.moveTo(plotX, zeroY).lineTo(plotX + plotW, zeroY).lineWidth(1.8).strokeColor("#000000").stroke();
  doc.fillColor("black").strokeColor("black").lineWidth(1);
}

function drawLegend(doc, x, y, items) {
  let cx = x;
  doc.font("Helvetica").fontSize(7);
  items.forEach(({ color, label }) => {
    doc.rect(cx, y + 1, 6, 6).fill(color);
    doc.fillColor("#52525b").text(label, cx + 9, y, { lineBreak: false });
    cx += 9 + doc.widthOfString(label) + 12;
  });
  doc.fillColor("black");
}

/** Heading row for one graph: small emblem + bold title. Returns the y below it. */
function drawGraphHeading(doc, x, y, title) {
  drawOctetEmblem(doc, x + 13, y + 13, 26);
  doc.font("Helvetica-Bold").fontSize(11.5).fillColor("#18181b")
    .text(title, x + 34, y + 7, { width: doc.page.width - doc.page.margins.right - x - 34, lineBreak: false });
  doc.fillColor("black");
  return y + 32;
}

function drawPageHeader(doc, student, year, subtitle) {
  const x = doc.page.margins.left;
  const width = doc.page.width - doc.page.margins.left - doc.page.margins.right;
  const y = doc.page.margins.top;
  drawOctetEmblem(doc, x + 22, y + 22, 44);
  doc.font("Helvetica-Bold").fontSize(9).fillColor(ACCENT)
    .text(`CHEMISTRY@OCTET  ·  ANNUAL PROGRESS REPORT ${year}`, x + 54, y + 4, { lineBreak: false });
  doc.font("Helvetica-Bold").fontSize(15).fillColor(NAME_RED)
    .text(student.name, x + 54, y + 16, { lineBreak: false });
  doc.font("Helvetica-Bold").fontSize(10).fillColor("#18181b")
    .text(subtitle, x + 54, y + 34, { lineBreak: false });
  doc.moveTo(x, y + 52).lineTo(x + width, y + 52).lineWidth(0.8).strokeColor(ACCENT).stroke();
  doc.fillColor("black").strokeColor("black").lineWidth(1);
  return y + 62;
}

function testChartData(test) {
  const scores = test.points.map((p) => ({ day: p.day, label: String(p.day), value: pct(p), color: scoreBandColor(pct(p)) }));
  const absents = test.absentDates.map((day) => ({ day, label: String(day), value: ABSENT_MARKER_VALUE, color: NEVER_JOINED_COLOR }));
  return [...scores, ...absents].sort((a, b) => a.day - b.day);
}

function attendanceChartData(records) {
  return [...records]
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((r) => {
      const status = r.attendanceStatus || r.status;
      const label = String(Number(r.date.slice(8, 10)));
      if (r.source === "GOOGLE_MEET" && status === "absent" && (r.durationMinutes || 0) <= 0) {
        return { label, value: 100, color: NEVER_JOINED_COLOR };
      }
      const value = r.attendancePct ?? (status === "present" ? 100 : status === "partial" ? 50 : 0);
      return { label, value, color: CHART_STATUS_COLORS[status] || CHART_STATUS_COLORS.absent };
    });
}

function monthSummary(m) {
  const scores = m.test.points.map(pct);
  const present = m.attendance.filter((r) => r.status === "present").length;
  return {
    tests: scores.length,
    avg: scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : null,
    missed: m.test.absentDates.length,
    sessions: m.attendance.length,
    present,
    attendancePct: m.attendance.length ? Math.round((present / m.attendance.length) * 100) : null,
  };
}

function drawCoverPage(doc, report) {
  const { student, year, months } = report;
  const x = doc.page.margins.left;
  const width = doc.page.width - doc.page.margins.left - doc.page.margins.right;

  drawOctetEmblem(doc, doc.page.width / 2, doc.page.margins.top + 70, 140);
  doc.y = doc.page.margins.top + 155;
  doc.font("Helvetica-Bold").fontSize(22).fillColor(ACCENT).text("ANNUAL PROGRESS REPORT", x, doc.y, { width, align: "center" });
  doc.font("Helvetica-Bold").fontSize(13).fillColor("#18181b").text(`Octetians · January – December ${year}`, { width, align: "center" });
  doc.moveDown(0.8);
  doc.font("Helvetica-Bold").fontSize(20).fillColor(NAME_RED).text(student.name, { width, align: "center" });
  const meta = [
    student.roll ? `Roll No: ${student.roll}` : null,
    student.grade ? `Grade: ${student.grade}` : null,
    student.batch ? `Batch: ${student.batch}` : null,
  ].filter(Boolean);
  if (meta.length) doc.font("Helvetica").fontSize(10).fillColor("#52525b").text(meta.join("   |   "), { width, align: "center" });
  doc.moveDown(0.8);
  doc.font("Helvetica").fontSize(9.5).fillColor("#3f3f46").text(
    "This report brings together two graphs for every month of the year — the student's Tests Performance Graph " +
    "and Attendance Graph — so progress can be followed month by month across all 12 months.",
    { width, align: "center" },
  );
  doc.moveDown(1);

  doc.font("Helvetica-Bold").fontSize(12).fillColor("#18181b").text("Year at a glance", x);
  doc.moveDown(0.3);
  drawTable(doc, {
    headers: ["Month", "Tests", "Avg score", "Missed tests", "Sessions", "Attendance"],
    rows: months.map((m) => {
      const s = monthSummary(m);
      return [
        monthLabel(m.month),
        s.tests,
        s.avg !== null ? `${s.avg}%` : "—",
        s.missed,
        s.sessions,
        s.attendancePct !== null ? `${s.attendancePct}%` : "—",
      ];
    }),
    colWidths: [110, 60, 80, 85, 70, 80],
  });
  doc.fillColor("black");
}

function drawMonthPage(doc, report, m) {
  const x = doc.page.margins.left;
  const width = doc.page.width - doc.page.margins.left - doc.page.margins.right;
  const label = monthLabel(m.month);
  const s = monthSummary(m);
  const chartH = 225;

  let y = drawPageHeader(doc, report.student, report.year, label);

  // 1. Tests Performance Graph
  y = drawGraphHeading(doc, x, y, `Octetians — Tests Performance Graph for the Month of ${label}`);
  drawPercentBarChart(doc, {
    x, y, width, height: chartH,
    data: testChartData(m.test),
    emptyMessage: "No tests evaluated this month.",
  });
  y += chartH + 4;
  doc.font("Helvetica").fontSize(7).fillColor("#71717a").text("X-axis: Date of month    Y-axis: Score %", x, y, { width, align: "center" });
  y += 11;
  drawLegend(doc, x + 30, y, [
    { color: SCORE_BAND_COLORS.high, label: "75–100% strong" },
    { color: SCORE_BAND_COLORS.mid, label: "40–74% average" },
    { color: SCORE_BAND_COLORS.low, label: "below 40% needs work" },
    { color: NEVER_JOINED_COLOR, label: "absent (below axis)" },
  ]);
  y += 12;
  doc.font("Helvetica-Bold").fontSize(8.5).fillColor("#3f3f46").text(
    `Tests evaluated: ${s.tests}    Average: ${s.avg !== null ? s.avg + "%" : "—"}    Missed: ${s.missed}`, x + 30, y,
  );
  y += 22;

  // 2. Attendance Graph
  y = drawGraphHeading(doc, x, y, `Octetians — Attendance Graph for the Month of ${label}`);
  drawPercentBarChart(doc, {
    x, y, width, height: chartH,
    data: attendanceChartData(m.attendance),
    emptyMessage: "No class sessions recorded this month.",
  });
  y += chartH + 4;
  doc.font("Helvetica").fontSize(7).fillColor("#71717a").text("X-axis: Date of month    Y-axis: Attendance %", x, y, { width, align: "center" });
  y += 11;
  drawLegend(doc, x + 30, y, [
    { color: CHART_STATUS_COLORS.present, label: "present" },
    { color: CHART_STATUS_COLORS.partial, label: "partial" },
    { color: CHART_STATUS_COLORS.absent, label: "absent" },
    { color: NEVER_JOINED_COLOR, label: "never logged into online class" },
  ]);
  y += 12;
  doc.font("Helvetica-Bold").fontSize(8.5).fillColor("#3f3f46").text(
    `Sessions: ${s.sessions}    Present: ${s.present}    Attendance: ${s.attendancePct !== null ? s.attendancePct + "%" : "—"}`, x + 30, y,
  );
  doc.fillColor("black");
}

/**
 * Writes the full 12-month progress report onto an open PDFDocument, which
 * must be created with `bufferPages: true` (the footer pass revisits pages).
 *
 * @param {import('pdfkit')} doc
 * @param {{
 *   student: { id: string, name: string, roll: string|null, grade: string|null, batch: string|null },
 *   year: number,
 *   months: Array<{ month: string, test: { points: any[], absentDates: number[] }, attendance: any[] }>,
 * }} report
 */
function buildStudentProgressReportPdf(doc, report) {
  drawCoverPage(doc, report);
  report.months.forEach((m) => {
    doc.addPage();
    drawMonthPage(doc, report, m);
  });

  // Footer on every page. Bottom margin is zeroed while drawing so writing
  // inside the margin area never triggers pdfkit's automatic page break.
  const range = doc.bufferedPageRange();
  for (let i = range.start; i < range.start + range.count; i++) {
    doc.switchToPage(i);
    const bottom = doc.page.margins.bottom;
    doc.page.margins.bottom = 0;
    drawFooter(doc, bottom);
    doc.page.margins.bottom = bottom;
  }
}

module.exports = { buildStudentProgressReportPdf };
