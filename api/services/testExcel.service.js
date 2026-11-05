/**
 * services/testExcel.service.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Excel (.xlsx) exports of test marks, in the institute's marks-register
 * layout:
 *
 *   No. | Student's name | T-1 | T-2 | …
 *                           max   max
 *
 * - Monthly register: every active student × every test held that month.
 *   Each cell is the student's raw marks (e.g. 7 for 7/10; max marks sit in
 *   the header row), green at ≥90% of max,
 *   "AB" (red) when the test was meant for them, has ended, and they never
 *   attempted it, "Pending" when submitted but not yet evaluated, and blank
 *   when the test wasn't for them (or hasn't ended yet).
 * - Single test: every student the test targeted (plus anyone who attempted
 *   it), with their raw marks.
 *
 * Absence uses the same definition as the student monthly report
 * (testAttempts.service.js → getStudentMonthlyReport).
 * ─────────────────────────────────────────────────────────────────────────────
 */

const ExcelJS = require("exceljs");
const supabase = require("../config/supabase");
const audienceService = require("./audience.service");
const { zonedTimeToUtcIso } = require("../utils/timezone");
const { TIMEZONE } = require("../utils/graduation");

const STUDENT_COLUMNS = "id, name";

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

const pct = (marks, max) => (max > 0 ? Math.round((Number(marks) / Number(max)) * 100) : 0);
const byName = (a, b) => (a.name || "").localeCompare(b.name || "", "en", { sensitivity: "base" });

function monthLabel(month) {
  const [y, m] = month.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString("en-IN", { month: "long", year: "numeric", timeZone: "UTC" });
}

function formatDate(iso) {
  return new Date(iso).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric", timeZone: TIMEZONE });
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
 */
function cellFor({ attempt, targeted, ended }) {
  if (attempt) {
    if (attempt.status === "evaluated" && attempt.marks_awarded !== null && attempt.max_marks) {
      return { value: Number(attempt.marks_awarded), kind: "score", pct: pct(attempt.marks_awarded, attempt.max_marks) };
    }
    if (attempt.status === "not_started") {
      return targeted && ended ? { value: "AB", kind: "absent" } : { value: "", kind: "none" };
    }
    return { value: "Pending", kind: "pending" };
  }
  if (targeted && ended) return { value: "AB", kind: "absent" };
  return { value: "", kind: "none" };
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
 * Writes the register: a title row, a two-row header (test code over max
 * marks; the four student columns merged across both rows), then one row
 * per student. `columns` are the test columns: { header, sub }.
 * `rows` are { name, cells: [{ value, kind, pct? }] }.
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
  for (let c = fixed.length + 1; c <= lastCol; c++) sheet.getColumn(c).width = 10;
  sheet.views = [{ state: "frozen", xSplit: 2, ySplit: 3 }];
}

// ─── Monthly register ───────────────────────────────────────────────────────

async function buildMonthlyWorkbook(month) {
  const m = /^(\d{4})-(\d{2})$/.exec(month || "");
  if (!m) throw badRequest("month must be in YYYY-MM format");
  const year = Number(m[1]);
  const monthNum = Number(m[2]);
  const nextMonth = monthNum === 12 ? `${year + 1}-01` : `${year}-${String(monthNum + 1).padStart(2, "0")}`;
  const rangeStart = zonedTimeToUtcIso(`${month}-01`, "00:00", TIMEZONE);
  const rangeEnd = zonedTimeToUtcIso(`${nextMonth}-01`, "00:00", TIMEZONE);

  const { data: tests, error: testsErr } = await supabase
    .from("tests")
    .select("id, title, audience, batch_id, scheduled_start, scheduled_end, max_marks")
    .gte("scheduled_start", rangeStart)
    .lt("scheduled_start", rangeEnd)
    .not("status", "in", "(cancelled,draft)")
    .order("scheduled_start", { ascending: true });
  if (testsErr) throw testsErr;

  const testIds = (tests || []).map((t) => t.id);
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

  const students = await audienceService.getActiveStudents(STUDENT_COLUMNS);
  const known = new Set(students.map((s) => s.id));
  students.push(...(await fetchMissingStudents(attempts.map((a) => a.student_id), known)));
  students.sort(byName);

  const enrollments = await enrollmentsByBatch([...new Set((tests || []).map((t) => t.batch_id).filter(Boolean))]);
  const now = new Date();

  const rows = students.map((s) => ({
    name: s.name,
    cells: (tests || []).map((t) => {
      const targeted = t.audience === "ALL" ? known.has(s.id) : !!enrollments.get(t.batch_id)?.has(s.id);
      const ended = new Date(t.scheduled_end || t.scheduled_start) <= now;
      return cellFor({ attempt: attemptMap.get(attemptKey(t.id, s.id)), targeted, ended });
    }),
  }));

  const wb = new ExcelJS.Workbook();
  wb.creator = "Chemistry@OCTET";
  const sheet = wb.addWorksheet(monthLabel(month).slice(0, 31));
  writeRegister(sheet, {
    title: `Test Marks — ${monthLabel(month)}`,
    columns: (tests || []).map((t, i) => ({ header: `T-${i + 1}`, sub: Number(t.max_marks) || "" })),
    rows,
  });

  // Key sheet: which test each T-n column is.
  const key = wb.addWorksheet("Tests");
  key.addRow(["Code", "Test", "Date", "Max marks"]).eachCell(styleHeaderCell);
  (tests || []).forEach((t, i) => {
    key.addRow([`T-${i + 1}`, t.title, formatDate(t.scheduled_start), Number(t.max_marks) || ""]).eachCell((c) => { c.border = allBorders })
  });
  key.addRow([]);
  key.addRow(["Marks are out of each test's max marks (shown under T-n). Green = 90% or more. AB = absent (test was assigned and has ended, not attempted). Pending = submitted, awaiting evaluation. Blank = test not assigned to the student, or not over yet."]);
  key.getColumn(1).width = 8;
  key.getColumn(2).width = 40;
  key.getColumn(3).width = 16;
  key.getColumn(4).width = 12;

  return { workbook: wb, filename: `test_marks_${month}.xlsx` };
}

// ─── Single test ────────────────────────────────────────────────────────────

async function buildTestWorkbook(testId) {
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
  const students = [...targetedStudents, ...(await fetchMissingStudents((attempts || []).map((a) => a.student_id), targetedIds))];
  students.sort(byName);

  const ended = new Date(test.scheduled_end || test.scheduled_start) <= new Date();
  const maxMarks = Number(test.max_marks) || 0;

  const rows = students.map((s) => {
    const cell = cellFor({ attempt: attemptMap.get(s.id), targeted: targetedIds.has(s.id), ended });
    return { name: s.name, cells: [cell] };
  });

  const audience = test.audience === "ALL" ? "All Students" : test.batches?.name || "Batch";
  const wb = new ExcelJS.Workbook();
  wb.creator = "Chemistry@OCTET";
  const sheet = wb.addWorksheet("Marks");
  writeRegister(sheet, {
    title: `${test.title} — ${formatDate(test.scheduled_start)} — ${audience}`,
    columns: [{ header: "Marks", sub: maxMarks || "" }],
    rows,
  });
  sheet.getColumn(3).width = 12;

  const safeTitle = test.title.replace(/[^a-zA-Z0-9]+/g, "_").replace(/^_+|_+$/g, "") || "test";
  return { workbook: wb, filename: `${safeTitle}_marks.xlsx` };
}

/** Streams a built workbook as an .xlsx download. */
async function sendWorkbook(res, { workbook, filename }) {
  res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
  res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
  await workbook.xlsx.write(res);
  res.end();
}

module.exports = { buildMonthlyWorkbook, buildTestWorkbook, sendWorkbook, _internal: { cellFor } };
