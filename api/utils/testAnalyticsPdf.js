/**
 * utils/testAnalyticsPdf.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Downloadable PDF for the admin's test analytics report — same table/chart
 * primitives (drawTable, drawStatisticsChart, pctColor) as every other
 * report PDF in the app, so it looks and reads the same way.
 * ─────────────────────────────────────────────────────────────────────────────
 */

const { drawTable, drawStatisticsChart, pctColor } = require("./attendanceReportFormat");

function buildTestAnalyticsPdf(doc, analytics) {
  const { test, summary, scoreDistribution, perQuestion, batchWise, perStudent } = analytics;

  doc.font("Helvetica-Bold").fontSize(20).fillColor("#1f2937").text("Test Analytics Report");
  doc.fillColor("black");
  doc.font("Helvetica-Bold").fontSize(13).text(test.title);
  doc.font("Helvetica").fontSize(10).fillColor("#4b5563");
  const metaParts = [
    test.chapterName ? `Chapter: ${test.chapterName}` : (test.subjectName ? `Subject: ${test.subjectName}` : null),
    `Batch: ${test.batchName || "-"}`,
    `Type: ${test.type === "mcq" ? "MCQ" : "Descriptive"}`,
    `Max marks: ${test.maxMarks}`,
  ].filter(Boolean);
  doc.text(metaParts.join("   |   "));
  doc.text(`Window: ${new Date(test.scheduledStart).toLocaleString("en-IN")} - ${new Date(test.scheduledEnd).toLocaleString("en-IN")}`);
  doc.fillColor("black");
  doc.moveDown(1);

  doc.font("Helvetica-Bold").fontSize(12).text("Summary");
  doc.font("Helvetica").fontSize(10);
  doc.text(`Targeted students: ${summary.totalTargeted}`);
  doc.text(`Attempted: ${summary.attemptedCount}    Not attempted: ${summary.notAttemptedCount}`);
  doc.text(`Evaluated: ${summary.evaluatedCount}    Pending evaluation: ${summary.pendingEvaluationCount}`);
  if (summary.avgMarks !== null) {
    doc.fillColor(pctColor(summary.avgPct)).text(`Average score: ${summary.avgMarks} / ${summary.maxMarks} (${summary.avgPct}%)`).fillColor("black");
  }
  if (summary.highest !== null) doc.text(`Highest: ${summary.highest}    Lowest: ${summary.lowest}`);
  doc.text(`Pass mark: ${summary.passPct}%    Passed: ${summary.passCount}    Failed: ${summary.failCount}`);
  doc.moveDown(0.8);

  drawStatisticsChart(doc, {
    type: "bar",
    barData: scoreDistribution,
    pieData: scoreDistribution,
    lineData: scoreDistribution,
    description: "Score distribution across the class.",
    axisLabels: { x: "Score band", y: "Number of students" },
  });

  if (perQuestion.length > 0) {
    doc.font("Helvetica-Bold").fontSize(12).text("Per-question correctness");
    doc.moveDown(0.2);
    drawTable(doc, {
      headers: ["Question", "Marks", "Correct", "Incorrect", "Unanswered", "Correct %"],
      rows: perQuestion.map((q) => [q.label, q.marks, q.correctCount, q.incorrectCount, q.unansweredCount, `${q.correctPct}%`]),
      colWidths: [220, 55, 60, 65, 80, 70],
    });
    doc.moveDown(1);
  }

  if (batchWise.length > 1) {
    doc.font("Helvetica-Bold").fontSize(12).text("Batch-wise breakdown");
    doc.moveDown(0.2);
    drawTable(doc, {
      headers: ["Batch", "Targeted", "Evaluated", "Avg marks", "Avg %"],
      rows: batchWise.map((b) => [b.batchName, b.targetedCount, b.evaluatedCount, b.avgMarks ?? "-", b.avgPct !== null ? `${b.avgPct}%` : "-"]),
      colWidths: [220, 80, 80, 80, 70],
    });
    doc.moveDown(1);
  }

  doc.addPage();
  doc.font("Helvetica-Bold").fontSize(12).text("Per-student results");
  doc.moveDown(0.2);
  drawTable(doc, {
    headers: ["Student", "Roll No", "Batch", "Status", "Marks", "%", "Result"],
    rows: perStudent.map((s) => [
      s.name,
      s.admissionNumber || "-",
      s.batchName || "-",
      s.status === "evaluated" ? "Evaluated" : s.status === "not_started" ? "Not attempted" : "Awaiting evaluation",
      s.marksAwarded !== null ? `${s.marksAwarded} / ${s.maxMarks}` : "-",
      s.pct !== null ? `${s.pct}%` : "-",
      s.pass === null ? "-" : s.pass ? "Pass" : "Fail",
    ]),
    colWidths: [130, 65, 90, 100, 70, 45, 50],
  });
}

function buildOverallAnalyticsPdf(doc, analytics) {
  const { summary, scoreDistribution, perTest, batchWise, perStudent } = analytics;

  doc.font("Helvetica-Bold").fontSize(20).fillColor("#1f2937").text("All Tests — Analytics Report");
  doc.fillColor("black");
  doc.font("Helvetica").fontSize(10).fillColor("#4b5563");
  doc.text(`Generated ${new Date().toLocaleString("en-IN")}`);
  doc.fillColor("black");
  doc.moveDown(1);

  doc.font("Helvetica-Bold").fontSize(12).text("Summary");
  doc.font("Helvetica").fontSize(10);
  doc.text(`Total tests: ${summary.totalTests} (${summary.mcqCount} MCQ, ${summary.descriptiveCount} Descriptive)`);
  doc.text(`Total attempts: ${summary.totalAttempts}    Evaluated: ${summary.evaluatedCount}    Pending evaluation: ${summary.pendingEvaluationCount}`);
  if (summary.avgPct !== null) {
    doc.fillColor(pctColor(summary.avgPct)).text(`Overall average: ${summary.avgPct}%`).fillColor("black");
  }
  doc.text(`Pass mark: ${summary.passPct}%    Passed: ${summary.passCount}    Failed: ${summary.failCount}`);
  doc.moveDown(0.8);

  drawStatisticsChart(doc, {
    type: "bar",
    barData: scoreDistribution,
    pieData: scoreDistribution,
    lineData: scoreDistribution,
    description: "Score distribution across every evaluated attempt, every test.",
    axisLabels: { x: "Score band", y: "Number of attempts" },
  });

  doc.font("Helvetica-Bold").fontSize(12).text("Per-test summary");
  doc.moveDown(0.2);
  drawTable(doc, {
    headers: ["Test", "Type", "Batch", "Attempted", "Evaluated", "Avg %", "Pass/Fail"],
    rows: perTest.map((t) => [
      t.title,
      t.type === "mcq" ? "MCQ" : "Descriptive",
      t.batchName || "-",
      t.attemptedCount,
      t.evaluatedCount,
      t.avgPct !== null ? `${t.avgPct}%` : "-",
      `${t.passCount}/${t.failCount}`,
    ]),
    colWidths: [155, 65, 90, 65, 65, 55, 65],
  });
  doc.moveDown(1);

  if (batchWise.length > 0) {
    doc.font("Helvetica-Bold").fontSize(12).text("Batch-wise average (across every test)");
    doc.moveDown(0.2);
    drawTable(doc, {
      headers: ["Batch", "Evaluated attempts", "Avg %"],
      rows: batchWise.map((b) => [b.batchName, b.evaluatedCount, `${b.avgPct}%`]),
      colWidths: [220, 130, 70],
    });
    doc.moveDown(1);
  }

  if (perStudent.length > 0) {
    doc.addPage();
    doc.font("Helvetica-Bold").fontSize(12).text("Per-student average (across every test taken)");
    doc.moveDown(0.2);
    drawTable(doc, {
      headers: ["Student", "Tests evaluated", "Avg %"],
      rows: perStudent.map((s) => [s.name, s.testsEvaluated, `${s.avgPct}%`]),
      colWidths: [220, 130, 70],
    });
  }
}

module.exports = { buildTestAnalyticsPdf, buildOverallAnalyticsPdf };
