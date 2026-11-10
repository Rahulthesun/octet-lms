/**
 * services/testExcel.service.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Excel (.xlsx) exports of test marks, in the institute's marks-register
 * layout:
 *
 *   No. | Student's name | Test-1 Isomerism | Test-2 Werner Theory | …
 *                           100                100
 *
 * - Every score is converted to a mark OUT OF 100 (marks ÷ max × 100,
 *   rounded): 3 out of 5 is written as 60. Each test's original max marks
 *   are listed on the "Tests" sheet.
 * - Each column is headed by the test's name ("Test-1 Isomerism"); a title
 *   that already starts with "Test-<n>" is used as-is.
 * - Monthly register: every active student × every test held that month.
 *   Green at ≥90, "AB" (red) when the test was meant for them, has ended,
 *   and they never attempted it, "Pending" when submitted but not yet
 *   evaluated, and blank when the test wasn't for them (or hasn't ended yet).
 * - Single test: every student the test targeted (plus anyone who attempted it).
 * - Students listed in config/excelExclusions.js are never included.
 *
 * Both the .xlsx download and the in-app "View" (JSON) are produced from the
 * same register model (buildMonthlyRegister / buildTestRegister), so what the
 * admin views is exactly what they would download.
 *
 * Absence uses the same definition as the student monthly report
 * (testAttempts.service.js → getStudentMonthlyReport).
 * ─────────────────────────────────────────────────────────────────────────────
 */

const ExcelJS = require("exceljs");
const supabase = require("../config/supabase");
const audienceService = require("./audience.service");
const { isExcludedFromExcel } = require("../config/excelExclusions");
const { zonedTimeToUtcIso } = require("../utils/timezone");
const { TIMEZONE } = require("../utils/graduation");

const STUDENT_COLUMNS = "id, name, email";
const SCALE = 100;

const COLOR = {
  absent: "FFDC2626", // red
  high: "FF15803D", // green
  headerFill: "FFF3EEF7",
  border: "FF000000",
};
const HIGH_SCORE_PCT = 90;

function badRequest(message) {
  return Object.assign(new Error(message), { status: 400 });
}
function notFound(message) {
  return Object.assign(new Error(message), { status: 404 });
}

/** Marks converted to a score out of 100, rounded to a whole number. */
const outOf100 = (marks, max) => (Number(max) > 0 ? Math.round((Number(marks) / Number(max)) * SCALE) : 0);
const byName = (a, b) => (a.name || "").localeCompare(b.name || "", "en", { sensitivity: "base" });

function monthLabel(month) {
  const [y, m] = month.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString("en-IN", { month: "long", year: "numeric", timeZone: "UTC" });
}

function formatDate(iso) {
  return new Date(iso).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric", timeZone: TIMEZONE });
}

/** "Test-3 Isomerism" — or the title itself when it already carries its own "Test-<n>" prefix. */
function testColumnName(title, index) {
  const t = String(title || "").trim().replace(/\s+/g, " ");
  if (/^test[\s\-–—_.:#]*\d+/i.test(t)) return t;
  return t ? `Test-${index + 1} ${t}` : `Test-${index + 1}`;
}

/** Map of batch_id → Set(student_id) for the given batches. */
async function enrollmentsByBatch(batchIds) {
  const map = new Map();
  if (batchIds.length === 0) return map;
  const { data, error } = await supabase.from("batch_enrollments").select("batch_id, student_id").in("batch_id", batchIds);
  if (error) throw error;
  for (const row of data || []) {
    if (!map.has(row.batch_id)) map.set(row.batch_id, new Set());
    map.get(row.batch_id).add(row.student_id);
  }
  return map;
}

/** Students who attempted but aren't in `known` (e.g. since moved batch) — still belong on the sheet. */
async function fetchMissingStudents(studentIds, known) {
  const missing = [...new Set(studentIds)].filter((id) => !known.has(id));
  if (missing.length === 0) return [];
  const { data, error } = await supabase.from("students").select(STUDENT_COLUMNS).in("id", missing);
  if (error) throw error;
  return data || [];
}

/**
 * The value for one student × test cell.
 * Returns { value, kind } where kind ∈ absent | pending | score | none.
 * A score's value is already out of 100.
 */
function cellFor({ attempt, targeted, ended }) {
  if (attempt) {
    if (attempt.status === "evaluated" && attempt.marks_awarded !== null && attempt.max_marks) {
      const score = outOf100(attempt.marks_awarded, attempt.max_marks);
      return { value: score, kind: "score", pct: score };
    }
    if (attempt.status === "not_started") {
      return targeted && ended ? { value: "AB", kind: "absent" } : { value: "", kind: "none" };
    }
    return { value: "Pending", kind: "pending" };
  }
  if (targeted && ended) return { value: "AB", kind: "absent" };
  return { value: "", kind: "none" };
}

// ─── Register models (shared by the .xlsx and the in-app view) ──────────────
//
// {
//   title, filename, sheetName,
//   columns: [{ header, sub }],          // one per test
//   rows:    [{ name, cells: [{ value, kind, pct? }] }],
//   tests:   [{ code, title, date, maxMarks }],   // the "Tests" key sheet
//   note,
// }

const NOTE =
  " " +
  " " +
  "";

async function buildMonthlyRegister(month) {
  const m = /^(\d{4})-(\d{2})$/.exec(month || "");
  if (!m) throw badRequest("month must be in YYYY-MM format");
  const year = Number(m[1]);
  const monthNum = Number(m[2]);
  const nextMonth = monthNum === 12 ? `${year + 1}-01` : `${year}-${String(monthNum + 1).padStart(2, "0")}`;
  const rangeStart = zonedTimeToUtcIso(`${month}-01`, "00:00", TIMEZONE);
  const rangeEnd = zonedTimeToUtcIso(`${nextMonth}-01`, "00:00", TIMEZONE);

  const { data: testsData, error: testsErr } = await supabase
    .from("tests")
    .select("id, title, audience, batch_id, scheduled_start, scheduled_end, max_marks")
    .gte("scheduled_start", rangeStart)
    .lt("scheduled_start", rangeEnd)
    .not("status", "in", "(cancelled,draft)")
    .order("scheduled_start", { ascending: true });
  if (testsErr) throw testsErr;
  const tests = testsData || [];

  const testIds = tests.map((t) => t.id);
  let attempts = [];
  if (testIds.length > 0) {
    const { data, error } = await supabase
      .from("test_attempts")
      .select("test_id, student_id, status, marks_awarded, max_marks")
      .in("test_id", testIds);
    if (error) throw error;
    attempts = data || [];
  }
  const attemptKey = (testId, studentId) => `${testId}:${studentId}`;
  const attemptMap = new Map(attempts.map((a) => [attemptKey(a.test_id, a.student_id), a]));

  const active = await audienceService.getActiveStudents(STUDENT_COLUMNS);
  const known = new Set(active.map((s) => s.id));
  const students = [...active, ...(await fetchMissingStudents(attempts.map((a) => a.student_id), known))]
    .filter((s) => !isExcludedFromExcel(s))
    .sort(byName);

  const enrollments = await enrollmentsByBatch([...new Set(tests.map((t) => t.batch_id).filter(Boolean))]);
  const now = new Date();

  const rows = students.map((s) => ({
    name: s.name,
    cells: tests.map((t) => {
      const targeted = t.audience === "ALL" ? known.has(s.id) : !!enrollments.get(t.batch_id)?.has(s.id);
      const ended = new Date(t.scheduled_end || t.scheduled_start) <= now;
      return cellFor({ attempt: attemptMap.get(attemptKey(t.id, s.id)), targeted, ended });
    }),
  }));

  const label = monthLabel(month);
  return {
    title: `Test Marks — ${label}`,
    filename: `test_marks_${month}.xlsx`,
    sheetName: label.slice(0, 31),
    columns: tests.map((t, i) => ({ header: testColumnName(t.title, i), sub: SCALE })),
    rows,
    tests: tests.map((t, i) => ({
      code: testColumnName(t.title, i),
      title: t.title,
      date: formatDate(t.scheduled_start),
      maxMarks: Number(t.max_marks) || "",
    })),
    note: NOTE,
  };
}

async function buildTestRegister(testId) {
  const { data: test, error: testErr } = await supabase
    .from("tests")
    .select("id, title, audience, batch_id, scheduled_start, scheduled_end, max_marks, batches(name)")
    .eq("id", testId)
    .maybeSingle();
  if (testErr) throw testErr;
  if (!test) throw notFound("Test not found");

  const { data: attempts, error: attErr } = await supabase
    .from("test_attempts")
    .select("student_id, status, marks_awarded, max_marks")
    .eq("test_id", testId);
  if (attErr) throw attErr;
  const attemptMap = new Map((attempts || []).map((a) => [a.student_id, a]));

  const targetedStudents = test.audience === "ALL"
    ? await audienceService.getActiveStudents(STUDENT_COLUMNS)
    : await audienceService.getActiveStudentsInBatches([test.batch_id], STUDENT_COLUMNS);
  const targetedIds = new Set(targetedStudents.map((s) => s.id));
  const students = [...targetedStudents, ...(await fetchMissingStudents((attempts || []).map((a) => a.student_id), targetedIds))]
    .filter((s) => !isExcludedFromExcel(s))
    .sort(byName);

  const ended = new Date(test.scheduled_end || test.scheduled_start) <= new Date();

  const rows = students.map((s) => ({
    name: s.name,
    cells: [cellFor({ attempt: attemptMap.get(s.id), targeted: targetedIds.has(s.id), ended })],
  }));

  const audience = test.audience === "ALL" ? "All Students" : test.batches?.name || "Batch";
  const safeTitle = test.title.replace(/[^a-zA-Z0-9]+/g, "_").replace(/^_+|_+$/g, "") || "test";
  const column = testColumnName(test.title, 0);
  return {
    title: `${test.title} — ${formatDate(test.scheduled_start)} — ${audience}`,
    filename: `${safeTitle}_marks.xlsx`,
    sheetName: "Marks",
    columns: [{ header: column, sub: SCALE }],
    rows,
    tests: [{ code: column, title: test.title, date: formatDate(test.scheduled_start), maxMarks: Number(test.max_marks) || "" }],
    note: NOTE,
  };
}

// ─── Sheet styling helpers ──────────────────────────────────────────────────

const thin = { style: "thin", color: { argb: COLOR.border } };
const allBorders = { top: thin, left: thin, bottom: thin, right: thin };

function styleHeaderCell(cell) {
  cell.font = { bold: true, size: 11 };
  cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
  cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: COLOR.headerFill } };
  cell.border = allBorders;
}

function styleScoreCell(cell, { kind, pct: scorePct }) {
  cell.alignment = { horizontal: "center", vertical: "middle" };
  cell.border = allBorders;
  if (kind === "absent") cell.font = { color: { argb: COLOR.absent }, bold: true };
  else if (kind === "pending") cell.font = { italic: true, color: { argb: "FF71717A" } };
  else if (kind === "score" && scorePct >= HIGH_SCORE_PCT) cell.font = { color: { argb: COLOR.high }, bold: true };
}

/**
 * Writes the register: a title row, a two-row header (test name over the
 * "out of" value; the fixed columns merged across both rows), then one row
 * per student.
 */
function writeRegister(sheet, { title, columns, rows }) {
  const fixed = ["No.", "Student's name"];
  const lastCol = fixed.length + columns.length;

  sheet.mergeCells(1, 1, 1, Math.max(lastCol, fixed.length));
  const titleCell = sheet.getCell(1, 1);
  titleCell.value = title;
  titleCell.font = { bold: true, size: 14 };
  titleCell.alignment = { horizontal: "center", vertical: "middle" };
  sheet.getRow(1).height = 24;

  fixed.forEach((label, i) => {
    sheet.mergeCells(2, i + 1, 3, i + 1);
    const cell = sheet.getCell(2, i + 1);
    cell.value = label;
    styleHeaderCell(cell);
  });
  columns.forEach((col, i) => {
    const top = sheet.getCell(2, fixed.length + 1 + i);
    top.value = col.header;
    styleHeaderCell(top);
    const sub = sheet.getCell(3, fixed.length + 1 + i);
    sub.value = col.sub;
    styleHeaderCell(sub);
  });
  // Merged header cells only keep the top-left cell's style — border the rest too.
  for (let r = 2; r <= 3; r++) for (let c = 1; c <= fixed.length; c++) sheet.getCell(r, c).border = allBorders;
  // Test names wrap onto up to ~3 lines in their column.
  const longest = columns.reduce((n, c) => Math.max(n, String(c.header).length), 0);
  sheet.getRow(2).height = longest > 32 ? 60 : longest > 16 ? 45 : 30;

  rows.forEach((row, i) => {
    const r = sheet.getRow(4 + i);
    const base = [`${i + 1}.`, row.name];
    base.forEach((v, c) => {
      const cell = r.getCell(c + 1);
      cell.value = v;
      cell.border = allBorders;
      cell.alignment = { vertical: "middle", horizontal: c === 1 ? "left" : "center" };
    });
    row.cells.forEach((cellData, c) => {
      const cell = r.getCell(fixed.length + 1 + c);
      cell.value = cellData.value;
      styleScoreCell(cell, cellData);
    });
  });

  sheet.getColumn(1).width = 6;
  sheet.getColumn(2).width = 32;
  for (let c = fixed.length + 1; c <= lastCol; c++) sheet.getColumn(c).width = 16;
  sheet.views = [{ state: "frozen", xSplit: 2, ySplit: 3 }];
}

function workbookFromRegister(register) {
  const wb = new ExcelJS.Workbook();
  wb.creator = "Chemistry@OCTET";
  writeRegister(wb.addWorksheet(register.sheetName), register);

  // Key sheet: each test's name, date and ORIGINAL max marks.
  const key = wb.addWorksheet("Tests");
  key.addRow(["Test", "Full title", "Date", "Max marks"]).eachCell(styleHeaderCell);
  for (const t of register.tests) {
    key.addRow([t.code, t.title, t.date, t.maxMarks]).eachCell((c) => { c.border = allBorders });
  }
  key.addRow([]);
  key.addRow([register.note]);
  key.getColumn(1).width = 36;
  key.getColumn(2).width = 40;
  key.getColumn(3).width = 16;
  key.getColumn(4).width = 12;

  return { workbook: wb, filename: register.filename };
}

async function buildMonthlyWorkbook(month) {
  return workbookFromRegister(await buildMonthlyRegister(month));
}

async function buildTestWorkbook(testId) {
  return workbookFromRegister(await buildTestRegister(testId));
}

/** Streams a built workbook as an .xlsx download. */
async function sendWorkbook(res, { workbook, filename }) {
  res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
  res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
  await workbook.xlsx.write(res);
  res.end();
}

module.exports = {
  buildMonthlyRegister, buildTestRegister,
  buildMonthlyWorkbook, buildTestWorkbook, sendWorkbook,
  _internal: { cellFor, testColumnName, outOf100 },
};
