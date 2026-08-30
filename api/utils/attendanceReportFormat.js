/**
 * utils/attendanceReportFormat.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Turns the plain-object reports returned by attendance.service.js into
 * downloadable CSV strings and PDF documents (via pdfkit).
 * No Supabase / Express knowledge here — pure formatting.
 * ─────────────────────────────────────────────────────────────────────────────
 */

// ─── CSV ─────────────────────────────────────────────────────────────────────

function csvEscape(value) {
  if (value === null || value === undefined) return "";
  const str = String(value);
  if (/[",\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function toCsvRow(cells) {
  return cells.map(csvEscape).join(",");
}

/** CSV for a single student's full attendance report. */
function buildStudentReportCsv(report) {
  const lines = [];
  lines.push(toCsvRow(["Student Attendance Report"]));
  lines.push(toCsvRow(["Name", report.student.name]));
  lines.push(toCsvRow(["Roll No", report.student.roll || ""]));
  lines.push(toCsvRow(["Grade", report.student.grade || ""]));
  lines.push(toCsvRow(["Registered Batch", report.student.batch || ""]));
  lines.push("");
  lines.push(toCsvRow(["Total Sessions", report.totalSessions]));
  lines.push(toCsvRow(["Present", report.presentCount]));
  lines.push(toCsvRow(["Absent", report.absentCount]));
  lines.push(toCsvRow(["Attendance %", report.attendancePct !== null ? `${report.attendancePct}%` : "N/A"]));
  lines.push("");
  lines.push(toCsvRow(["Date", "Batch", "Type", "Status", "Time"]));
  report.records.forEach((r) => {
    lines.push(toCsvRow([r.date, r.batchName || "", r.deliveryType || "", r.status, r.time || ""]));
  });
  // Leading BOM so Excel opens UTF-8 CSVs correctly.
  return "﻿" + lines.join("\r\n");
}

/** CSV for a batch's full statistics report (per-student + day-by-day). */
function buildBatchReportCsv(report) {
  const lines = [];
  lines.push(toCsvRow(["Batch Attendance Report"]));
  lines.push(toCsvRow(["Batch", report.batch.name]));
  lines.push(toCsvRow(["Mode", report.batch.mode || ""]));
  lines.push(toCsvRow(["Total Students", report.totalStudents]));
  lines.push(toCsvRow(["Total Sessions", report.totalSessions]));
  lines.push("");
  lines.push(toCsvRow(["Per-student summary"]));
  lines.push(toCsvRow(["Student Name", "Roll No", "Present", "Absent", "Total Sessions", "Attendance %"]));
  report.studentStats.forEach((s) => {
    lines.push(toCsvRow([
      s.name, s.roll || "", s.presentCount, s.absentCount, s.totalSessions,
      s.attendancePct !== null ? `${s.attendancePct}%` : "N/A",
    ]));
  });
  lines.push("");
  lines.push(toCsvRow(["Day-by-day breakdown"]));
  lines.push(toCsvRow(["Date", "Present", "Absent", "Total Students", "Attendance %"]));
  report.dailyBreakdown.forEach((d) => {
    lines.push(toCsvRow([
      d.date, d.presentCount, d.absentCount, d.totalStudents,
      d.attendancePct !== null ? `${d.attendancePct}%` : "N/A",
    ]));
  });
  return "﻿" + lines.join("\r\n");
}

// ─── Statistics graph (mirrors web/components/shared/AttendanceChart.tsx) ────
// The chart the admin/student picks on screen ("Bar" / "Pie" / "Line") is
// passed through as ?chartType= on the PDF download, and redrawn here with
// pdfkit's vector primitives using the exact same fixed status palette and
// the exact same trend math — so the printed chart always matches what was
// on screen when "Download PDF" was clicked.

const CHART_TYPES = ["bar", "pie", "line"];

// Fixed status palette — never themed. Matches ATTENDANCE_STATUS_COLORS in
// web/components/shared/AttendanceChart.tsx.
const CHART_STATUS_COLORS = { present: "#0ca30c", partial: "#fab219", absent: "#d03b3b" };

/** Same threshold coloring as pctColor() in AttendanceReportsTab.tsx. */
function pctColor(pct) {
  if (pct === null || pct === undefined) return "#9CA3AF";
  if (pct < 75) return "#DC2626";
  if (pct < 90) return "#D97706";
  return "#16A34A";
}

/** Validates a user-supplied chart type query param, defaulting to "bar". */
function normalizeChartType(value) {
  return CHART_TYPES.includes(value) ? value : "bar";
}

/**
 * Buckets attendance records into fixed Present/Partial/Absent totals.
 * Mirrors buildAttendanceCategoryData() in AttendanceChart.tsx exactly.
 */
function buildCategoryChartData(records) {
  let present = 0, partial = 0, absent = 0;
  records.forEach((r) => {
    const s = r.attendanceStatus || r.status;
    if (s === "present") present += 1;
    else if (s === "partial") partial += 1;
    else absent += 1;
  });
  return [
    { label: "Present", value: present, color: CHART_STATUS_COLORS.present },
    { label: "Partial", value: partial, color: CHART_STATUS_COLORS.partial },
    { label: "Absent", value: absent, color: CHART_STATUS_COLORS.absent },
  ];
}

/**
 * Running attendance-% trend across a chronological (oldest-first) list.
 * Mirrors buildAttendanceTrend() in AttendanceChart.tsx exactly — same
 * cumulative math, same rounding — so the line always agrees with the UI.
 */
function buildTrendChartData(recordsOldestFirst) {
  let cumulativePresent = 0;
  return recordsOldestFirst.map((r, i) => {
    if (r.present) cumulativePresent += 1;
    return { label: `#${i + 1}`, value: Math.round((cumulativePresent / (i + 1)) * 100) };
  });
}

function ensureSpace(doc, needed) {
  const bottomLimit = doc.page.height - doc.page.margins.bottom;
  if (doc.y + needed > bottomLimit) {
    doc.addPage();
  }
}

/** Small colored-square + label legend, wraps onto multiple lines if needed. */
function drawLegend(doc, x, y, width, items) {
  let cx = x;
  let cy = y;
  const swatch = 8;
  doc.fontSize(8).font("Helvetica");
  items.forEach((item) => {
    const labelWidth = doc.widthOfString(item.label);
    const entryWidth = swatch + 5 + labelWidth + 14;
    if (cx + entryWidth > x + width) {
      cx = x;
      cy += 14;
    }
    doc.rect(cx, cy + 1, swatch, swatch).fill(item.color);
    doc.fillColor("#3f3f46").text(item.label, cx + swatch + 5, cy, { lineBreak: false });
    cx += entryWidth;
  });
  doc.fillColor("black");
  return cy + 14;
}

function drawBarChartVertical(doc, { x, y, width, height, data, valueSuffix }) {
  const maxValue = Math.max(1, ...data.map((d) => d.value));
  const axisSpace = 16;
  const labelSpace = 14;
  const plotHeight = height - axisSpace - labelSpace;
  const baseline = y + plotHeight + axisSpace;
  const slot = width / data.length;
  const barWidth = Math.min(56, slot * 0.5);

  doc.moveTo(x, baseline).lineTo(x + width, baseline).strokeColor("#e4e4e7").lineWidth(1).stroke();

  data.forEach((d, i) => {
    const barHeight = (d.value / maxValue) * plotHeight;
    const barX = x + i * slot + (slot - barWidth) / 2;
    const barY = baseline - barHeight;
    doc.rect(barX, barY, barWidth, Math.max(barHeight, 0)).fill(d.color || "#6b7280");
    doc.fontSize(8).fillColor("#3f3f46").font("Helvetica-Bold")
      .text(`${d.value}${valueSuffix || ""}`, barX - 8, barY - 12, { width: barWidth + 16, align: "center" });
    doc.fontSize(8).fillColor("#71717a").font("Helvetica")
      .text(d.label, barX - 12, baseline + 4, { width: barWidth + 24, align: "center", ellipsis: true });
  });
  doc.fillColor("black");
}

/** Horizontal ranked bars — paginated, for long lists (e.g. per-student %). */
function drawBarChartHorizontal(doc, { x, width, data, valueSuffix }) {
  const rowHeight = 16;
  const labelWidth = 130;
  const barAreaWidth = width - labelWidth - 36;
  const maxValue = Math.max(1, ...data.map((d) => d.value));
  const bottomLimit = doc.page.height - doc.page.margins.bottom;

  data.forEach((d) => {
    if (doc.y + rowHeight > bottomLimit) doc.addPage();
    const rowY = doc.y;
    doc.fontSize(8).fillColor("#3f3f46").font("Helvetica")
      .text(d.label, x, rowY + 3, { width: labelWidth - 6, ellipsis: true });
    const barW = Math.max(2, (d.value / maxValue) * barAreaWidth);
    doc.rect(x + labelWidth, rowY + 2, barW, rowHeight - 6).fill(d.color || "#6b7280");
    doc.fontSize(8).fillColor("#3f3f46").font("Helvetica-Bold")
      .text(`${d.value}${valueSuffix || ""}`, x + labelWidth + barAreaWidth + 4, rowY + 3);
    doc.y = rowY + rowHeight;
  });
  doc.fillColor("black");
}

function drawPieChart(doc, { x, y, width, height, data, valueSuffix }) {
  const total = data.reduce((a, d) => a + d.value, 0);
  const cx = x + Math.min(width, height) / 2.4;
  const cy = y + height / 2;
  const r = Math.min(width / 2.6, height / 2) - 4;

  if (total <= 0) {
    doc.fontSize(9).fillColor("#a1a1aa").text("No data", x, y + height / 2 - 6, { width, align: "center" });
    doc.fillColor("black");
    return;
  }

  let angle = -Math.PI / 2; // start at 12 o'clock
  data.filter((d) => d.value > 0).forEach((d) => {
    const slice = (d.value / total) * Math.PI * 2;
    const end = angle + slice;
    doc.moveTo(cx, cy)
      .lineTo(cx + r * Math.cos(angle), cy + r * Math.sin(angle))
      .arc(cx, cy, r, angle, end)
      .lineTo(cx, cy)
      .closePath()
      .fillColor(d.color || "#6b7280")
      .fill();
    angle = end;
  });
  doc.fillColor("black");

  const legendItems = data.map((d) => ({
    color: d.color || "#6b7280",
    label: `${d.label} — ${d.value}${valueSuffix || ""} (${total > 0 ? Math.round((d.value / total) * 100) : 0}%)`,
  }));
  drawLegend(doc, x + r * 2 + 24, y + height / 2 - legendItems.length * 8, width - (r * 2 + 24), legendItems);
}

function drawLineChart(doc, { x, y, width, height, data, valueSuffix, color }) {
  const axisSpace = 16;
  const labelSpace = 12;
  const plotHeight = height - axisSpace - labelSpace;
  const baseline = y + plotHeight + axisSpace;
  const maxValue = 100; // percentage scale, fixed 0-100 to match the on-screen chart

  doc.moveTo(x, baseline).lineTo(x + width, baseline).strokeColor("#e4e4e7").lineWidth(1).stroke();

  if (data.length < 2) {
    doc.fontSize(9).fillColor("#a1a1aa").text("Not enough data yet", x, y + plotHeight / 2, { width, align: "center" });
    doc.fillColor("black");
    return;
  }

  const stepX = width / (data.length - 1);
  const points = data.map((d, i) => ({
    px: x + i * stepX,
    py: baseline - (Math.min(d.value, maxValue) / maxValue) * plotHeight,
  }));

  doc.moveTo(points[0].px, points[0].py);
  points.slice(1).forEach((p) => doc.lineTo(p.px, p.py));
  doc.strokeColor(color || "#5B21B6").lineWidth(2).stroke();

  points.forEach((p) => {
    doc.circle(p.px, p.py, 2).fill(color || "#5B21B6");
  });

  // Label only a handful of x-axis ticks so long series never overlap.
  const maxLabels = Math.min(data.length, 6);
  const labelStep = Math.max(1, Math.round((data.length - 1) / Math.max(1, maxLabels - 1)));
  doc.fontSize(7).fillColor("#71717a").font("Helvetica");
  data.forEach((d, i) => {
    if (i % labelStep !== 0 && i !== data.length - 1) return;
    doc.text(d.label, points[i].px - 16, baseline + 4, { width: 32, align: "center", ellipsis: true });
  });
  doc.fillColor("black");
}

/**
 * Draws a "Statistics" chart section at the document's current y, advancing
 * doc.y past it. `type` is already normalized via normalizeChartType().
 *
 * `description` is one plain-language sentence saying what this chart
 * depicts, and `axisLabels` names exactly what the X and Y axes represent
 * (pie has neither, since it has no axes) — both printed directly under the
 * "Statistics" heading, mirroring the on-screen chart's caption/axis titles
 * (web/components/shared/AttendanceChart.tsx) so the PDF explains itself
 * exactly as clearly as the UI does.
 */
function drawStatisticsChart(doc, { type, barData, pieData, lineData, valueSuffix = "", color, horizontal = false, description, axisLabels }) {
  const width = doc.page.width - doc.page.margins.left - doc.page.margins.right;
  const x = doc.page.margins.left;

  ensureSpace(doc, 40);
  doc.font("Helvetica-Bold").fontSize(12).text("Statistics");
  doc.moveDown(0.15);
  if (description) {
    doc.font("Helvetica").fontSize(9).fillColor("#52525b").text(description, { width });
    doc.fillColor("black");
  }
  if (axisLabels) {
    doc.font("Helvetica-Oblique").fontSize(8).fillColor("#71717a")
      .text(`X-axis: ${axisLabels.x}    Y-axis: ${axisLabels.y}`, { width });
    doc.fillColor("black");
  }
  doc.moveDown(0.3);

  if (type === "bar" && horizontal) {
    drawBarChartHorizontal(doc, { x, width, data: barData, valueSuffix });
    doc.moveDown(0.8);
    // The chart draws text at explicit x positions, which otherwise leaves
    // pdfkit's text cursor wherever the last label happened to end — reset
    // it so the next flowing doc.text(...) call starts at the left margin.
    doc.x = x;
    return;
  }

  const height = 170;
  ensureSpace(doc, height + 20);
  const y = doc.y;

  if (type === "pie") {
    drawPieChart(doc, { x, y, width, height, data: pieData, valueSuffix });
  } else if (type === "line") {
    drawLineChart(doc, { x, y, width, height, data: lineData, valueSuffix, color });
  } else {
    drawBarChartVertical(doc, { x, y, width, height, data: barData, valueSuffix });
  }

  doc.y = y + height + 14;
  // Same cursor reset as above — every chart branch positions text at
  // explicit x coordinates.
  doc.x = x;
}

/** Draws a simple paginated table starting at the document's current y. */
function drawTable(doc, { headers, rows, colWidths, startX = doc.page.margins.left }) {
  const rowHeight = 20;
  const bottomLimit = doc.page.height - doc.page.margins.bottom;

  function drawRow(y, cells, bold) {
    let x = startX;
    cells.forEach((cell, i) => {
      doc.font(bold ? "Helvetica-Bold" : "Helvetica")
        .fontSize(9)
        .text(String(cell ?? ""), x, y, { width: colWidths[i] - 6, ellipsis: true });
      x += colWidths[i];
    });
  }

  let y = doc.y;
  drawRow(y, headers, true);
  y += rowHeight;
  doc.moveTo(startX, y - 4)
    .lineTo(startX + colWidths.reduce((a, b) => a + b, 0), y - 4)
    .strokeColor("#cccccc").stroke();

  rows.forEach((row) => {
    if (y + rowHeight > bottomLimit) {
      doc.addPage();
      y = doc.page.margins.top;
      drawRow(y, headers, true);
      y += rowHeight;
    }
    drawRow(y, row, false);
    y += rowHeight;
  });

  doc.y = y + 10;
}

/** Writes a single student's report onto an open PDFDocument. */
function buildStudentReportPdf(doc, report, chartType = "bar") {
  const type = normalizeChartType(chartType);

  doc.font("Helvetica-Bold").fontSize(18).text("Student Attendance Report");
  doc.moveDown(0.5);

  doc.font("Helvetica").fontSize(11);
  doc.text(`Name: ${report.student.name}`);
  doc.text(`Roll No: ${report.student.roll || "—"}`);
  if (report.student.grade) doc.text(`Grade: ${report.student.grade}`);
  if (report.student.batch) doc.text(`Registered Batch: ${report.student.batch}`);
  doc.moveDown(0.5);

  doc.font("Helvetica-Bold").fontSize(12).text("Summary");
  doc.font("Helvetica").fontSize(11);
  doc.text(`Total Sessions: ${report.totalSessions}`);
  doc.text(`Present: ${report.presentCount}`);
  doc.text(`Absent: ${report.absentCount}`);
  doc.text(`Attendance %: ${report.attendancePct !== null ? report.attendancePct + "%" : "N/A"}`);
  doc.moveDown(1);

  const barData = buildCategoryChartData(report.records);
  const lineData = buildTrendChartData(
    [...report.records].reverse().map((r) => ({ present: r.status === "present" }))
  );
  const studentChartCopy = {
    bar: { description: "How many of this student's sessions fall into each attendance status.", axisLabels: { x: "Attendance status", y: "Number of sessions" } },
    pie: { description: "Share of this student's sessions in each attendance status.", axisLabels: null },
    line: { description: "Running attendance percentage after each session, oldest to most recent.", axisLabels: { x: "Session number", y: "Attendance % so far" } },
  };
  drawStatisticsChart(doc, {
    type,
    barData,
    pieData: barData,
    lineData,
    valueSuffix: type === "line" ? "%" : "",
    color: "#5B21B6",
    description: studentChartCopy[type].description,
    axisLabels: studentChartCopy[type].axisLabels,
  });
  doc.moveDown(0.5);

  doc.font("Helvetica-Bold").fontSize(12).text("Session History");
  doc.moveDown(0.3);

  drawTable(doc, {
    headers: ["Date", "Batch", "Type", "Status", "Time"],
    rows: report.records.map((r) => [r.date, r.batchName || "—", r.deliveryType || "—", r.status, r.time || "—"]),
    colWidths: [80, 140, 70, 70, 70],
  });
}

/** Writes a batch's statistics report onto an open PDFDocument. */
function buildBatchReportPdf(doc, report, chartType = "bar") {
  const type = normalizeChartType(chartType);

  doc.font("Helvetica-Bold").fontSize(18).text("Batch Attendance Report");
  doc.moveDown(0.5);

  doc.font("Helvetica").fontSize(11);
  doc.text(`Batch: ${report.batch.name}`);
  if (report.batch.mode) doc.text(`Mode: ${report.batch.mode}`);
  doc.text(`Total Students: ${report.totalStudents}`);
  doc.text(`Total Sessions: ${report.totalSessions}`);
  doc.moveDown(1);

  const barData = [...report.studentStats]
    .sort((a, b) => (b.attendancePct ?? -1) - (a.attendancePct ?? -1))
    .map((s) => ({ label: s.name, value: s.attendancePct ?? 0, color: pctColor(s.attendancePct) }));

  const dailyTotals = report.dailyBreakdown.reduce(
    (acc, d) => {
      acc.present += d.presentCount;
      acc.partial += d.partialCount;
      acc.absent += d.absentCount;
      return acc;
    },
    { present: 0, partial: 0, absent: 0 }
  );
  const pieData = [
    { label: "Present", value: dailyTotals.present, color: CHART_STATUS_COLORS.present },
    { label: "Partial", value: dailyTotals.partial, color: CHART_STATUS_COLORS.partial },
    { label: "Absent", value: dailyTotals.absent, color: CHART_STATUS_COLORS.absent },
  ];

  const lineData = report.dailyBreakdown.map((d) => ({
    label: new Date(d.date).toLocaleDateString("en-IN", { day: "2-digit", month: "short" }),
    value: d.attendancePct ?? 0,
  }));

  const batchChartCopy = {
    bar: { description: "Each enrolled student's overall attendance percentage, ranked highest to lowest.", axisLabels: { x: "Attendance %", y: "Student" } },
    pie: { description: "Total Present / Partial / Absent count added up across every session this batch has held.", axisLabels: null },
    line: { description: "The batch's average attendance percentage on each day a session was held, in order.", axisLabels: { x: "Session date", y: "Batch attendance %" } },
  };
  drawStatisticsChart(doc, {
    type,
    barData,
    pieData,
    lineData,
    valueSuffix: type === "pie" ? "" : "%",
    color: "#5B21B6",
    horizontal: type === "bar",
    description: batchChartCopy[type].description,
    axisLabels: batchChartCopy[type].axisLabels,
  });
  doc.moveDown(0.5);

  doc.font("Helvetica-Bold").fontSize(12).text("Per-student summary");
  doc.moveDown(0.3);
  drawTable(doc, {
    headers: ["Student", "Roll", "Present", "Absent", "Total", "%"],
    rows: report.studentStats.map((s) => [
      s.name, s.roll || "—", s.presentCount, s.absentCount, s.totalSessions,
      s.attendancePct !== null ? s.attendancePct + "%" : "N/A",
    ]),
    colWidths: [150, 90, 60, 60, 60, 50],
  });

  doc.addPage();
  doc.font("Helvetica-Bold").fontSize(12).text("Day-by-day breakdown");
  doc.moveDown(0.3);
  drawTable(doc, {
    headers: ["Date", "Present", "Absent", "Total Students", "%"],
    rows: report.dailyBreakdown.map((d) => [
      d.date, d.presentCount, d.absentCount, d.totalStudents,
      d.attendancePct !== null ? d.attendancePct + "%" : "N/A",
    ]),
    colWidths: [100, 80, 80, 110, 60],
  });
}

module.exports = {
  buildStudentReportCsv,
  buildBatchReportCsv,
  buildStudentReportPdf,
  buildBatchReportPdf,
  normalizeChartType,
  // Exported for reuse by other PDF builders (e.g. parentReportPdf.js) that
  // want the exact same chart look/colors/math as the reports above.
  drawStatisticsChart,
  drawTable,
  buildCategoryChartData,
  buildTrendChartData,
  CHART_STATUS_COLORS,
  pctColor,
};
