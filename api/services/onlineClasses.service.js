/**
 * services/onlineClasses.service.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Scheduling, rescheduling, cancelling, and listing online classes.
 *
 * Reuses the existing architecture rather than duplicating it:
 *   - "Student Group" = the existing `batches` / `batch_enrollments` tables
 *     (same ones the attendance feature uses)
 *   - "Course/Subject" = the existing `subjects` table
 *   - Auth/roles = the existing verifyToken/requireRole middleware
 *   - Email = the existing nodemailer/Brevo transporter in utils/email.js
 *   - Attendance = the EXISTING attendance_sessions/attendance_records
 *     tables — every scheduled class gets a linked session
 *     (attendance.service.js's getOrCreateSessionForOnlineClass), which
 *     onlineAttendanceSync.service.js populates from real Google Meet
 *     participation after the class ends.
 *
 * Every write here that touches Google goes through googleCalendar.service —
 * this file never calls googleapis directly.
 * ─────────────────────────────────────────────────────────────────────────────
 */

const crypto = require("crypto");
const supabase = require("../config/supabase");
const googleCalendar = require("./googleCalendar.service");
const attendanceService = require("./attendance.service");
const { zonedTimeToUtcIso } = require("../utils/timezone");
const { sendOnlineClassEmail } = require("../utils/email");

const DEFAULT_TIMEZONE = process.env.LMS_TIMEZONE || "Asia/Kolkata";

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function assertBatchExists(batchId) {
  const { data, error } = await supabase.from("batches").select("id, name").eq("id", batchId).maybeSingle();
  if (error) throw error;
  if (!data) throw Object.assign(new Error("Batch not found"), { status: 404 });
  return data;
}

/** Enrolled students for a batch, plus any explicitly-added extra students, de-duplicated. */
async function resolveAttendees(batchId, extraStudentIds = []) {
  const { data: enrolled, error: enrollErr } = await supabase
    .from("batch_enrollments")
    .select("student_id, students(id, name, email)")
    .eq("batch_id", batchId);
  if (enrollErr) throw enrollErr;

  const map = new Map();
  (enrolled || []).forEach((e) => {
    if (e.students) map.set(e.students.id, e.students);
  });

  if (extraStudentIds.length > 0) {
    const { data: extras, error: extraErr } = await supabase
      .from("students")
      .select("id, name, email")
      .in("id", extraStudentIds);
    if (extraErr) throw extraErr;
    (extras || []).forEach((s) => map.set(s.id, s));
  }

  return Array.from(map.values()).filter((s) => !!s.email);
}

/** True if this batch already has a *scheduled* class overlapping the given window. */
async function hasTimeConflict(batchId, startIso, endIso, excludeClassId = null) {
  let query = supabase
    .from("online_classes")
    .select("id")
    .eq("batch_id", batchId)
    .in("status", ["scheduled", "rescheduled"])
    .lt("scheduled_start", endIso)
    .gt("scheduled_end", startIso);
  if (excludeClassId) query = query.neq("id", excludeClassId);
  const { data, error } = await query;
  if (error) throw error;
  return (data || []).length > 0;
}

function mapClassRow(row, sessionInfo) {
  return {
    id: row.id,
    batchId: row.batch_id,
    batchName: row.batches?.name ?? null,
    subjectId: row.subject_id,
    subjectName: row.subjects?.name ?? null,
    title: row.title,
    description: row.description,
    scheduledStart: row.scheduled_start,
    scheduledEnd: row.scheduled_end,
    timezone: row.timezone,
    meetUrl: row.google_meet_url,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    attendance: sessionInfo
      ? {
          sessionId: sessionInfo.id,
          syncStatus: sessionInfo.sync_status,
          lastSyncedAt: sessionInfo.last_synced_at,
          syncError: sessionInfo.sync_error,
          unmatchedCount: (sessionInfo.unmatched_participants || []).length,
        }
      : null,
  };
}

const SELECT_WITH_JOINS = "*, batches(name), subjects(name)";

/** Attaches each class's linked attendance_sessions row (sync status etc.), fetched separately to avoid relying on PostgREST's reverse-relationship auto-detection for a partial-unique FK. */
async function attachSessionInfo(classRows) {
  const classIds = classRows.map((r) => r.id);
  if (classIds.length === 0) return classRows.map((r) => mapClassRow(r, null));

  const { data: sessions, error } = await supabase
    .from("attendance_sessions")
    .select("id, online_class_id, sync_status, last_synced_at, sync_error, unmatched_participants")
    .in("online_class_id", classIds);
  if (error) throw error;

  const sessionByClassId = new Map((sessions || []).map((s) => [s.online_class_id, s]));
  return classRows.map((r) => mapClassRow(r, sessionByClassId.get(r.id) || null));
}

async function notifyAttendees(attendees, classRow, action) {
  if (!attendees || attendees.length === 0) return;
  await Promise.all(
    attendees.map((s) =>
      sendOnlineClassEmail(s.email, {
        studentName: s.name,
        title: classRow.title,
        batchName: classRow.batches?.name ?? null,
        description: classRow.description,
        scheduledStart: classRow.scheduled_start,
        scheduledEnd: classRow.scheduled_end,
        timezone: classRow.timezone,
        meetUrl: classRow.google_meet_url,
        action,
      })
    )
  );
}

// ─── Schedule ───────────────────────────────────────────────────────────────

/**
 * Schedules a new online class. Idempotent on `idempotencyKey`: resubmitting
 * the same key (e.g. a double-click) returns the first attempt's result
 * instead of creating a second Google Meet.
 *
 * Order of operations matters for correctness: we claim the idempotency key
 * in our own DB (status='pending') BEFORE calling Google. That way a crash
 * or failure between "Google succeeded" and "DB write succeeded" can't
 * silently orphan a Meet with no LMS record and no way to retry safely — and
 * a genuine Google failure never leaves a fake "successful" class behind.
 */
async function scheduleOnlineClass(adminUserId, {
  batchId,
  subjectId,
  title,
  description,
  date,
  startTime,
  endTime,
  timezone,
  extraStudentIds,
  createGoogleMeet,
  sendNotification,
  idempotencyKey,
}) {
  if (!batchId || !title || !date || !startTime || !endTime) {
    throw Object.assign(new Error("batchId, title, date, startTime and endTime are required"), { status: 400 });
  }

  const tz = timezone || DEFAULT_TIMEZONE;
  const startIso = zonedTimeToUtcIso(date, startTime, tz);
  const endIso = zonedTimeToUtcIso(date, endTime, tz);

  if (new Date(endIso) <= new Date(startIso)) {
    throw Object.assign(new Error("End time must be after start time"), { status: 400 });
  }

  await assertBatchExists(batchId);

  const key = idempotencyKey || crypto.randomUUID();

  const { data: existing, error: existingErr } = await supabase
    .from("online_classes")
    .select(SELECT_WITH_JOINS)
    .eq("idempotency_key", key)
    .maybeSingle();
  if (existingErr) throw existingErr;
  if (existing) {
    if (existing.status === "pending") {
      throw Object.assign(new Error("This class is already being scheduled — please wait a moment"), { status: 409 });
    }
    const [mapped] = await attachSessionInfo([existing]);
    return mapped;
  }

  if (await hasTimeConflict(batchId, startIso, endIso)) {
    throw Object.assign(new Error("This batch already has a class scheduled in that time window"), { status: 409 });
  }

  const { data: pendingRow, error: insertErr } = await supabase
    .from("online_classes")
    .insert({
      batch_id: batchId,
      subject_id: subjectId || null,
      title,
      description: description || null,
      scheduled_start: startIso,
      scheduled_end: endIso,
      timezone: tz,
      status: "pending",
      created_by: adminUserId,
      idempotency_key: key,
    })
    .select("*")
    .single();

  if (insertErr) {
    if (insertErr.code === "23505") {
      // Lost a race against another request with the same idempotency key.
      const { data: winner } = await supabase.from("online_classes").select(SELECT_WITH_JOINS).eq("idempotency_key", key).maybeSingle();
      if (winner) {
        const [mapped] = await attachSessionInfo([winner]);
        return mapped;
      }
    }
    throw insertErr;
  }

  try {
    const attendees = await resolveAttendees(batchId, extraStudentIds || []);

    let googleEventId = null;
    let meetUrl = null;

    if (createGoogleMeet !== false) {
      const result = await googleCalendar.createEventWithMeet(adminUserId, {
        summary: title,
        description: description || "",
        startISO: startIso,
        endISO: endIso,
        timezone: tz,
        attendeeEmails: sendNotification === false ? [] : attendees.map((a) => a.email),
        requestId: key,
      });
      googleEventId = result.eventId;
      meetUrl = result.meetUrl;
    }

    const { data: finalRow, error: updateErr } = await supabase
      .from("online_classes")
      .update({
        status: "scheduled",
        google_event_id: googleEventId,
        google_meet_url: meetUrl,
        updated_at: new Date().toISOString(),
      })
      .eq("id", pendingRow.id)
      .select(SELECT_WITH_JOINS)
      .single();
    if (updateErr) throw updateErr;

    if ((extraStudentIds || []).length > 0) {
      const rows = extraStudentIds.map((studentId) => ({ online_class_id: pendingRow.id, student_id: studentId }));
      await supabase.from("online_class_attendees").upsert(rows, { onConflict: "online_class_id,student_id", ignoreDuplicates: true });
    }

    // Link (or create) the existing attendance_sessions row this class's
    // attendance will be written to — this is what makes it show up in the
    // regular attendance system, not a parallel one.
    if (meetUrl) {
      await attendanceService.getOrCreateSessionForOnlineClass(batchId, date, finalRow.id);
    }

    if (sendNotification !== false) {
      notifyAttendees(attendees, finalRow, "scheduled").catch((e) =>
        console.error("[online-classes] email notify failed:", e.message)
      );
    }

    const [mapped] = await attachSessionInfo([finalRow]);
    return mapped;
  } catch (err) {
    // Google (or something downstream) failed — never leave a fake/pending
    // class sitting in the LMS. Clean up and surface the real error.
    await supabase.from("online_classes").delete().eq("id", pendingRow.id);
    throw err;
  }
}

// ─── Reschedule ─────────────────────────────────────────────────────────────

async function rescheduleOnlineClass(adminUserId, classId, { title, description, date, startTime, endTime, timezone }) {
  const { data: row, error } = await supabase.from("online_classes").select(SELECT_WITH_JOINS).eq("id", classId).maybeSingle();
  if (error) throw error;
  if (!row) throw Object.assign(new Error("Online class not found"), { status: 404 });
  if (row.status === "cancelled") throw Object.assign(new Error("Cannot reschedule a cancelled class"), { status: 400 });

  const tz = timezone || row.timezone || DEFAULT_TIMEZONE;
  const timeChanged = Boolean(date && startTime && endTime);
  const startIso = timeChanged ? zonedTimeToUtcIso(date, startTime, tz) : row.scheduled_start;
  const endIso = timeChanged ? zonedTimeToUtcIso(date, endTime, tz) : row.scheduled_end;

  if (new Date(endIso) <= new Date(startIso)) {
    throw Object.assign(new Error("End time must be after start time"), { status: 400 });
  }

  if (timeChanged && (await hasTimeConflict(row.batch_id, startIso, endIso, row.id))) {
    throw Object.assign(new Error("This batch already has a class scheduled in that time window"), { status: 409 });
  }

  const attendees = await resolveAttendees(row.batch_id);

  let meetUrl = row.google_meet_url;
  if (row.google_event_id) {
    const result = await googleCalendar.updateEvent(adminUserId, row.google_event_id, {
      summary: title ?? row.title,
      description: description ?? row.description,
      startISO: startIso,
      endISO: endIso,
      timezone: tz,
      attendeeEmails: attendees.map((a) => a.email),
    });
    // Reschedules preserve the original Meet link — Google only returns a
    // new one if the conference was somehow removed, so this is a no-op in
    // the normal case.
    if (result.meetUrl) meetUrl = result.meetUrl;
  }

  const { data: updated, error: updateErr } = await supabase
    .from("online_classes")
    .update({
      title: title ?? row.title,
      description: description ?? row.description,
      scheduled_start: startIso,
      scheduled_end: endIso,
      timezone: tz,
      google_meet_url: meetUrl,
      status: "rescheduled",
      updated_at: new Date().toISOString(),
    })
    .eq("id", classId)
    .select(SELECT_WITH_JOINS)
    .single();
  if (updateErr) throw updateErr;

  // Keep the linked attendance session in step with the new time. If the
  // date itself moved, detach the old session (it stays as historical data
  // under its original date) and link/create the one for the new date.
  // Either way, reset sync bookkeeping so the next sync recalculates
  // against the new class window instead of reusing a stale result.
  if (meetUrl) {
    const newDate = date || row.scheduled_start.slice(0, 10);
    const previousSession = await attendanceService.getSessionByOnlineClassId(classId);
    if (previousSession && previousSession.date !== newDate) {
      await attendanceService.detachSessionFromOnlineClass(classId);
    }
    const session = await attendanceService.getOrCreateSessionForOnlineClass(row.batch_id, newDate, classId);
    await attendanceService.updateSessionSyncStatus(session.id, {
      sync_status: "NOT_STARTED",
      sync_error: null,
      sync_attempts: 0,
    });
  }

  notifyAttendees(attendees, updated, "rescheduled").catch((e) =>
    console.error("[online-classes] email notify failed:", e.message)
  );

  const [mapped] = await attachSessionInfo([updated]);
  return mapped;
}

// ─── Cancel ─────────────────────────────────────────────────────────────────

/**
 * Cancels the Google Calendar event (so attendees get Google's own
 * cancellation notice) and marks the LMS row cancelled — the row itself is
 * kept, never deleted, so it remains visible as history.
 */
async function cancelOnlineClass(adminUserId, classId) {
  const { data: row, error } = await supabase.from("online_classes").select(SELECT_WITH_JOINS).eq("id", classId).maybeSingle();
  if (error) throw error;
  if (!row) throw Object.assign(new Error("Online class not found"), { status: 404 });
  if (row.status === "cancelled") {
    const [mapped] = await attachSessionInfo([row]);
    return mapped;
  }

  if (row.google_event_id) {
    await googleCalendar.cancelEvent(adminUserId, row.google_event_id);
  }

  const { data: updated, error: updateErr } = await supabase
    .from("online_classes")
    .update({ status: "cancelled", updated_at: new Date().toISOString() })
    .eq("id", classId)
    .select(SELECT_WITH_JOINS)
    .single();
  if (updateErr) throw updateErr;

  const attendees = await resolveAttendees(row.batch_id);
  notifyAttendees(attendees, updated, "cancelled").catch((e) =>
    console.error("[online-classes] email notify failed:", e.message)
  );

  const [mapped] = await attachSessionInfo([updated]);
  return mapped;
}

// ─── Reads ──────────────────────────────────────────────────────────────────

async function getById(classId) {
  const { data, error } = await supabase.from("online_classes").select(SELECT_WITH_JOINS).eq("id", classId).maybeSingle();
  if (error) throw error;
  if (!data) throw Object.assign(new Error("Online class not found"), { status: 404 });
  const [mapped] = await attachSessionInfo([data]);
  return mapped;
}

async function listForAdmin() {
  const { data, error } = await supabase
    .from("online_classes")
    .select(SELECT_WITH_JOINS)
    .neq("status", "pending")
    .order("scheduled_start", { ascending: false });
  if (error) throw error;
  return attachSessionInfo(data || []);
}

/** Every class visible to the logged-in student: their batch's classes, plus any ad-hoc individual additions. */
async function listForStudent(authUserId) {
  const { data: student, error: stuErr } = await supabase
    .from("students")
    .select("id")
    .eq("auth_user_id", authUserId)
    .maybeSingle();
  if (stuErr) throw stuErr;
  if (!student) return [];

  const { data: enrollments, error: enrollErr } = await supabase
    .from("batch_enrollments")
    .select("batch_id")
    .eq("student_id", student.id);
  if (enrollErr) throw enrollErr;
  const batchIds = (enrollments || []).map((e) => e.batch_id);

  const { data: extra, error: extraErr } = await supabase
    .from("online_class_attendees")
    .select("online_class_id")
    .eq("student_id", student.id);
  if (extraErr) throw extraErr;
  const extraClassIds = (extra || []).map((e) => e.online_class_id);

  if (batchIds.length === 0 && extraClassIds.length === 0) return [];

  const filters = [];
  if (batchIds.length > 0) filters.push(`batch_id.in.(${batchIds.join(",")})`);
  if (extraClassIds.length > 0) filters.push(`id.in.(${extraClassIds.join(",")})`);

  const { data, error } = await supabase
    .from("online_classes")
    .select(SELECT_WITH_JOINS)
    .neq("status", "pending")
    .or(filters.join(","))
    .order("scheduled_start", { ascending: true });
  if (error) throw error;
  return attachSessionInfo(data || []);
}

module.exports = {
  scheduleOnlineClass,
  rescheduleOnlineClass,
  cancelOnlineClass,
  getById,
  listForAdmin,
  listForStudent,
};
