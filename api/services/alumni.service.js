/**
 * services/alumni.service.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Graduation date, automatic access revoke, the Alumni archive, and restore.
 *
 * Design (see sql/alumni_exams_all_students.sql):
 *  - Access is decided from students.graduation_date directly (utils/
 *    graduation.js), so it ends the same day even if the archive job has not
 *    run. The job below is only the tidy-up: it copies the record into
 *    public.alumni, removes the student from batch rosters and kills their
 *    sessions.
 *  - Nothing is hard-deleted. The students row stays (flagged is_alumni)
 *    because attendance / test / document history is keyed on it. The
 *    enrollments removed from batch_enrollments are stored on the alumni row
 *    so a restore puts them back exactly.
 *  - Reversible: restoreAlumnus() clears the graduation date and re-enrolls.
 * ─────────────────────────────────────────────────────────────────────────────
 */

const supabase = require("../config/supabase");
const {
  todayInTz,
  hasGraduated,
  computeBatchYear,
  isValidDateString,
} = require("../utils/graduation");
const attendanceService = require("./attendance.service");

function badRequest(message) {
  return Object.assign(new Error(message), { status: 400 });
}
function notFound(message) {
  return Object.assign(new Error(message), { status: 404 });
}

// ─── Sessions ────────────────────────────────────────────────────────────────

/** Logs the user out everywhere: deletes their sessions and refresh tokens. */
async function revokeSessions(authUserId) {
  if (!authUserId) return;
  const { error } = await supabase.rpc("revoke_user_sessions", { p_user_id: authUserId });
  if (error) console.error(`[alumni] revoke_user_sessions failed for ${authUserId}:`, error.message);
}

// ─── Access lookup (used by the auth middleware and login check) ─────────────

const accessCache = new Map(); // authUserId -> { at, value }
const ACCESS_CACHE_MS = 10 * 1000;

function clearAccessCache(authUserId) {
  if (authUserId) accessCache.delete(authUserId);
  else accessCache.clear();
}

/**
 * Returns { found, blocked, graduated } for a student auth user. Cached for a
 * few seconds so the auth middleware does not hit the DB on every request;
 * short enough that a graduation date arriving (or a restore) takes effect
 * almost immediately.
 */
async function getStudentAccessState(authUserId) {
  const cached = accessCache.get(authUserId);
  if (cached && Date.now() - cached.at < ACCESS_CACHE_MS) return cached.value;

  const { data, error } = await supabase
    .from("students")
    .select("id, blocked, graduation_date, is_alumni")
    .eq("auth_user_id", authUserId)
    .maybeSingle();
  if (error) throw error;

  const value = data
    ? { found: true, studentId: data.id, blocked: !!data.blocked, graduated: hasGraduated(data) }
    : { found: false, studentId: null, blocked: false, graduated: false };
  accessCache.set(authUserId, { at: Date.now(), value });
  return value;
}

// ─── Archive ─────────────────────────────────────────────────────────────────

async function archiveStudent(studentId) {
  const { data: student, error } = await supabase.from("students").select("*").eq("id", studentId).maybeSingle();
  if (error) throw error;
  if (!student) throw notFound("Student not found");
  if (!student.graduation_date) throw badRequest("Student has no graduation date");

  const { data: enrollments, error: enrErr } = await supabase
    .from("batch_enrollments")
    .select("*")
    .eq("student_id", studentId);
  if (enrErr) throw enrErr;

  // Merge with any enrollments captured by a previous archive that were not
  // restored, so a repeat run never overwrites the snapshot with an empty list.
  const { data: existing } = await supabase.from("alumni").select("batch_enrollments, status").eq("student_id", studentId).maybeSingle();
  const previous = existing && existing.status === "ALUMNI" ? existing.batch_enrollments || [] : [];
  const seen = new Set();
  const mergedEnrollments = [...(enrollments || []), ...previous].filter((e) => {
    const key = `${e.batch_id}:${e.student_id}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  const { password_hash, temp_password, ...profile } = student;

  const row = {
    student_id: student.id,
    auth_user_id: student.auth_user_id,
    admission_number: student.admission_number,
    name: student.name,
    email: student.email,
    mobile_number: student.mobile_number,
    class_grade: student.class_grade,
    school_college: student.school_college,
    preferred_batch: student.preferred_batch,
    learning_mode: student.learning_mode,
    batch_year: computeBatchYear(student.graduation_date),
    graduation_date: student.graduation_date,
    profile,
    batch_enrollments: mergedEnrollments,
    status: "ALUMNI",
    archived_at: new Date().toISOString(),
    restored_at: null,
    restored_by: null,
    updated_at: new Date().toISOString(),
  };

  const { data: alumnus, error: upErr } = await supabase
    .from("alumni")
    .upsert(row, { onConflict: "student_id" })
    .select()
    .single();
  if (upErr) throw upErr;

  // Only after the snapshot is safely stored do we touch the live tables.
  if ((enrollments || []).length > 0) {
    const { error: delErr } = await supabase.from("batch_enrollments").delete().eq("student_id", studentId);
    if (delErr) throw delErr;
  }

  const { error: flagErr } = await supabase.from("students").update({ is_alumni: true }).eq("id", studentId);
  if (flagErr) throw flagErr;

  await revokeSessions(student.auth_user_id);
  clearAccessCache(student.auth_user_id);
  return alumnus;
}

/** Archives every student whose graduation date has arrived and is not yet archived. */
async function archiveDueStudents() {
  const today = todayInTz();
  const { data, error } = await supabase
    .from("students")
    .select("id")
    .eq("is_alumni", false)
    .not("graduation_date", "is", null)
    .lte("graduation_date", today);
  if (error) throw error;

  const results = [];
  for (const s of data || []) {
    try {
      await archiveStudent(s.id);
      results.push({ studentId: s.id, ok: true });
    } catch (err) {
      console.error(`[alumni] archive failed for ${s.id}:`, err.message);
      results.push({ studentId: s.id, ok: false, error: err.message });
    }
  }
  return results;
}

// ─── Restore ─────────────────────────────────────────────────────────────────

async function restoreByStudentId(studentId, adminUserId = null) {
  const { data: student, error } = await supabase.from("students").select("id, auth_user_id").eq("id", studentId).maybeSingle();
  if (error) throw error;
  if (!student) throw notFound("Student not found");

  const { data: alumnus } = await supabase.from("alumni").select("*").eq("student_id", studentId).maybeSingle();

  const { error: updErr } = await supabase
    .from("students")
    .update({ graduation_date: null, is_alumni: false })
    .eq("id", studentId);
  if (updErr) throw updErr;

  if (alumnus && alumnus.status === "ALUMNI") {
    const rows = (alumnus.batch_enrollments || []).map((e) => ({ batch_id: e.batch_id, student_id: studentId }));
    if (rows.length === 0 && alumnus.preferred_batch) {
      rows.push({ batch_id: alumnus.preferred_batch, student_id: studentId });
    }
    if (rows.length > 0) {
      const { error: enrErr } = await supabase
        .from("batch_enrollments")
        .upsert(rows, { onConflict: "batch_id,student_id", ignoreDuplicates: true });
      if (enrErr) throw enrErr;
    }

    const { error: alErr } = await supabase
      .from("alumni")
      .update({ status: "RESTORED", restored_at: new Date().toISOString(), restored_by: adminUserId, updated_at: new Date().toISOString() })
      .eq("id", alumnus.id);
    if (alErr) throw alErr;
  }

  clearAccessCache(student.auth_user_id);
  return { studentId, restored: true };
}

async function restoreAlumnus(alumniId, adminUserId) {
  const { data: alumnus, error } = await supabase.from("alumni").select("student_id").eq("id", alumniId).maybeSingle();
  if (error) throw error;
  if (!alumnus) throw notFound("Alumnus not found");
  return restoreByStudentId(alumnus.student_id, adminUserId);
}

// ─── Graduation date (admin edit + bulk) ─────────────────────────────────────

/**
 * Sets or clears one student's graduation date. Clearing it on an archived
 * student restores them. A date of today or earlier revokes access at once
 * and archives immediately rather than waiting for the job.
 */
async function setGraduationDate(studentId, graduationDate, adminUserId = null) {
  if (graduationDate !== null && graduationDate !== "" && !isValidDateString(graduationDate)) {
    throw badRequest("graduationDate must be a valid YYYY-MM-DD date");
  }

  const { data: student, error } = await supabase
    .from("students")
    .select("id, auth_user_id, is_alumni, status")
    .eq("id", studentId)
    .maybeSingle();
  if (error) throw error;
  if (!student) throw notFound("Student not found");

  if (!graduationDate) {
    if (student.is_alumni) return restoreByStudentId(studentId, adminUserId);
    const { error: clrErr } = await supabase.from("students").update({ graduation_date: null }).eq("id", studentId);
    if (clrErr) throw clrErr;
    clearAccessCache(student.auth_user_id);
    return { studentId, graduationDate: null };
  }

  // Moving an alumnus to a future date is effectively a restore first.
  if (student.is_alumni && graduationDate > todayInTz()) {
    await restoreByStudentId(studentId, adminUserId);
  }

  const { error: updErr } = await supabase.from("students").update({ graduation_date: graduationDate }).eq("id", studentId);
  if (updErr) throw updErr;
  clearAccessCache(student.auth_user_id);

  if (graduationDate <= todayInTz()) {
    await archiveStudent(studentId);
  }
  return { studentId, graduationDate };
}

/** Sets the graduation date for a whole batch (or an explicit id list). */
async function bulkSetGraduationDate({ batchId, studentIds, graduationDate }, adminUserId = null) {
  if (!isValidDateString(graduationDate)) throw badRequest("graduationDate must be a valid YYYY-MM-DD date");

  let ids = Array.isArray(studentIds) ? [...studentIds] : [];
  if (batchId) {
    const { data, error } = await supabase.from("batch_enrollments").select("student_id").eq("batch_id", batchId);
    if (error) throw error;
    ids.push(...(data || []).map((r) => r.student_id));

    const { data: byPref, error: prefErr } = await supabase
      .from("students")
      .select("id")
      .eq("preferred_batch", batchId)
      .eq("status", "APPROVED")
      .eq("is_alumni", false);
    if (prefErr) throw prefErr;
    ids.push(...(byPref || []).map((r) => r.id));
  }
  ids = [...new Set(ids)];
  if (ids.length === 0) throw badRequest("No students matched");

  const updated = [];
  const failed = [];
  for (const id of ids) {
    try {
      await setGraduationDate(id, graduationDate, adminUserId);
      updated.push(id);
    } catch (err) {
      failed.push({ studentId: id, error: err.message });
    }
  }
  return { updated: updated.length, failed };
}

// ─── Alumni reads ────────────────────────────────────────────────────────────

const LIST_COLUMNS =
  "id, student_id, admission_number, name, email, mobile_number, class_grade, preferred_batch, learning_mode, batch_year, graduation_date, status, archived_at, restored_at";

function escapeLike(value) {
  return String(value).replace(/[%_,()]/g, " ").trim();
}

async function listAlumni({ search, batch, year, limit = 50, offset = 0 } = {}) {
  let query = supabase
    .from("alumni")
    .select(LIST_COLUMNS, { count: "exact" })
    .eq("status", "ALUMNI");
  if (batch) query = query.eq("preferred_batch", batch);
  if (year) query = query.eq("batch_year", year);
  const term = search ? escapeLike(search) : "";
  if (term) {
    query = query.or(
      `name.ilike.%${term}%,email.ilike.%${term}%,admission_number.ilike.%${term}%,preferred_batch.ilike.%${term}%,batch_year.ilike.%${term}%`
    );
  }
  const lim = Math.min(Math.max(parseInt(limit, 10) || 50, 1), 200);
  const off = Math.max(parseInt(offset, 10) || 0, 0);
  const { data, error, count } = await query
    .order("graduation_date", { ascending: false })
    .order("name", { ascending: true })
    .range(off, off + lim - 1);
  if (error) throw error;

  return {
    data: data || [],
    pagination: { total: count || 0, limit: lim, offset: off, has_more: off + (data || []).length < (count || 0) },
  };
}

/** Distinct batch years / batches present in the archive, for the filter dropdowns. */
async function getAlumniFilters() {
  const { data, error } = await supabase.from("alumni").select("batch_year, preferred_batch").eq("status", "ALUMNI");
  if (error) throw error;
  const years = [...new Set((data || []).map((r) => r.batch_year).filter(Boolean))].sort().reverse();
  const batches = [...new Set((data || []).map((r) => r.preferred_batch).filter(Boolean))].sort();
  return { years, batches, total: (data || []).length };
}

/** One alumnus with their full record: profile, contacts, attendance, tests, exam documents. */
async function getAlumnus(alumniId) {
  const { data: alumnus, error } = await supabase.from("alumni").select("*").eq("id", alumniId).maybeSingle();
  if (error) throw error;
  if (!alumnus) throw notFound("Alumnus not found");

  const studentId = alumnus.student_id;

  const [attendance, attemptsRes, examRes] = await Promise.all([
    attendanceService.getStudentAttendanceReport(studentId).catch((e) => {
      console.error("[alumni] attendance report failed:", e.message);
      return null;
    }),
    supabase
      .from("test_attempts")
      .select("id, status, marks_awarded, max_marks, submitted_at, tests(title, type, scheduled_start)")
      .eq("student_id", studentId)
      .order("submitted_at", { ascending: false, nullsFirst: false }),
    supabase
      .from("exam_submissions")
      .select("id, kind, entry_mode, file_name, marks_obtained, max_marks, grade, submitted_at, exam_events(name, exam_date)")
      .eq("student_id", studentId)
      .order("submitted_at", { ascending: false }),
  ]);
  if (attemptsRes.error) throw attemptsRes.error;
  if (examRes.error) throw examRes.error;

  return {
    ...alumnus,
    attendance,
    testResults: (attemptsRes.data || []).map((a) => ({
      id: a.id,
      title: a.tests?.title || null,
      type: a.tests?.type || null,
      scheduledStart: a.tests?.scheduled_start || null,
      status: a.status,
      marksAwarded: a.marks_awarded,
      maxMarks: a.max_marks,
      submittedAt: a.submitted_at,
    })),
    examSubmissions: (examRes.data || []).map((s) => ({
      id: s.id,
      kind: s.kind,
      entryMode: s.entry_mode,
      fileName: s.file_name,
      marksObtained: s.marks_obtained,
      maxMarks: s.max_marks,
      grade: s.grade,
      submittedAt: s.submitted_at,
      examName: s.exam_events?.name || null,
      examDate: s.exam_events?.exam_date || null,
    })),
  };
}

module.exports = {
  revokeSessions,
  getStudentAccessState,
  clearAccessCache,
  archiveStudent,
  archiveDueStudents,
  restoreAlumnus,
  restoreByStudentId,
  setGraduationDate,
  bulkSetGraduationDate,
  listAlumni,
  getAlumniFilters,
  getAlumnus,
};
