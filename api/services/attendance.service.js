/**
 * services/attendance.service.js
 * ─────────────────────────────────────────────────────────────────────────────
 * All Supabase queries for the attendance feature.
 * No Express objects here — pure data in / data out.
 * ─────────────────────────────────────────────────────────────────────────────
 */

const  supabase  = require("../config/supabase");
const crypto = require("crypto");

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Generate a cryptographically random QR token */
function generateQrToken() {
  return crypto.randomBytes(32).toString("hex");
}

/** ISO timestamp N seconds from now */
function expiresFromNow(seconds) {
  return new Date(Date.now() + seconds * 1000).toISOString();
}

const DEFAULT_REFRESH_INTERVAL = 30; // seconds

// ─── Batches ─────────────────────────────────────────────────────────────────

/**
 * List all batches.
 * delivery_type is aliased to `mode` so the frontend type stays consistent.
 */
async function getBatches() {
  const { data, error } = await supabase
    .from("batches")
    .select("id, name, days, start_time, end_time, meet_link, location")
    .order("name", { ascending: true });

  if (error) throw error;

  return (data || []).map((b) => ({
    id:          b.id,
    name:        b.name,
    days:        b.days,
    start_time:  b.start_time,
    end_time:    b.end_time,
    meet_link:   b.meet_link,
    location:    b.location,
  }));
}

/**
 * Create a new batch.
 * Writes `mode` into the existing `delivery_type` column.
 */
async function createBatch({ name, days, start_time, end_time, meet_link, location }) {
  if (!name) throw Object.assign(new Error("name is required"), { status: 400 });

  const payload = { name };
  if (days)        payload.days        = days;
  if (start_time)  payload.start_time  = start_time;
  if (end_time)    payload.end_time    = end_time;
  if (meet_link)   payload.meet_link   = meet_link;
  if (location)    payload.location    = location;

  const { data, error } = await supabase
    .from("batches")
    .insert(payload)
    .select("id, name, days, start_time, end_time, meet_link, location")
    .single();

  if (error) throw error;
  return data;
}

// ─── Batch existence guard ────────────────────────────────────────────────────

async function assertBatchExists(batchId) {
  const { data, error } = await supabase
    .from("batches")
    .select("id")
    .eq("id", batchId)
    .maybeSingle();

  if (error) throw error;
  if (!data) throw Object.assign(new Error("Batch not found"), { status: 404 });
}

// ─── Students in a batch ─────────────────────────────────────────────────────

/**
 * Returns all students enrolled in a batch, each enriched with:
 *   - attendancePct  (across ALL sessions for this batch, not date-filtered)
 *   - unblocked      (manual override flag)
 *
 * `date` is accepted but currently unused server-side — reserved for
 * per-date roster views once that feature is scoped.
 */
async function getBatchStudents(batchId) {
  await assertBatchExists(batchId);

  // 1. Enrolled students
  const { data: enrollments, error: enrollErr } = await supabase
    .from("batch_enrollments")
    .select("student_id, students(id, name, admission_number)")
    .eq("batch_id", batchId);

  if (enrollErr) throw enrollErr;
  if (!enrollments || enrollments.length === 0) return [];

  const studentIds = enrollments.map((e) => e.student_id);

  // 2. All sessions for this batch
  const { data: sessions, error: sessErr } = await supabase
    .from("attendance_sessions")
    .select("id")
    .eq("batch_id", batchId);

  if (sessErr) throw sessErr;

  const totalSessions = sessions?.length || 0;
  const sessionIds = (sessions || []).map((s) => s.id);

  // 3. Attendance records for those sessions
  let presentMap = {}; // studentId → count of sessions present
  if (sessionIds.length > 0) {
    const { data: records, error: recErr } = await supabase
      .from("attendance_records")
      .select("student_id, present")
      .in("session_id", sessionIds)
      .eq("present", true);

    if (recErr) throw recErr;

    (records || []).forEach((r) => {
      presentMap[r.student_id] = (presentMap[r.student_id] || 0) + 1;
    });
  }

  // 4. Manual overrides
  const { data: overrides, error: ovErr } = await supabase
    .from("attendance_overrides")
    .select("student_id, unblocked")
    .eq("batch_id", batchId)
    .in("student_id", studentIds);

  if (ovErr) throw ovErr;

  const overrideMap = {};
  (overrides || []).forEach((o) => {
    overrideMap[o.student_id] = o.unblocked;
  });

  // 5. Assemble
  return enrollments.map((e) => {
    const s = e.students;
    const presentCount = presentMap[e.student_id] || 0;
    return {
      id:            s.id,
      name:          s.name,
      roll:          s.admission_number,
      attendancePct: totalSessions > 0
        ? Math.round((presentCount / totalSessions) * 100)
        : null,
      unblocked:     overrideMap[e.student_id] || false,
    };
  });
}

// ─── Eligible students (not yet in this batch) ────────────────────────────────

/**
 * Students NOT enrolled in the given batch.
 * Also shows which other batch they're currently in (if any).
 */
async function getEligibleStudents(batchId) {
  await assertBatchExists(batchId);

  // Already enrolled in THIS batch
  const { data: enrolled, error: enrErr } = await supabase
    .from("batch_enrollments")
    .select("student_id")
    .eq("batch_id", batchId);

  if (enrErr) throw enrErr;

  const enrolledIds = (enrolled || []).map((e) => e.student_id);

  // All students
  let query = supabase
    .from("students")
    .select("id, name, admission_number");

  if (enrolledIds.length > 0) {
    query = query.not("id", "in", `(${enrolledIds.join(",")})`);
  }

  const { data: students, error: stuErr } = await query.order("name");
  if (stuErr) throw stuErr;
  if (!students || students.length === 0) return [];

  // Find if each student is in ANY other batch
  const { data: allEnrollments, error: allEnrErr } = await supabase
    .from("batch_enrollments")
    .select("student_id, batch_id, batches(name)")
    .neq("batch_id", batchId);

  if (allEnrErr) throw allEnrErr;

  const batchMap = {};
  (allEnrollments || []).forEach((e) => {
    batchMap[e.student_id] = e.batches?.name || null;
  });

  return students.map((s) => ({
    id:               s.id,
    name:             s.name,
    roll:             s.admission_number,
    currentBatchName: batchMap[s.id] || null,
  }));
}

// ─── Enroll students ──────────────────────────────────────────────────────────

async function addStudentsToBatch(batchId, studentIds) {
  await assertBatchExists(batchId);

  if (!Array.isArray(studentIds) || studentIds.length === 0) {
    throw Object.assign(new Error("studentIds must be a non-empty array"), { status: 400 });
  }

  const rows = studentIds.map((sid) => ({ batch_id: batchId, student_id: sid }));

  const { error } = await supabase
    .from("batch_enrollments")
    .upsert(rows, { onConflict: "batch_id,student_id", ignoreDuplicates: true });

  if (error) throw error;
}

// ─── Manual override (unblock) ────────────────────────────────────────────────

async function setStudentOverride(studentId, batchId, unblocked) {
  // Verify both exist
  const { data: student, error: stuErr } = await supabase
    .from("students")
    .select("id")
    .eq("id", studentId)
    .maybeSingle();

  if (stuErr) throw stuErr;
  if (!student) throw Object.assign(new Error("Student not found"), { status: 404 });

  await assertBatchExists(batchId);

  const { error } = await supabase
    .from("attendance_overrides")
    .upsert(
      { student_id: studentId, batch_id: batchId, unblocked, updated_at: new Date().toISOString() },
      { onConflict: "student_id,batch_id" }
    );

  if (error) throw error;
}

// ─── Sessions ─────────────────────────────────────────────────────────────────

/**
 * POST /sessions — idempotent.
 * If a session already exists for (batch_id, date), return it.
 */
async function startSession(batchId, date) {
  await assertBatchExists(batchId);

  // Check existing
  const { data: existing, error: findErr } = await supabase
    .from("attendance_sessions")
    .select("*")
    .eq("batch_id", batchId)
    .eq("date", date)
    .maybeSingle();

  if (findErr) throw findErr;
  if (existing) {
    return {
      sessionId:              existing.id,
      qrToken:                existing.qr_token,
      expiresAt:              existing.expires_at,
      refreshIntervalSeconds: existing.refresh_interval_seconds,
    };
  }

  // Create new
  const qrToken   = generateQrToken();
  const expiresAt = expiresFromNow(DEFAULT_REFRESH_INTERVAL);

  const { data, error } = await supabase
    .from("attendance_sessions")
    .insert({
      batch_id:                 batchId,
      date,
      qr_token:                 qrToken,
      expires_at:               expiresAt,
      refresh_interval_seconds: DEFAULT_REFRESH_INTERVAL,
    })
    .select("*")
    .single();

  if (error) throw error;

  return {
    sessionId:              data.id,
    qrToken:                data.qr_token,
    expiresAt:              data.expires_at,
    refreshIntervalSeconds: data.refresh_interval_seconds,
  };
}

/**
 * POST /sessions/:sessionId/refresh — rotate QR token.
 */
async function refreshSession(sessionId) {
  const { data: session, error: findErr } = await supabase
    .from("attendance_sessions")
    .select("id, refresh_interval_seconds")
    .eq("id", sessionId)
    .maybeSingle();

  if (findErr) throw findErr;
  if (!session) throw Object.assign(new Error("Session not found"), { status: 404 });

  const qrToken   = generateQrToken();
  const expiresAt = expiresFromNow(session.refresh_interval_seconds);

  const { error } = await supabase
    .from("attendance_sessions")
    .update({ qr_token: qrToken, expires_at: expiresAt })
    .eq("id", sessionId);

  if (error) throw error;

  return { qrToken, expiresAt };
}

// ─── Roster ───────────────────────────────────────────────────────────────────

async function getRoster(sessionId) {
  const { data: session, error: sessErr } = await supabase
    .from("attendance_sessions")
    .select("id")
    .eq("id", sessionId)
    .maybeSingle();

  if (sessErr) throw sessErr;
  if (!session) throw Object.assign(new Error("Session not found"), { status: 404 });

  const { data, error } = await supabase
    .from("attendance_records")
    .select("student_id, present")
    .eq("session_id", sessionId);

  if (error) throw error;

  return (data || []).map((r) => ({ studentId: r.student_id, present: r.present }));
}

// ─── Manual mark ─────────────────────────────────────────────────────────────

async function manualMark(sessionId, studentId, present) {
  // Verify session
  const { data: session, error: sessErr } = await supabase
    .from("attendance_sessions")
    .select("id")
    .eq("id", sessionId)
    .maybeSingle();

  if (sessErr) throw sessErr;
  if (!session) throw Object.assign(new Error("Session not found"), { status: 404 });

  // Verify student
  const { data: student, error: stuErr } = await supabase
    .from("students")
    .select("id")
    .eq("id", studentId)
    .maybeSingle();

  if (stuErr) throw stuErr;
  if (!student) throw Object.assign(new Error("Student not found"), { status: 404 });

  const { error } = await supabase
    .from("attendance_records")
    .upsert(
      { session_id: sessionId, student_id: studentId, present, marked_at: new Date().toISOString() },
      { onConflict: "session_id,student_id" }
    );

  if (error) throw error;
}

// ─── QR Scan (student self-mark) ─────────────────────────────────────────────

/**
 * Called from student device after scanning the QR code.
 * Student identity comes from the JWT (userId = auth.users.id).
 * We resolve: auth_user_id → students.id → batch_enrollment check → mark present.
 */
async function scanQrToken(qrToken, authUserId) {
  // 1. Resolve student from auth user
  const { data: student, error: stuErr } = await supabase
    .from("students")
    .select("id")
    .eq("auth_user_id", authUserId)
    .maybeSingle();

  if (stuErr) throw stuErr;
  if (!student) throw Object.assign(new Error("Student profile not found"), { status: 404 });

  // 2. Find the active session for this token (not expired)
  const { data: session, error: sessErr } = await supabase
    .from("attendance_sessions")
    .select("id, batch_id, expires_at")
    .eq("qr_token", qrToken)
    .maybeSingle();

  if (sessErr) throw sessErr;
  if (!session) throw Object.assign(new Error("Invalid or expired QR token"), { status: 400 });

  // 3. Check token expiry
  if (new Date(session.expires_at) < new Date()) {
    throw Object.assign(new Error("QR token has expired"), { status: 400 });
  }

  // 4. Check enrollment
  const { data: enrollment, error: enrErr } = await supabase
    .from("batch_enrollments")
    .select("student_id")
    .eq("batch_id", session.batch_id)
    .eq("student_id", student.id)
    .maybeSingle();

  if (enrErr) throw enrErr;
  if (!enrollment) {
    throw Object.assign(new Error("Student not enrolled in this batch"), { status: 403 });
  }

  // 5. Mark present (upsert — idempotent if they scan twice)
  const { error: markErr } = await supabase
    .from("attendance_records")
    .upsert(
      { session_id: session.id, student_id: student.id, present: true, marked_at: new Date().toISOString() },
      { onConflict: "session_id,student_id" }
    );

  if (markErr) throw markErr;
}

// ─── Trend ────────────────────────────────────────────────────────────────────

/**
 * Returns the last N sessions the student's batch had,
 * with present/absent for each, labelled S1…SN (oldest→newest).
 */
async function getStudentTrend(studentId, sessionCount = 5) {
  // Resolve student
  const { data: student, error: stuErr } = await supabase
    .from("students")
    .select("id")
    .eq("id", studentId)
    .maybeSingle();

  if (stuErr) throw stuErr;
  if (!student) throw Object.assign(new Error("Student not found"), { status: 404 });

  // Find their batch
  const { data: enrollment, error: enrErr } = await supabase
    .from("batch_enrollments")
    .select("batch_id")
    .eq("student_id", studentId)
    .maybeSingle();

  if (enrErr) throw enrErr;
  if (!enrollment) return []; // Not in any batch → no trend data

  // Get last N sessions for that batch
  const { data: sessions, error: sessErr } = await supabase
    .from("attendance_sessions")
    .select("id, date")
    .eq("batch_id", enrollment.batch_id)
    .order("date", { ascending: false })
    .limit(sessionCount);

  if (sessErr) throw sessErr;
  if (!sessions || sessions.length === 0) return [];

  const sessionIds = sessions.map((s) => s.id);

  // Records for those sessions
  const { data: records, error: recErr } = await supabase
    .from("attendance_records")
    .select("session_id, present")
    .in("session_id", sessionIds)
    .eq("student_id", studentId);

  if (recErr) throw recErr;

  const recordMap = {};
  (records || []).forEach((r) => {
    recordMap[r.session_id] = r.present;
  });

  // Reverse so oldest → newest, label S1…SN
  const ordered = [...sessions].reverse();
  return ordered.map((s, i) => ({
    label: `S${i + 1}`,
    pct:   recordMap[s.id] ? 100 : 0,
  }));
}

module.exports = {
  getBatches,
  createBatch,
  getBatchStudents,
  getEligibleStudents,
  addStudentsToBatch,
  setStudentOverride,
  startSession,
  refreshSession,
  getRoster,
  manualMark,
  scanQrToken,
  getStudentTrend,
};