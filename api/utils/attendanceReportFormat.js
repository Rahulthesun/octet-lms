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

// ─── PDF (pdfkit) ──────────────────────────────────────────────────────────

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
function buildStudentReportPdf(doc, report) {
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

  doc.font("Helvetica-Bold").fontSize(12).text("Session History");
  doc.moveDown(0.3);

  drawTable(doc, {
    headers: ["Date", "Batch", "Type", "Status", "Time"],
    rows: report.records.map((r) => [r.date, r.batchName || "—", r.deliveryType || "—", r.status, r.time || "—"]),
    colWidths: [80, 140, 70, 70, 70],
  });
}

/** Writes a batch's statistics report onto an open PDFDocument. */
function buildBatchReportPdf(doc, report) {
  doc.font("Helvetica-Bold").fontSize(18).text("Batch Attendance Report");
  doc.moveDown(0.5);

  doc.font("Helvetica").fontSize(11);
  doc.text(`Batch: ${report.batch.name}`);
  if (report.batch.mode) doc.text(`Mode: ${report.batch.mode}`);
  doc.text(`Total Students: ${report.totalStudents}`);
  doc.text(`Total Sessions: ${report.totalSessions}`);
  doc.moveDown(1);

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
};
