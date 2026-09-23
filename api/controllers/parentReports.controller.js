/**
 * controllers/parentReports.controller.js
 * ─────────────────────────────────────────────────────────────
 * Admin-only manual controls for the parent/student report system —
 * the automatic schedulers (parentReportScheduler.service.js,
 * absenceNotifyScheduler.service.js) run on their own; these routes exist
 * so an admin can send/resend a report, run the whole month on demand, or
 * check what's already gone out, without waiting for the schedule.
 * ─────────────────────────────────────────────────────────────
 */

const service = require("../services/parentReports.service");
const supabase = require("../config/supabase");

function handleError(res, err, fallback) {
  res.status(err.status || 500).json({ error: err.message || fallback });
}

function currentYearMonth() {
  const now = new Date();
  return { year: now.getFullYear(), month: now.getMonth() + 1 };
}

/** POST /api/parent-reports/students/:studentId/send  body: { year?, month?, force? } */
const sendForStudent = async (req, res) => {
  try {
    const { year, month } = { ...currentYearMonth(), ...req.body };
    const force = !!req.body?.force;
    const result = await service.sendMonthlyReportForStudent(req.params.studentId, Number(year), Number(month), { force });
    res.status(200).json(result);
  } catch (err) {
    handleError(res, err, "Failed to send report");
  }
};

/** POST /api/parent-reports/run-monthly  body: { year?, month? } — runs every approved student */
const runMonthly = async (req, res) => {
  try {
    const { year, month } = { ...currentYearMonth(), ...req.body };
    const results = await service.runMonthlyReportsForAllStudents(Number(year), Number(month));
    res.status(200).json({ results });
  } catch (err) {
    handleError(res, err, "Failed to run monthly reports");
  }
};

/** POST /api/parent-reports/sessions/:sessionId/notify-absentees — manual trigger, same idempotent path the scheduler uses */
const notifyAbsentees = async (req, res) => {
  try {
    const result = await service.processAbsenceAlertsForSession(req.params.sessionId);
    res.status(200).json(result);
  } catch (err) {
    handleError(res, err, "Failed to send absence alerts");
  }
};

/** GET /api/parent-reports/log?year=&month= — visibility into what's already been sent */
const getLog = async (req, res) => {
  try {
    let query = supabase
      .from("parent_report_log")
      .select("*, students(name, admission_number)")
      .order("sent_at", { ascending: false })
      .limit(200);
    if (req.query.year) query = query.eq("report_year", Number(req.query.year));
    if (req.query.month) query = query.eq("report_month", Number(req.query.month));

    const { data, error } = await query;
    if (error) throw error;
    res.status(200).json({ log: data });
  } catch (err) {
    handleError(res, err, "Failed to load report log");
  }
};

module.exports = { sendForStudent, runMonthly, notifyAbsentees, getLog };
