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
const audienceService = require("./audience.service");
const { applyActiveStudentFilter, hasGraduated, todayInTz } = require("../utils/graduation");

// "All Students" is a virtual target, never a row in `batches`. Wherever a
// batch id can be supplied, the sentinel "ALL" means "every active student,
// resolved at the time of use" (see audience.service.js). Sessions for it
// are stored with audience = 'ALL' and batch_id = NULL.
const ALL_ID = audienceService.ALL_STUDENTS_TOKEN;
const isAll = (batchId) => batchId === ALL_ID;

/** PostgREST or() filter: the sessions a student can see — their batches plus every All Students session. */
function sessionScopeFilter(batchIds) {
  const parts = ["audience.eq.ALL"];
  if (batchIds && batchIds.length > 0) parts.push(`batch_id.in.(${batchIds.join(",")})`);
  return parts.join(",");
}

/** Sessions that count toward a batch: its own plus every All Students session (or only the latter for ALL). */
function applyBatchSessionScope(query, batchId) {
  return isAll(batchId) ? query.eq("audience", "ALL") : query.or(`batch_id.eq.${batchId},audience.eq.ALL`);
}

/**
 * Active students on a roster: for a batch, its enrolled students (minus
 * anyone graduated/archived); for All Students, every active student. Each
 * student appears once however many batches they are in.
 */
async function getRosterStudents(batchId) {
  const cols = "id, name, admission_number";
  if (isAll(batchId)) {
    const rows = await audienceService.getActiveStudents(cols);
    return rows.sort((a, b) => a.name.localeCompare(b.name));
  }
  const { data, error } = await supabase
    .from("batch_enrollments")
    .select("student_id, students(id, name, admission_number, status, is_alumni, graduation_date)")
    .eq("batch_id", batchId);
  if (error) throw error;
  const today = todayInTz();
  const map = new Map();
  (data || []).forEach((e) => {
    if (e.students && !hasGraduated(e.students, today) && !map.has(e.students.id)) map.set(e.students.id, e.students);
  });
  return [...map.values()];
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Generate a cryptographically random QR token */
function generateQrToken() {
  return crypto.randomBytes(32).toString("hex");
}

/** ISO timestamp N seconds from now */
function expiresFromNow(seconds) {
  return new Date(Date.now() + seconds * 1000).toISOString();
}

/** "YYYY-MM-DD" for today in the institution's timezone (the server itself runs in UTC). */
function todayDateString() {
  return todayInTz();
}

/** Pull the day-of-month out of a "YYYY-MM-DD" string without any Date/timezone drift */
function dayFromDateString(dateStr) {
  const parts = dateStr.split("-");
  return parseInt(parts[2], 10);
}

const DEFAULT_REFRESH_INTERVAL = 45; // seconds — long enough to absorb real scan/network latency (camera focus,
// upload, server round-trip commonly eats 5-15s) while still rotating often enough that a photographed QR shared
// with an absent friend is stale well before they could use it.
const QR_EXPIRY_GRACE_SECONDS = 8; // absorbs clock skew between client/server and the last few seconds of network
// latency on a scan that was captured right at rotation; small enough to not meaningfully weaken the anti-sharing rotation.

// ─── QR tokens ───────────────────────────────────────────────────────────────
// The QR shown on the admin screen is "OCTET-ATT.<sessionId>.<window>.<sig>",
// where <window> is the current refresh window (floor(now / interval)) and
// <sig> is an HMAC of the two. Because the token is derived from the clock
// rather than stored-and-replaced, every admin tab/projector showing the same
// session displays the same code, and a code captured just before rotation is
// still accepted for one more window instead of failing as "expired".
//
// Whether the session is still OPEN is tracked separately in
// attendance_sessions.expires_at, which acts as a lease: the admin screen
// renews it on every refresh, and "End session" sets it to the past.

const QR_PREFIX = "OCTET-ATT";
const SESSION_LEASE_WINDOWS = 3; // admin screen may miss up to two refreshes (sleeping laptop, flaky Wi-Fi) before scans stop

function qrSecret() {
  return process.env.ATTENDANCE_QR_SECRET || process.env.WATERMARK_SECRET || process.env.GOOGLE_OAUTH_STATE_SECRET || null;
}

function qrSignature(sessionId, windowIndex) {
  return crypto
    .createHmac("sha256", qrSecret())
    .update(`attendance-qr:${sessionId}:${windowIndex}`)
    .digest("base64url")
    .slice(0, 22);
}

function currentQrWindow(intervalSeconds, at = Date.now()) {
  return Math.floor(at / (intervalSeconds * 1000));
}

/** The QR payload for this session right now, plus when it rotates. */
function currentQrToken(sessionId, intervalSeconds) {
  const windowIndex = currentQrWindow(intervalSeconds);
  const rotatesAt = new Date((windowIndex + 1) * intervalSeconds * 1000).toISOString();
  if (!qrSecret()) {
    // No signing secret configured: fall back to a random token stored on the row.
    return { qrToken: generateQrToken(), rotatesAt, signed: false };
  }
  return { qrToken: `${QR_PREFIX}.${sessionId}.${windowIndex}.${qrSignature(sessionId, windowIndex)}`, rotatesAt, signed: true };
}

/** Returns { sessionId, windowIndex } for a well-formed, correctly signed token, else null. */
function parseSignedQrToken(token) {
  if (typeof token !== "string" || !qrSecret()) return null;
  const parts = token.trim().split(".");
  if (parts.length !== 4 || parts[0] !== QR_PREFIX) return null;
  const [, sessionId, windowStr, sig] = parts;
  if (!/^[0-9a-f-]{36}$/i.test(sessionId) || !/^\d+$/.test(windowStr)) return null;
  const windowIndex = Number(windowStr);
  const expected = Buffer.from(qrSignature(sessionId, windowIndex));
  const given = Buffer.from(sig);
  if (expected.length !== given.length || !crypto.timingSafeEqual(expected, given)) return null;
  return { sessionId, windowIndex };
}

function sessionLeaseExpiry(intervalSeconds) {
  return expiresFromNow(intervalSeconds * SESSION_LEASE_WINDOWS);
}

/** A QR session is open while its lease (expires_at) has not run out. */
function isSessionOpen(session) {
  return !!session?.expires_at && new Date(session.expires_at).getTime() + QR_EXPIRY_GRACE_SECONDS * 1000 >= Date.now();
}

// ─── Which sessions count toward attendance percentages ─────────────────────
// A session only counts once attendance has actually been taken for it:
//   - never a future-dated session (online classes create theirs up front);
//   - a Google Meet session only after its attendance sync has run (or once
//     it has any attendance rows, e.g. a QR session that a class later adopted).
// Otherwise every student would be "absent" from classes that haven't happened
// or were never measured, dragging every percentage towards zero.
const MEASURED_MEET_STATUSES = new Set(["SYNCED", "MANUALLY_REVIEWED"]);
const COUNTABLE_SESSION_COLS = "date, source, sync_status";

async function filterCountableSessions(sessions) {
  const today = todayDateString();
  const held = (sessions || []).filter((s) => !s.date || s.date <= today);
  const unmeasured = held.filter((s) => s.source === "GOOGLE_MEET" && !MEASURED_MEET_STATUSES.has(s.sync_status));
  if (unmeasured.length === 0) return held;
  const { data, error } = await supabase
    .from("attendance_records")
    .select("session_id")
    .in("session_id", unmeasured.map((s) => s.id));
  if (error) throw error;
  const withRecords = new Set((data || []).map((r) => r.session_id));
  const skip = new Set(unmeasured.filter((s) => !withRecords.has(s.id)).map((s) => s.id));
  return held.filter((s) => !skip.has(s.id));
}

const WEEKDAY_ABBR = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/** True if a batch's `days` field (e.g. "Tue/Thu/Sat") includes today's weekday (institution timezone). */
function isBatchDayToday(daysStr) {
  if (!daysStr) return false;
  const [y, m, d] = todayInTz().split("-").map(Number);
  const today = WEEKDAY_ABBR[new Date(Date.UTC(y, m - 1, d)).getUTCDay()];
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

  // "All Students" is a virtual target (see ALL_ID above), never a real
  // batch — a batch actually named/id'd that way would show up as a
  // duplicate, confusing entry alongside the real sentinel in every batch
  // picker. Block it here so it can't happen again.
  if (isAll(batchId) || /^all\s*students?$/i.test(name.trim())) {
    throw Object.assign(
      new Error('"All Students" is a built-in option, not a batch — choose a different name'),
      { status: 400 }
    );
  }

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
  if (isAll(batchId)) return; // virtual target — always exists
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

  // 1. Active students on this roster (graduated/archived students excluded)
  const rosterStudents = await getRosterStudents(batchId);
  const enrollments = rosterStudents.map((s) => ({ student_id: s.id, students: s }));
  if (enrollments.length === 0) return [];

  const studentIds = enrollments.map((e) => e.student_id);

  // 2. All sessions that count for this batch (its own + All Students sessions)
  const { data: rawSessions, error: sessErr } = await applyBatchSessionScope(
    supabase.from("attendance_sessions").select(`id, ${COUNTABLE_SESSION_COLS}`),
    batchId
  );

  if (sessErr) throw sessErr;
  const sessions = await filterCountableSessions(rawSessions);

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

  // 4. Manual overrides (per real batch; All Students has none)
  let overrides = [];
  if (!isAll(batchId)) {
    const ovRes = await supabase
      .from("attendance_overrides")
      .select("student_id, unblocked")
      .eq("batch_id", batchId)
      .in("student_id", studentIds);
    if (ovRes.error) throw ovRes.error;
    overrides = ovRes.data;
  }

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
  if (isAll(batchId)) return []; // nobody is "added" to All Students — it always includes everyone active

  // Already enrolled in THIS batch
  const { data: enrolled, error: enrErr } = await supabase
    .from("batch_enrollments")
    .select("student_id")
    .eq("batch_id", batchId);

  if (enrErr) throw enrErr;

  const enrolledIds = (enrolled || []).map((e) => e.student_id);

  // All approved students not already in this batch — pending/rejected
  // applicants are never real candidates for a live class roster.
  let query = applyActiveStudentFilter(supabase
    .from("students")
    .select("id, name, admission_number"));

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
  if (isAll(batchId)) {
    throw Object.assign(new Error("All Students is not a batch — it always includes every active student"), { status: 400 });
  }
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

  let sessionQuery = supabase
    .from("attendance_sessions")
    .select("id, date, qr_token, expires_at, refresh_interval_seconds, created_at, source")
    .eq("date", todayStr);
  sessionQuery = isAll(batchId) ? sessionQuery.eq("audience", "ALL") : sessionQuery.eq("batch_id", batchId);
  const { data: session, error: sessErr } = await sessionQuery.maybeSingle();

  if (sessErr) throw sessErr;

  const students = (await getRosterStudents(batchId)).map((s) => ({ student_id: s.id, students: s }));

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
          live:                    isSessionOpen(session),
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

  const rosterStudents = await getRosterStudents(batchId);
  const rosterIds = new Set(rosterStudents.map((s) => s.id));
  const totalStudents = rosterStudents.length;

  const { data: allBatchSessions, error: sessErr } = await applyBatchSessionScope(
    supabase.from("attendance_sessions").select(`id, ${COUNTABLE_SESSION_COLS}`),
    batchId
  ).order("date", { ascending: false });

  if (sessErr) throw sessErr;
  const sessions = await filterCountableSessions(allBatchSessions);

  const totalSessions = sessions?.length || 0;
  const sessionIds = (sessions || []).map((s) => s.id);

  let avgAttendancePct = null;
  if (totalSessions > 0 && totalStudents > 0 && sessionIds.length > 0) {
    const { data: records, error: recErr } = await supabase
      .from("attendance_records")
      .select("student_id")
      .in("session_id", sessionIds)
      .eq("present", true);

    if (recErr) throw recErr;

    // Only this roster's students count (an All Students session also has records from other batches' students).
    const totalPresentMarks = (records || []).filter((r) => rosterIds.has(r.student_id)).length;
    avgAttendancePct = Math.round((totalPresentMarks / (totalStudents * totalSessions)) * 100);
  }

  const todayStr = todayDateString();
  const todaySession = (allBatchSessions || []).find((s) => s.date === todayStr);

  let presentToday = 0;
  if (todaySession) {
    const { data: records, error: recErr } = await supabase
      .from("attendance_records")
      .select("student_id")
      .eq("session_id", todaySession.id)
      .eq("present", true);

    if (recErr) throw recErr;
    presentToday = (records || []).filter((r) => rosterIds.has(r.student_id)).length;
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

/**
 * Org-wide attendance snapshot across every batch at once — for the admin
 * dashboard. A fixed small number of queries regardless of how many
 * batches/sessions exist (same shape as getAttendancePercentagesForStudents
 * below), not one query per batch.
 */
async function getOrgAttendanceOverview() {
  const todayStr = todayDateString();

  const { data: enrollments, error: enrollErr } = await supabase
    .from("batch_enrollments")
    .select("batch_id");
  if (enrollErr) throw enrollErr;

  const enrollCountByBatch = {};
  (enrollments || []).forEach((e) => {
    enrollCountByBatch[e.batch_id] = (enrollCountByBatch[e.batch_id] || 0) + 1;
  });

  const { data: sessions, error: sessErr } = await supabase
    .from("attendance_sessions")
    .select("id, batch_id, audience, date");
  if (sessErr) throw sessErr;

  const allSessions = sessions || [];
  const activeCount = allSessions.some((s) => s.audience === "ALL")
    ? (await audienceService.getActiveStudents("id")).length
    : 0;
  const todaySessions = allSessions.filter((s) => s.date === todayStr);
  const sessionIds = allSessions.map((s) => s.id);

  let avgAttendancePct = null;
  if (sessionIds.length > 0) {
    const totalPossible = allSessions.reduce(
      (sum, s) => sum + (s.audience === "ALL" ? activeCount : (enrollCountByBatch[s.batch_id] || 0)),
      0
    );

    if (totalPossible > 0) {
      const { data: records, error: recErr } = await supabase
        .from("attendance_records")
        .select("id")
        .in("session_id", sessionIds)
        .eq("present", true);
      if (recErr) throw recErr;

      avgAttendancePct = Math.round(((records?.length || 0) / totalPossible) * 100);
    }
  }

  let presentTodayCount = 0;
  if (todaySessions.length > 0) {
    const { data: records, error: recErr } = await supabase
      .from("attendance_records")
      .select("id")
      .in("session_id", todaySessions.map((s) => s.id))
      .eq("present", true);
    if (recErr) throw recErr;
    presentTodayCount = records?.length || 0;
  }

  return {
    liveSessionsToday: todaySessions.length,
    presentTodayCount,
    avgAttendancePct,
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

/** Opens (or keeps open) a session's lease and returns the QR it should display right now. */
async function openSessionLease(session) {
  const interval = session.refresh_interval_seconds || DEFAULT_REFRESH_INTERVAL;
  const { qrToken, rotatesAt } = currentQrToken(session.id, interval);
  const { error } = await supabase
    .from("attendance_sessions")
    .update({ qr_token: qrToken, expires_at: sessionLeaseExpiry(interval) })
    .eq("id", session.id);
  if (error) throw error;
  return { qrToken, expiresAt: rotatesAt, refreshIntervalSeconds: interval };
}

async function countMarkedPresent(sessionId) {
  const { count, error } = await supabase
    .from("attendance_records")
    .select("student_id", { count: "exact", head: true })
    .eq("session_id", sessionId)
    .eq("present", true);
  if (error) throw error;
  return count || 0;
}

/**
 * POST /sessions — idempotent. There is one session per (batch, date), so
 * starting again the same day resumes that session (and re-opens it if it
 * was ended). `alreadyMarked` tells the admin screen how many students were
 * marked before this start, so a resumed session never looks like a bug.
 */
async function startSession(batchId, date) {
  await assertBatchExists(batchId);

  if (date !== todayDateString()) {
    throw Object.assign(new Error("A live QR session can only be started for today's date"), { status: 400 });
  }

  // Check existing (an All Students session is unique per date)
  let existingQuery = supabase.from("attendance_sessions").select("*").eq("date", date);
  existingQuery = isAll(batchId) ? existingQuery.eq("audience", "ALL") : existingQuery.eq("batch_id", batchId);
  const { data: existing, error: findErr } = await existingQuery.maybeSingle();

  if (findErr) throw findErr;
  if (existing) {
    const lease = await openSessionLease(existing);
    return {
      sessionId:     existing.id,
      ...lease,
      resumed:       true,
      alreadyMarked: await countMarkedPresent(existing.id),
      source:        existing.source || "OFFLINE",
    };
  }

  const { data, error } = await supabase
    .from("attendance_sessions")
    .insert({
      batch_id:                 isAll(batchId) ? null : batchId,
      audience:                 isAll(batchId) ? "ALL" : "BATCH",
      date,
      qr_token:                 generateQrToken(),
      expires_at:               sessionLeaseExpiry(DEFAULT_REFRESH_INTERVAL),
      refresh_interval_seconds: DEFAULT_REFRESH_INTERVAL,
    })
    .select("*")
    .single();

  if (error) throw error;

  const lease = await openSessionLease(data);
  return { sessionId: data.id, ...lease, resumed: false, alreadyMarked: 0, source: data.source || "OFFLINE" };
}

/**
 * POST /sessions/:sessionId/refresh — called by the admin screen at every
 * rotation: returns the current QR and renews the session's open lease.
 */
async function refreshSession(sessionId) {
  const { data: session, error: findErr } = await supabase
    .from("attendance_sessions")
    .select("id, refresh_interval_seconds, date")
    .eq("id", sessionId)
    .maybeSingle();

  if (findErr) throw findErr;
  if (!session) throw Object.assign(new Error("Session not found"), { status: 404 });
  if (session.date !== todayDateString()) {
    throw Object.assign(new Error("This session was for an earlier day and has closed"), { status: 410 });
  }

  return openSessionLease(session);
}

/** POST /sessions/:sessionId/end — closes the session so no further scans are accepted. */
async function endSession(sessionId) {
  const { data, error } = await supabase
    .from("attendance_sessions")
    .update({ expires_at: new Date(Date.now() - (QR_EXPIRY_GRACE_SECONDS + 1) * 1000).toISOString() })
    .eq("id", sessionId)
    .select("id")
    .maybeSingle();
  if (error) throw error;
  if (!data) throw Object.assign(new Error("Session not found"), { status: 404 });
  return { presentCount: await countMarkedPresent(sessionId) };
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
    .select("id, batch_id, audience, date, source")
    .eq("id", sessionId)
    .maybeSingle();

  if (sessErr) throw sessErr;
  if (!session) throw Object.assign(new Error("Session not found"), { status: 404 });

  const students = (await getRosterStudents(session.audience === "ALL" ? ALL_ID : session.batch_id)).map((s) => ({
    student_id: s.id,
    students: s,
  }));

  let recordMap = {};
  if (students.length > 0) {
    const studentIds = students.map((e) => e.student_id);
    const { data: records, error: recErr } = await supabase
      .from("attendance_records")
      .select("student_id, present, marked_at, final_status, duration_minutes, synced_at")
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
      // How the mark got there — lets the admin see when a row came from a Google Meet sync rather than a scan.
      markedVia: !record ? null : record.synced_at ? "GOOGLE_MEET" : "QR_OR_MANUAL",
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
      {
        session_id: sessionId,
        student_id: studentId,
        present,
        status: present ? "present" : "absent",
        final_status: present ? "present" : "absent",
        marked_at: new Date().toISOString(),
      },
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

  // 2. Resolve the session the QR belongs to
  const sessionCols = "id, batch_id, audience, expires_at, refresh_interval_seconds, date";
  const signed = parseSignedQrToken(qrToken);
  let session;
  if (signed) {
    const { data, error } = await supabase.from("attendance_sessions").select(sessionCols).eq("id", signed.sessionId).maybeSingle();
    if (error) throw error;
    session = data;
  } else {
    // Unsigned / legacy token: must match the one currently stored on the session.
    const { data, error } = await supabase.from("attendance_sessions").select(sessionCols).eq("qr_token", String(qrToken).trim()).maybeSingle();
    if (error) throw error;
    session = data;
  }
  if (!session) {
    throw Object.assign(new Error("This is not a valid attendance QR code. Scan the code shown on your teacher's screen."), { status: 400 });
  }

  // 3. The session must still be open, and the code must be the current or the previous one
  if (!isSessionOpen(session) || session.date !== todayDateString()) {
    throw Object.assign(new Error("This attendance session has ended. Ask your teacher to start it again."), { status: 400 });
  }
  if (signed) {
    const interval = session.refresh_interval_seconds || DEFAULT_REFRESH_INTERVAL;
    const validUntil = (signed.windowIndex + 2) * interval * 1000 + QR_EXPIRY_GRACE_SECONDS * 1000;
    const nowWindow = currentQrWindow(interval);
    if (Date.now() > validUntil || signed.windowIndex > nowWindow + 1) {
      throw Object.assign(new Error("This QR code has already refreshed. Scan the new code on the screen."), { status: 400 });
    }
  }

  // 4. Check enrollment — an All Students session admits every active student
  if (session.audience === "ALL") {
    const active = await audienceService.filterActiveStudentIds([student.id]);
    if (active.length === 0) throw Object.assign(new Error("Student is not active"), { status: 403 });
  } else {
    const { data: enrollment, error: enrErr } = await supabase
      .from("batch_enrollments")
      .select("student_id")
      .eq("batch_id", session.batch_id)
      .eq("student_id", student.id)
      .maybeSingle();

    if (enrErr) throw enrErr;
    if (!enrollment) {
      throw Object.assign(new Error("You are not enrolled in the batch this session is for."), { status: 403 });
    }
  }

  const { data: already } = await supabase
    .from("attendance_records")
    .select("present")
    .eq("session_id", session.id)
    .eq("student_id", student.id)
    .maybeSingle();
  if (already?.present === true) return { alreadyMarked: true };

  // 5. Mark present (upsert — idempotent if they scan twice)
  const { error: markErr } = await supabase
    .from("attendance_records")
    .upsert(
      {
        session_id: session.id,
        student_id: student.id,
        present: true,
        status: "present",
        final_status: "present",
        marked_at: new Date().toISOString(),
      },
      { onConflict: "session_id,student_id" }
    );

  if (markErr) throw markErr;
  return { alreadyMarked: false };
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
  // batchId null/"ALL" = an All Students class -> the single All Students session for that date.
  const forAll = !batchId || isAll(batchId);
  let findQuery = supabase.from("attendance_sessions").select("*").eq("date", date);
  findQuery = forAll ? findQuery.eq("audience", "ALL") : findQuery.eq("batch_id", batchId);
  const { data: existing, error: findErr } = await findQuery.maybeSingle();
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
      batch_id: forAll ? null : batchId,
      audience: forAll ? "ALL" : "BATCH",
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

  const enrollments = (await getRosterStudents(session.audience === "ALL" ? ALL_ID : session.batch_id)).map((s) => ({
    student_id: s.id,
    students: s,
  }));

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
      batchName:               session.audience === "ALL" ? "All Students" : (session.batches?.name ?? null),
      audience:                session.audience || "BATCH",
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

  // Own batches' sessions plus All Students sessions — each session once,
  // however many batches the student is in.
  const { data: rawSessions, error: sessErr } = await supabase
    .from("attendance_sessions")
    .select(`id, ${COUNTABLE_SESSION_COLS}`)
    .or(sessionScopeFilter(batchIds));

  if (sessErr) throw sessErr;
  const sessions = await filterCountableSessions(rawSessions);

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

  const { data: sessions, error: sessErr } = await supabase
    .from("attendance_sessions")
    .select("id, date, source, audience, batches(name, delivery_type, start_time), online_classes(title)")
    .or(sessionScopeFilter(batchIds))
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
      batchName: s.audience === "ALL" ? "All Students" : (s.batches?.name || null),
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

  const monthStr = String(month).padStart(2, "0");
  const startDate = `${year}-${monthStr}-01`;
  const lastDay = new Date(year, month, 0).getDate(); // last day of that month
  const endDate = `${year}-${monthStr}-${String(lastDay).padStart(2, "0")}`;

  const { data: sessions, error: sessErr } = await supabase
    .from("attendance_sessions")
    .select("id, date")
    .or(sessionScopeFilter(batchIds))
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
    .select("batch_id, audience, expires_at")
    .or(sessionScopeFilter(batchIds))
    .eq("date", todayStr);

  if (sessErr) throw sessErr;
  const openSessions = (sessions || []).filter(isSessionOpen);
  const allStudentsLive = openSessions.some((s) => s.audience === "ALL");
  const liveBatchIds = new Set(openSessions.map((s) => s.batch_id));

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
      sessionLive:  allStudentsLive || liveBatchIds.has(b.id),
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

  const batchIdsByStudent = {};
  const allBatchIds = new Set();
  (enrollments || []).forEach((e) => {
    if (!batchIdsByStudent[e.student_id]) batchIdsByStudent[e.student_id] = [];
    batchIdsByStudent[e.student_id].push(e.batch_id);
    allBatchIds.add(e.batch_id);
  });

  // Every session that could count for anyone in the list: their batches'
  // sessions plus All Students sessions (which count once for everybody).
  const { data: rawSessions, error: sessErr } = await supabase
    .from("attendance_sessions")
    .select(`id, batch_id, audience, ${COUNTABLE_SESSION_COLS}`)
    .or(sessionScopeFilter(Array.from(allBatchIds)));
  if (sessErr) throw sessErr;
  const sessions = await filterCountableSessions(rawSessions);

  const sessionIdsByBatch = {};
  const allStudentsSessionIds = [];
  const allSessionIds = [];
  (sessions || []).forEach((s) => {
    allSessionIds.push(s.id);
    if (s.audience === "ALL") {
      allStudentsSessionIds.push(s.id);
      return;
    }
    if (!sessionIdsByBatch[s.batch_id]) sessionIdsByBatch[s.batch_id] = [];
    sessionIdsByBatch[s.batch_id].push(s.id);
  });
  if (allSessionIds.length === 0) return result;

  const { data: records, error: recErr } = await supabase
    .from("attendance_records")
    .select("student_id, session_id, present")
    .in("student_id", studentIds)
    .in("session_id", allSessionIds)
    .eq("present", true);
  if (recErr) throw recErr;

  const presentSessionsByStudent = {};
  (records || []).forEach((r) => {
    if (!presentSessionsByStudent[r.student_id]) presentSessionsByStudent[r.student_id] = new Set();
    presentSessionsByStudent[r.student_id].add(r.session_id);
  });

  studentIds.forEach((id) => {
    // A Set of session ids: a session can never be counted twice for a
    // student, even one enrolled in several batches.
    const mine = new Set(allStudentsSessionIds);
    (batchIdsByStudent[id] || []).forEach((bId) => (sessionIdsByBatch[bId] || []).forEach((sid) => mine.add(sid)));
    if (mine.size === 0) return;
    const present = [...mine].filter((sid) => presentSessionsByStudent[id]?.has(sid)).length;
    result[id] = Math.round((present / mine.size) * 100);
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
  {
    const { data: sessions, error: sessErr } = await supabase
      .from("attendance_sessions")
      .select("id, date, source, audience, batches(name, delivery_type, start_time), online_classes(title)")
      .or(sessionScopeFilter(batchIds))
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
        batchName:    s.audience === "ALL" ? "All Students" : (s.batches?.name || null),
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

  let batch;
  if (isAll(batchId)) {
    batch = { id: ALL_ID, name: "All Students", delivery_type: null, days: null, start_time: null, end_time: null };
  } else {
    const { data, error: batchErr } = await supabase
      .from("batches")
      .select("id, name, delivery_type, days, start_time, end_time")
      .eq("id", batchId)
      .single();
    if (batchErr) throw batchErr;
    batch = data;
  }

  const students = (await getRosterStudents(batchId)).map((s) => ({ student_id: s.id, students: s }));
  const rosterIds = new Set(students.map((e) => e.student_id));

  const { data: sessions, error: sessErr } = await applyBatchSessionScope(
    supabase.from("attendance_sessions").select("id, date, source, sync_status, online_classes(title)"),
    batchId
  ).order("date", { ascending: true });
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
    recordsForSession.forEach((rec, recStudentId) => {
      if (!rosterIds.has(recStudentId)) return; // ignore other batches' students on All Students sessions
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

  // Their batches (a student may be in several)
  const batchIds = await getStudentBatchIds(studentId);

  // Get last N sessions across their batches plus All Students sessions
  const { data: sessions, error: sessErr } = await supabase
    .from("attendance_sessions")
    .select("id, date")
    .or(sessionScopeFilter(batchIds))
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
  getOrgAttendanceOverview,
  setStudentOverride,
  startSession,
  refreshSession,
  endSession,
  getRoster,
  manualMark,
  scanQrToken,
  parseSignedQrToken,
  currentQrToken,
  getOrCreateSessionForOnlineClass,
  detachSessionFromOnlineClass,
  getSessionByOnlineClassId,
  updateSessionSyncStatus,
  getSessionAttendanceDetail,
  getStudentBatchIds,
  effectiveStatus,
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
