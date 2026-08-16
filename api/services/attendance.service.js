/**
 * services/attendance.service.js
 * ─────────────────────────────────────────────────────────────────────────────
 * All Supabase queries for the attendance feature.
 * No Express objects here — pure data in / data out.
 *
 * Attendance has two SOURCES that both write into these same
 * attendance_sessions / attendance_records tables:
 *   - OFFLINE     — the original QR-scan flow (startSession/scanQrToken/
 *                   manualMark below), unchanged.
 *   - GOOGLE_MEET — online classes; sessions are created by
 *                   onlineClasses.service.js and populated by
 *                   onlineAttendanceSync.service.js, using the helpers in
 *                   the "Online-class session linking" section below.
 * This file remains the single source of truth for both — nothing about
 * the OFFLINE code paths changes.
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

/** "YYYY-MM-DD" for today, in server local time */
function todayDateString() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Pull the day-of-month out of a "YYYY-MM-DD" string without any Date/timezone drift */
function dayFromDateString(dateStr) {
  const parts = dateStr.split("-");
  return parseInt(parts[2], 10);
}

const DEFAULT_REFRESH_INTERVAL = 30; // seconds

const WEEKDAY_ABBR = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/** True if a batch's `days` field (e.g. "Tue/Thu/Sat") includes today's weekday. */
function isBatchDayToday(daysStr) {
  if (!daysStr) return false;
  const today = WEEKDAY_ABBR[new Date().getDay()];
  return daysStr.split("/").map((s) => s.trim()).includes(today);
}

/** Tri-state status for a record: prefer the stored value, fall back to the boolean `present` for legacy/offline rows. */
function effectiveStatus(record) {
  if (!record) return "absent";
  return record.final_status || record.status || (record.present ? "present" : "absent");
}

// ─── Batches ─────────────────────────────────────────────────────────────────

/**
 * List all batches.
 * delivery_type is aliased to `mode` (lowercased) so the frontend type stays consistent.
 */
async function getBatches() {
  const { data, error } = await supabase
    .from("batches")
    .select("id, name, days, start_time, end_time, meet_link, location, delivery_type")
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
    mode:        b.delivery_type ? b.delivery_type.toLowerCase() : null, // 'ONLINE' -> 'online'
  }));
}

/**
 * Create a new batch.
 * Writes `mode` into the `delivery_type` column (uppercased to satisfy the
 * DB CHECK constraint). Generates a stable id from the name if the caller
 * didn't supply one — batches.id is a TEXT primary key with no DB default.
 */
async function createBatch({ id, name, mode, days, start_time, end_time, meet_link, location }) {
  if (!name) throw Object.assign(new Error("name is required"), { status: 400 });

  const batchId = id || name.trim().toUpperCase().replace(/[^A-Z0-9]+/g, "_").replace(/^_+|_+$/g, "");

  const payload = {
    id: batchId,
    name: name,
  };

  if (mode)        payload.delivery_type = mode.toUpperCase(); // 'online' -> 'ONLINE'
  if (days)        payload.days        = days;
  if (start_time)  payload.start_time  = start_time;
  if (end_time)    payload.end_time    = end_time;
  if (meet_link)   payload.meet_link   = meet_link;
  if (location)    payload.location    = location;

  const { data, error } = await supabase
    .from("batches")
    .insert(payload)
    .select("id, name, days, start_time, end_time, meet_link, location, delivery_type")
    .single();

  if (error) throw error;

  return {
    id:          data.id,
    name:        data.name,
    days:        data.days,
    start_time:  data.start_time,
    end_time:    data.end_time,
    meet_link:   data.meet_link,
    location:    data.location,
    mode:        data.delivery_type ? data.delivery_type.toLowerCase() : null,
  };
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

  // All approved students not already in this batch — pending/rejected
  // applicants are never real candidates for a live class roster.
  let query = supabase
    .from("students")
    .select("id, name, admission_number")
    .eq("status", "APPROVED");

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

// ─── Today's roster (admin dashboard) ─────────────────────────────────────────

/**
 * Returns today's session (if one has been started) for the batch, plus the
 * FULL enrolled roster with present/absent defaulted for anyone not marked.
 */
async function getTodayRoster(batchId) {
  await assertBatchExists(batchId);

  const todayStr = todayDateString();

  const { data: session, error: sessErr } = await supabase
    .from("attendance_sessions")
    .select("id, date, qr_token, expires_at, refresh_interval_seconds, created_at, source")
    .eq("batch_id", batchId)
    .eq("date", todayStr)
    .maybeSingle();

  if (sessErr) throw sessErr;

  const { data: enrollments, error: enrollErr } = await supabase
    .from("batch_enrollments")
    .select("student_id, students(id, name, admission_number)")
    .eq("batch_id", batchId);

  if (enrollErr) throw enrollErr;

  const students = enrollments || [];

  let recordMap = {};
  if (session && students.length > 0) {
    const studentIds = students.map((e) => e.student_id);
    const { data: records, error: recErr } = await supabase
      .from("attendance_records")
      .select("student_id, present, marked_at, final_status, duration_minutes")
      .eq("session_id", session.id)
      .in("student_id", studentIds);

    if (recErr) throw recErr;

    (records || []).forEach((r) => {
      recordMap[r.student_id] = r;
    });
  }

  const roster = students.map((e) => {
    const s = e.students;
    const record = recordMap[e.student_id];
    return {
      studentId: s.id,
      name:      s.name,
      roll:      s.admission_number,
      present:   record?.present === true,
      status:    effectiveStatus(record),
      durationMinutes: record?.duration_minutes ?? null,
      markedAt:  record?.marked_at || null,
    };
  });

  const presentCount = roster.filter((r) => r.present).length;

  return {
    date: todayStr,
    session: session
      ? {
          id:                      session.id,
          qrToken:                 session.qr_token,
          expiresAt:               session.expires_at,
          refreshIntervalSeconds:  session.refresh_interval_seconds,
          createdAt:               session.created_at,
          source:                  session.source || "OFFLINE",
        }
      : null,
    totalStudents: roster.length,
    presentCount,
    absentCount:   roster.length - presentCount,
    roster,
  };
}

// ─── Batch summary (admin dashboard) ──────────────────────────────────────────

/**
 * Aggregate stats for a batch: total students, total sessions ever held,
 * overall average attendance %, and today's present/absent snapshot.
 */
async function getBatchSummary(batchId) {
  await assertBatchExists(batchId);

  const { data: enrollments, error: enrollErr } = await supabase
    .from("batch_enrollments")
    .select("student_id")
    .eq("batch_id", batchId);

  if (enrollErr) throw enrollErr;

  const totalStudents = enrollments?.length || 0;

  const { data: sessions, error: sessErr } = await supabase
    .from("attendance_sessions")
    .select("id, date")
    .eq("batch_id", batchId)
    .order("date", { ascending: false });

  if (sessErr) throw sessErr;

  const totalSessions = sessions?.length || 0;
  const sessionIds = (sessions || []).map((s) => s.id);

  let avgAttendancePct = null;
  if (totalSessions > 0 && totalStudents > 0 && sessionIds.length > 0) {
    const { data: records, error: recErr } = await supabase
      .from("attendance_records")
      .select("present")
      .in("session_id", sessionIds)
      .eq("present", true);

    if (recErr) throw recErr;

    const totalPresentMarks = records?.length || 0;
    avgAttendancePct = Math.round((totalPresentMarks / (totalStudents * totalSessions)) * 100);
  }

  const todayStr = todayDateString();
  const todaySession = (sessions || []).find((s) => s.date === todayStr);

  let presentToday = 0;
  if (todaySession) {
    const { data: records, error: recErr } = await supabase
      .from("attendance_records")
      .select("present")
      .eq("session_id", todaySession.id)
      .eq("present", true);

    if (recErr) throw recErr;
    presentToday = records?.length || 0;
  }

  return {
    totalStudents,
    totalSessions,
    avgAttendancePct,
    todaySessionActive: !!todaySession,
    presentToday,
    absentToday: todaySession ? totalStudents - presentToday : null,
  };
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

/**
 * Returns the FULL enrolled roster for a session — not just students who
 * already have an attendance_records row. Anyone without a record shows up
 * as present:false so the admin UI reflects reality instead of silently
 * omitting unmarked / absent students.
 */
async function getRoster(sessionId) {
  const { data: session, error: sessErr } = await supabase
    .from("attendance_sessions")
    .select("id, batch_id, date, source")
    .eq("id", sessionId)
    .maybeSingle();

  if (sessErr) throw sessErr;
  if (!session) throw Object.assign(new Error("Session not found"), { status: 404 });

  const { data: enrollments, error: enrollErr } = await supabase
    .from("batch_enrollments")
    .select("student_id, students(id, name, admission_number)")
    .eq("batch_id", session.batch_id);

  if (enrollErr) throw enrollErr;

  const students = enrollments || [];

  let recordMap = {};
  if (students.length > 0) {
    const studentIds = students.map((e) => e.student_id);
    const { data: records, error: recErr } = await supabase
      .from("attendance_records")
      .select("student_id, present, marked_at, final_status, duration_minutes")
      .eq("session_id", sessionId)
      .in("student_id", studentIds);

    if (recErr) throw recErr;

    (records || []).forEach((r) => {
      recordMap[r.student_id] = r;
    });
  }

  return students.map((e) => {
    const s = e.students;
    const record = recordMap[e.student_id];
    return {
      studentId: s.id,
      name:      s.name,
      roll:      s.admission_number,
      present:   record?.present === true,
      status:    effectiveStatus(record),
      durationMinutes: record?.duration_minutes ?? null,
      markedAt:  record?.marked_at || null,
    };
  });
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
 *
 * This is delivery-mode agnostic — the same path marks attendance for
 * ONLINE, OFFLINE, and HYBRID batches.
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

// ─── Online-class session linking (used by onlineClasses.service.js and
// onlineAttendanceSync.service.js) ─────────────────────────────────────────

/**
 * Finds-or-creates the attendance_sessions row for a Google-Meet-sourced
 * online class on a given date, and links it to that online_classes row.
 * Reuses the SAME attendance_sessions table the QR-based offline flow
 * uses — if a session already exists for this batch+date (e.g. an admin
 * also ran a QR session that day), it's adopted/relabelled rather than
 * duplicated, since (batch_id, date) is treated as one session everywhere
 * else in this file.
 */
async function getOrCreateSessionForOnlineClass(batchId, date, onlineClassId) {
  const { data: existing, error: findErr } = await supabase
    .from("attendance_sessions")
    .select("*")
    .eq("batch_id", batchId)
    .eq("date", date)
    .maybeSingle();
  if (findErr) throw findErr;

  if (existing) {
    if (existing.online_class_id === onlineClassId) return existing;
    const { data: updated, error: updateErr } = await supabase
      .from("attendance_sessions")
      .update({
        online_class_id: onlineClassId,
        source: "GOOGLE_MEET",
        sync_status: existing.sync_status || "NOT_STARTED",
      })
      .eq("id", existing.id)
      .select("*")
      .single();
    if (updateErr) throw updateErr;
    return updated;
  }

  const { data: created, error: insertErr } = await supabase
    .from("attendance_sessions")
    .insert({
      batch_id: batchId,
      date,
      qr_token: generateQrToken(), // unused for Meet-sourced sessions, generated only to satisfy the existing column
      expires_at: expiresFromNow(DEFAULT_REFRESH_INTERVAL),
      refresh_interval_seconds: DEFAULT_REFRESH_INTERVAL,
      source: "GOOGLE_MEET",
      online_class_id: onlineClassId,
      sync_status: "NOT_STARTED",
    })
    .select("*")
    .single();
  if (insertErr) throw insertErr;
  return created;
}

/** Detaches a session from an online class — used when a reschedule moves the class to a different date. */
async function detachSessionFromOnlineClass(onlineClassId) {
  const { error } = await supabase
    .from("attendance_sessions")
    .update({ online_class_id: null })
    .eq("online_class_id", onlineClassId);
  if (error) throw error;
}

async function getSessionByOnlineClassId(onlineClassId) {
  const { data, error } = await supabase
    .from("attendance_sessions")
    .select("*")
    .eq("online_class_id", onlineClassId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

/** Patches sync bookkeeping fields on a session (sync_status, sync_error, last_synced_at, etc.). */
async function updateSessionSyncStatus(sessionId, patch) {
  const dbPatch = { ...patch };
  if (patch.sync_status === "SYNCED" || patch.sync_status === "SYNC_FAILED") {
    dbPatch.last_synced_at = new Date().toISOString();
  }
  const { error } = await supabase.from("attendance_sessions").update(dbPatch).eq("id", sessionId);
  if (error) throw error;
}

// ─── Admin: per-session attendance detail, override, unmatched participants ──

/**
 * Full roster for one session with the richer online-class fields
 * (duration, automatic vs final pct/status, override audit) alongside the
 * same present/absent every offline session already exposes. Used by the
 * admin's session drill-down (Students → Attendance → batch → day) and by
 * the Online Classes page's "View attendance" action.
 */
async function getSessionAttendanceDetail(sessionId) {
  const { data: session, error: sessErr } = await supabase
    .from("attendance_sessions")
    .select("*, batches(name), online_classes(title, description, subjects(name))")
    .eq("id", sessionId)
    .maybeSingle();
  if (sessErr) throw sessErr;
  if (!session) throw Object.assign(new Error("Session not found"), { status: 404 });

  const { data: enrollments, error: enrollErr } = await supabase
    .from("batch_enrollments")
    .select("student_id, students(id, name, admission_number)")
    .eq("batch_id", session.batch_id);
  if (enrollErr) throw enrollErr;

  const studentIds = (enrollments || []).map((e) => e.student_id);
  let recordMap = {};
  if (studentIds.length > 0) {
    const { data: records, error: recErr } = await supabase
      .from("attendance_records")
      .select("*")
      .eq("session_id", sessionId)
      .in("student_id", studentIds);
    if (recErr) throw recErr;
    (records || []).forEach((r) => { recordMap[r.student_id] = r; });
  }

  const roster = (enrollments || []).map((e) => {
    const s = e.students;
    const r = recordMap[e.student_id];
    return {
      studentId:        s.id,
      name:             s.name,
      roll:             s.admission_number,
      durationMinutes:  r?.duration_minutes ?? null,
      automaticPct:     r?.automatic_pct ?? null,
      automaticStatus:  r?.automatic_status ?? null,
      finalPct:         r?.final_pct ?? null,
      finalStatus:      effectiveStatus(r),
      wasOverridden:    r?.was_overridden ?? false,
      overrideReason:   r?.override_reason ?? null,
      overrideAt:       r?.override_at ?? null,
      markedAt:         r?.marked_at ?? null,
    };
  });

  return {
    session: {
      id:                      session.id,
      batchId:                 session.batch_id,
      batchName:               session.batches?.name ?? null,
      date:                    session.date,
      source:                  session.source || "OFFLINE",
      syncStatus:              session.sync_status,
      lastSyncedAt:            session.last_synced_at,
      syncError:               session.sync_error,
      onlineClassId:           session.online_class_id,
      onlineClassTitle:        session.online_classes?.title ?? null,
      subjectName:             session.online_classes?.subjects?.name ?? null,
      unmatchedParticipants:   session.unmatched_participants || [],
    },
    counts: {
      present: roster.filter((r) => r.finalStatus === "present").length,
      partial: roster.filter((r) => r.finalStatus === "partial").length,
      absent:  roster.filter((r) => r.finalStatus === "absent").length,
    },
    roster,
  };
}

/**
 * Admin override — lets a human correct an automatically-calculated Meet
 * result (or a QR-based one) without destroying the original calculation:
 * automatic_pct/automatic_status are left untouched forever; only
 * final_status/final_pct (and the legacy `present` boolean every existing
 * aggregate reads) change, plus a full audit trail of who/when/why.
 */
async function overrideAttendanceRecord(sessionId, studentId, { status, reason }, adminUserId) {
  if (!["present", "partial", "absent"].includes(status)) {
    throw Object.assign(new Error("status must be present, partial, or absent"), { status: 400 });
  }

  const { data: session, error: sessErr } = await supabase
    .from("attendance_sessions")
    .select("id")
    .eq("id", sessionId)
    .maybeSingle();
  if (sessErr) throw sessErr;
  if (!session) throw Object.assign(new Error("Session not found"), { status: 404 });

  const { data: existing, error: findErr } = await supabase
    .from("attendance_records")
    .select("*")
    .eq("session_id", sessionId)
    .eq("student_id", studentId)
    .maybeSingle();
  if (findErr) throw findErr;

  const now = new Date().toISOString();
  const patch = {
    session_id: sessionId,
    student_id: studentId,
    present: status === "present",
    status,
    final_status: status,
    final_pct: existing?.automatic_pct ?? existing?.final_pct ?? (status === "present" ? 100 : 0),
    was_overridden: true,
    override_by: adminUserId,
    override_reason: reason || null,
    override_at: now,
    marked_at: existing?.marked_at || now,
  };

  const { error } = await supabase
    .from("attendance_records")
    .upsert(patch, { onConflict: "session_id,student_id" });
  if (error) throw error;

  return getSessionAttendanceDetail(sessionId);
}

/**
 * Assigns a Google Meet participant Google couldn't confidently match to
 * any LMS student. This does two things: (1) applies that participant's
 * measured minutes to the chosen student's attendance_records row for THIS
 * session, and (2) — when the participant had a real Google identity, not
 * an anonymous join — links it on students.google_user_id so future classes
 * match them automatically without needing this manual step again.
 */
async function assignUnknownParticipant(sessionId, participantIndex, studentId, adminUserId) {
  const { data: session, error: sessErr } = await supabase
    .from("attendance_sessions")
    .select("id, unmatched_participants")
    .eq("id", sessionId)
    .maybeSingle();
  if (sessErr) throw sessErr;
  if (!session) throw Object.assign(new Error("Session not found"), { status: 404 });

  const unmatched = session.unmatched_participants || [];
  const participant = unmatched[participantIndex];
  if (!participant) throw Object.assign(new Error("Unmatched participant not found"), { status: 404 });

  const { data: student, error: stuErr } = await supabase
    .from("students")
    .select("id")
    .eq("id", studentId)
    .maybeSingle();
  if (stuErr) throw stuErr;
  if (!student) throw Object.assign(new Error("Student not found"), { status: 404 });

  if (participant.googleUserId) {
    const { data: conflict, error: conflictErr } = await supabase
      .from("students")
      .select("id")
      .eq("google_user_id", participant.googleUserId)
      .neq("id", studentId)
      .maybeSingle();
    if (conflictErr) throw conflictErr;
    if (!conflict) {
      await supabase
        .from("students")
        .update({
          google_user_id: participant.googleUserId,
          google_identity_linked_at: new Date().toISOString(),
        })
        .eq("id", studentId);
    }
  }

  const now = new Date().toISOString();
  const { error: upsertErr } = await supabase.from("attendance_records").upsert(
    {
      session_id: sessionId,
      student_id: studentId,
      present: true,
      status: "present",
      duration_minutes: participant.minutes,
      automatic_pct: null,
      automatic_status: null,
      final_status: "present",
      final_pct: null,
      was_overridden: true,
      override_by: adminUserId,
      override_reason: `Manually assigned from unmatched Google Meet participant "${participant.displayName}"`,
      override_at: now,
      marked_at: now,
      synced_at: now,
    },
    { onConflict: "session_id,student_id" }
  );
  if (upsertErr) throw upsertErr;

  const remaining = unmatched.filter((_, i) => i !== Number(participantIndex));
  await supabase.from("attendance_sessions").update({ unmatched_participants: remaining }).eq("id", sessionId);

  return getSessionAttendanceDetail(sessionId);
}

/** Dismisses an unmatched participant without assigning them (e.g. a genuine guest/visitor). */
async function ignoreUnknownParticipant(sessionId, participantIndex) {
  const { data: session, error: sessErr } = await supabase
    .from("attendance_sessions")
    .select("id, unmatched_participants")
    .eq("id", sessionId)
    .maybeSingle();
  if (sessErr) throw sessErr;
  if (!session) throw Object.assign(new Error("Session not found"), { status: 404 });

  const remaining = (session.unmatched_participants || []).filter((_, i) => i !== Number(participantIndex));
  const { error } = await supabase.from("attendance_sessions").update({ unmatched_participants: remaining }).eq("id", sessionId);
  if (error) throw error;

  return getSessionAttendanceDetail(sessionId);
}

/** Bookkeeping-only flag — admin has looked over a session's sync result / unmatched list. */
async function markSessionReviewed(sessionId) {
  const { error } = await supabase
    .from("attendance_sessions")
    .update({ sync_status: "MANUALLY_REVIEWED" })
    .eq("id", sessionId);
  if (error) throw error;
  return getSessionAttendanceDetail(sessionId);
}

// ─── Logged-in student's own attendance ───────────────────────────────────────

/** Resolve a students row from the Supabase auth user id (JWT sub). */
async function getStudentByAuthUserId(authUserId) {
  const { data: student, error } = await supabase
    .from("students")
    .select("id, name, admission_number, class_grade")
    .eq("auth_user_id", authUserId)
    .maybeSingle();

  if (error) throw error;
  if (!student) throw Object.assign(new Error("Student profile not found"), { status: 404 });
  return student;
}

/** All batch ids the student is currently enrolled in. */
async function getStudentBatchIds(studentId) {
  const { data, error } = await supabase
    .from("batch_enrollments")
    .select("batch_id")
    .eq("student_id", studentId);

  if (error) throw error;
  return (data || []).map((e) => e.batch_id);
}

/**
 * GET /me — overall attendance summary across all of the student's batches.
 */
async function getMyAttendanceSummary(authUserId) {
  const student = await getStudentByAuthUserId(authUserId);
  const batchIds = await getStudentBatchIds(student.id);

  if (batchIds.length === 0) {
    return { totalSessions: 0, presentCount: 0, absentCount: 0, attendancePct: null };
  }

  const { data: sessions, error: sessErr } = await supabase
    .from("attendance_sessions")
    .select("id")
    .in("batch_id", batchIds);

  if (sessErr) throw sessErr;

  const totalSessions = sessions?.length || 0;
  const sessionIds = (sessions || []).map((s) => s.id);

  let presentCount = 0;
  if (sessionIds.length > 0) {
    const { data: records, error: recErr } = await supabase
      .from("attendance_records")
      .select("id")
      .eq("student_id", student.id)
      .in("session_id", sessionIds)
      .eq("present", true);

    if (recErr) throw recErr;
    presentCount = records?.length || 0;
  }

  return {
    totalSessions,
    presentCount,
    absentCount: totalSessions - presentCount,
    attendancePct: totalSessions > 0 ? Math.round((presentCount / totalSessions) * 100) : null,
  };
}

/**
 * GET /me/history — session-by-session history, newest first.
 * Absent = no attendance_records row for that session (same convention
 * used everywhere else in this file). Online-class sessions additionally
 * carry duration/percentage/tri-state status and a `source` label.
 */
async function getMyAttendanceHistory(authUserId, limit = 50) {
  const student = await getStudentByAuthUserId(authUserId);
  const batchIds = await getStudentBatchIds(student.id);

  if (batchIds.length === 0) return [];

  const { data: sessions, error: sessErr } = await supabase
    .from("attendance_sessions")
    .select("id, date, source, batches(name, delivery_type, start_time), online_classes(title)")
    .in("batch_id", batchIds)
    .order("date", { ascending: false })
    .limit(limit);

  if (sessErr) throw sessErr;
  if (!sessions || sessions.length === 0) return [];

  const sessionIds = sessions.map((s) => s.id);

  const { data: records, error: recErr } = await supabase
    .from("attendance_records")
    .select("session_id, present, marked_at, final_status, final_pct, duration_minutes")
    .eq("student_id", student.id)
    .in("session_id", sessionIds);

  if (recErr) throw recErr;

  const recordMap = {};
  (records || []).forEach((r) => {
    recordMap[r.session_id] = r;
  });

  return sessions.map((s) => {
    const record = recordMap[s.id];
    const present = record?.present === true;

    let time = null;
    if (record?.marked_at) {
      time = new Date(record.marked_at).toLocaleTimeString("en-IN", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      });
    } else if (s.batches?.start_time) {
      time = String(s.batches.start_time).slice(0, 5); // "14:30:00" → "14:30"
    }

    return {
      id:        s.id,
      date:      s.date,
      time,
      status:    present ? "present" : "absent",
      type:      s.batches?.delivery_type || "offline",
      batchName: s.batches?.name || null,
      source:    s.source || "OFFLINE",
      classTitle: s.online_classes?.title || null,
      attendanceStatus: effectiveStatus(record),
      attendancePct:    record?.final_pct ?? null,
      durationMinutes:  record?.duration_minutes ?? null,
    };
  });
}

/**
 * GET /me/month — calendar view for a given month.
 * Returns one entry per session date that fell in that month, with
 * present/absent status. Days with no entry = no class scheduled.
 */
async function getMyMonthAttendance(authUserId, year, month) {
  const student = await getStudentByAuthUserId(authUserId);
  const batchIds = await getStudentBatchIds(student.id);

  if (batchIds.length === 0) {
    return { days: [], totalSessions: 0, presentCount: 0, attendancePct: null };
  }

  const monthStr = String(month).padStart(2, "0");
  const startDate = `${year}-${monthStr}-01`;
  const lastDay = new Date(year, month, 0).getDate(); // last day of that month
  const endDate = `${year}-${monthStr}-${String(lastDay).padStart(2, "0")}`;

  const { data: sessions, error: sessErr } = await supabase
    .from("attendance_sessions")
    .select("id, date")
    .in("batch_id", batchIds)
    .gte("date", startDate)
    .lte("date", endDate)
    .order("date", { ascending: true });

  if (sessErr) throw sessErr;
  if (!sessions || sessions.length === 0) {
    return { days: [], totalSessions: 0, presentCount: 0, attendancePct: null };
  }

  const sessionIds = sessions.map((s) => s.id);

  const { data: records, error: recErr } = await supabase
    .from("attendance_records")
    .select("session_id, present")
    .eq("student_id", student.id)
    .in("session_id", sessionIds);

  if (recErr) throw recErr;

  const recordMap = {};
  (records || []).forEach((r) => {
    recordMap[r.session_id] = r.present;
  });

  const days = sessions.map((s) => ({
    date:   s.date,
    day:    dayFromDateString(s.date),
    status: recordMap[s.id] === true ? "present" : "absent",
  }));

  const presentCount = days.filter((d) => d.status === "present").length;

  return {
    days,
    totalSessions: days.length,
    presentCount,
    attendancePct: days.length > 0 ? Math.round((presentCount / days.length) * 100) : null,
  };
}

/**
 * GET /me/schedule/today — batches the student is enrolled in that are
 * scheduled for today (based on the batch's `days` field), with a join
 * link for ONLINE/HYBRID batches and a location for OFFLINE ones. Also
 * flags whether a live QR session already exists for today so the
 * frontend can show "scan now" vs "not started yet".
 */
async function getMyTodaySchedule(authUserId) {
  const student = await getStudentByAuthUserId(authUserId);
  const batchIds = await getStudentBatchIds(student.id);

  if (batchIds.length === 0) return { classes: [] };

  const { data: batches, error } = await supabase
    .from("batches")
    .select("id, name, days, start_time, end_time, delivery_type, meet_link, location")
    .in("id", batchIds);

  if (error) throw error;

  const todayStr = todayDateString();
  const { data: sessions, error: sessErr } = await supabase
    .from("attendance_sessions")
    .select("batch_id")
    .in("batch_id", batchIds)
    .eq("date", todayStr);

  if (sessErr) throw sessErr;
  const liveBatchIds = new Set((sessions || []).map((s) => s.batch_id));

  const classes = (batches || [])
    .filter((b) => isBatchDayToday(b.days))
    .map((b) => ({
      batchId:      b.id,
      batchName:    b.name,
      startTime:    b.start_time,
      endTime:      b.end_time,
      deliveryType: (b.delivery_type || "OFFLINE").toLowerCase(),
      meetLink:     b.meet_link || null,
      location:     b.location || null,
      sessionLive:  liveBatchIds.has(b.id),
    }));

  return { classes };
}

/**
 * Bulk attendance-% lookup for a list of student ids, in a fixed small
 * number of queries (no N+1) — used by the admin Students list so its
 * "Attendance" column shows a real, database-backed percentage instead of
 * a placeholder. Returns { [studentId]: number | null }; null means the
 * student isn't enrolled in any batch with sessions yet.
 */
async function getAttendancePercentagesForStudents(studentIds) {
  const result = {};
  if (!studentIds || studentIds.length === 0) return result;
  studentIds.forEach((id) => { result[id] = null; });

  const { data: enrollments, error: enrollErr } = await supabase
    .from("batch_enrollments")
    .select("student_id, batch_id")
    .in("student_id", studentIds);
  if (enrollErr) throw enrollErr;
  if (!enrollments || enrollments.length === 0) return result;

  const batchIdsByStudent = {};
  const allBatchIds = new Set();
  enrollments.forEach((e) => {
    if (!batchIdsByStudent[e.student_id]) batchIdsByStudent[e.student_id] = [];
    batchIdsByStudent[e.student_id].push(e.batch_id);
    allBatchIds.add(e.batch_id);
  });

  const { data: sessions, error: sessErr } = await supabase
    .from("attendance_sessions")
    .select("id, batch_id")
    .in("batch_id", Array.from(allBatchIds));
  if (sessErr) throw sessErr;

  const sessionIdsByBatch = {};
  const allSessionIds = [];
  (sessions || []).forEach((s) => {
    if (!sessionIdsByBatch[s.batch_id]) sessionIdsByBatch[s.batch_id] = [];
    sessionIdsByBatch[s.batch_id].push(s.id);
    allSessionIds.push(s.id);
  });
  if (allSessionIds.length === 0) return result;

  const { data: records, error: recErr } = await supabase
    .from("attendance_records")
    .select("student_id, session_id, present")
    .in("student_id", studentIds)
    .in("session_id", allSessionIds)
    .eq("present", true);
  if (recErr) throw recErr;

  const presentCountByStudent = {};
  (records || []).forEach((r) => {
    presentCountByStudent[r.student_id] = (presentCountByStudent[r.student_id] || 0) + 1;
  });

  studentIds.forEach((id) => {
    const batchIds = batchIdsByStudent[id] || [];
    const totalSessions = batchIds.reduce((sum, bId) => sum + (sessionIdsByBatch[bId]?.length || 0), 0);
    if (totalSessions > 0) {
      const presentCount = presentCountByStudent[id] || 0;
      result[id] = Math.round((presentCount / totalSessions) * 100);
    }
  });

  return result;
}

// ─── Admin: per-student & per-batch attendance reports ────────────────────────

/**
 * GET /students/:studentId/report — full attendance history + summary for
 * ONE student, across every batch they're enrolled in. Used by the admin
 * Students → Attendance → [batch] → [student] → "Report" view/download.
 */
async function getStudentAttendanceReport(studentId) {
  const { data: student, error: stuErr } = await supabase
    .from("students")
    .select("id, name, admission_number, class_grade, preferred_batch")
    .eq("id", studentId)
    .maybeSingle();

  if (stuErr) throw stuErr;
  if (!student) throw Object.assign(new Error("Student not found"), { status: 404 });

  const batchIds = await getStudentBatchIds(studentId);

  let records = [];
  if (batchIds.length > 0) {
    const { data: sessions, error: sessErr } = await supabase
      .from("attendance_sessions")
      .select("id, date, source, batches(name, delivery_type, start_time), online_classes(title)")
      .in("batch_id", batchIds)
      .order("date", { ascending: false });

    if (sessErr) throw sessErr;

    const sessionIds = (sessions || []).map((s) => s.id);

    let recordMap = {};
    if (sessionIds.length > 0) {
      const { data: attRecords, error: recErr } = await supabase
        .from("attendance_records")
        .select("session_id, present, marked_at, final_status, final_pct, duration_minutes, was_overridden")
        .eq("student_id", studentId)
        .in("session_id", sessionIds);

      if (recErr) throw recErr;
      (attRecords || []).forEach((r) => { recordMap[r.session_id] = r; });
    }

    records = (sessions || []).map((s) => {
      const rec = recordMap[s.id];
      const present = rec?.present === true;

      let time = null;
      if (rec?.marked_at) {
        time = new Date(rec.marked_at).toLocaleTimeString("en-IN", {
          hour: "2-digit", minute: "2-digit", hour12: false,
        });
      } else if (s.batches?.start_time) {
        time = String(s.batches.start_time).slice(0, 5);
      }

      return {
        date:         s.date,
        batchName:    s.batches?.name || null,
        deliveryType: s.batches?.delivery_type || null,
        status:       present ? "present" : "absent",
        time,
        source:           s.source || "OFFLINE",
        classTitle:       s.online_classes?.title || null,
        attendanceStatus: effectiveStatus(rec),
        attendancePct:    rec?.final_pct ?? null,
        durationMinutes:  rec?.duration_minutes ?? null,
        wasOverridden:    rec?.was_overridden ?? false,
      };
    });
  }

  const totalSessions = records.length;
  const presentCount = records.filter((r) => r.status === "present").length;
  const absentCount = totalSessions - presentCount;

  return {
    student: {
      id:    student.id,
      name:  student.name,
      roll:  student.admission_number,
      grade: student.class_grade,
      batch: student.preferred_batch,
    },
    totalSessions,
    presentCount,
    absentCount,
    attendancePct: totalSessions > 0 ? Math.round((presentCount / totalSessions) * 100) : null,
    records,
  };
}

/**
 * GET /me/report — a student's OWN full attendance report (self-service
 * download, no PDF/CSV route previously existed for students). The student
 * id is resolved server-side from the verified JWT (authUserId), never from
 * client input, so this can only ever return the caller's own data — it
 * intentionally reuses getStudentAttendanceReport() rather than trusting a
 * studentId supplied by the request.
 */
async function getMyAttendanceReport(authUserId) {
  const student = await getStudentByAuthUserId(authUserId);
  return getStudentAttendanceReport(student.id);
}

/**
 * GET /batches/:batchId/report — full statistics for ONE batch: per-student
 * present/absent totals, and a day-by-day breakdown across every session
 * ever held for that batch. Used by the admin's "View batch statistics".
 */
async function getBatchAttendanceReport(batchId) {
  await assertBatchExists(batchId);

  const { data: batch, error: batchErr } = await supabase
    .from("batches")
    .select("id, name, delivery_type, days, start_time, end_time")
    .eq("id", batchId)
    .single();
  if (batchErr) throw batchErr;

  const { data: enrollments, error: enrollErr } = await supabase
    .from("batch_enrollments")
    .select("student_id, students(id, name, admission_number)")
    .eq("batch_id", batchId);
  if (enrollErr) throw enrollErr;
  const students = enrollments || [];

  const { data: sessions, error: sessErr } = await supabase
    .from("attendance_sessions")
    .select("id, date, source, sync_status, online_classes(title)")
    .eq("batch_id", batchId)
    .order("date", { ascending: true });
  if (sessErr) throw sessErr;

  const sessionIds = (sessions || []).map((s) => s.id);

  let allRecords = [];
  if (sessionIds.length > 0) {
    const { data: recs, error: recErr } = await supabase
      .from("attendance_records")
      .select("session_id, student_id, present, final_status")
      .in("session_id", sessionIds);
    if (recErr) throw recErr;
    allRecords = recs || [];
  }

  // recordsBySession[sessionId] = Map(studentId -> record)
  const recordsBySession = {};
  allRecords.forEach((r) => {
    if (!recordsBySession[r.session_id]) recordsBySession[r.session_id] = new Map();
    recordsBySession[r.session_id].set(r.student_id, r);
  });

  const totalSessions = sessions?.length || 0;
  const totalStudents = students.length;

  // Per-student totals — presentCount/absentCount stay boolean-based
  // (unchanged existing semantics); partialCount is a new, additive figure.
  const studentStats = students.map((e) => {
    const s = e.students;
    let presentCount = 0;
    let partialCount = 0;
    (sessions || []).forEach((sess) => {
      const rec = recordsBySession[sess.id]?.get(e.student_id);
      if (rec?.present) presentCount++;
      else if (effectiveStatus(rec) === "partial") partialCount++;
    });
    return {
      studentId:      s.id,
      name:           s.name,
      roll:           s.admission_number,
      presentCount,
      partialCount,
      absentCount:    totalSessions - presentCount - partialCount,
      totalSessions,
      attendancePct:  totalSessions > 0 ? Math.round((presentCount / totalSessions) * 100) : null,
    };
  });

  // Per-day breakdown, now tri-state and source-aware.
  const dailyBreakdown = (sessions || []).map((sess) => {
    const recordsForSession = recordsBySession[sess.id] || new Map();
    let presentCount = 0;
    let partialCount = 0;
    recordsForSession.forEach((rec) => {
      const status = effectiveStatus(rec);
      if (status === "present") presentCount++;
      else if (status === "partial") partialCount++;
    });
    return {
      sessionId:      sess.id,
      date:           sess.date,
      source:         sess.source || "OFFLINE",
      classTitle:     sess.online_classes?.title || null,
      syncStatus:     sess.sync_status || null,
      presentCount,
      partialCount,
      absentCount:    totalStudents - presentCount - partialCount,
      totalStudents,
      attendancePct:  totalStudents > 0 ? Math.round((presentCount / totalStudents) * 100) : null,
    };
  });

  return {
    batch: {
      id:        batch.id,
      name:      batch.name,
      mode:      batch.delivery_type ? batch.delivery_type.toLowerCase() : null,
      days:      batch.days,
      startTime: batch.start_time,
      endTime:   batch.end_time,
    },
    totalStudents,
    totalSessions,
    studentStats,
    dailyBreakdown,
  };
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
  getTodayRoster,
  getBatchSummary,
  setStudentOverride,
  startSession,
  refreshSession,
  getRoster,
  manualMark,
  scanQrToken,
  getOrCreateSessionForOnlineClass,
  detachSessionFromOnlineClass,
  getSessionByOnlineClassId,
  updateSessionSyncStatus,
  getSessionAttendanceDetail,
  overrideAttendanceRecord,
  assignUnknownParticipant,
  ignoreUnknownParticipant,
  markSessionReviewed,
  getMyAttendanceSummary,
  getMyAttendanceHistory,
  getMyMonthAttendance,
  getMyTodaySchedule,
  getStudentAttendanceReport,
  getMyAttendanceReport,
  getAttendancePercentagesForStudents,
  getBatchAttendanceReport,
  getStudentTrend,
};
