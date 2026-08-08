/**
 * services/onlineAttendanceSync.service.js
 * ─────────────────────────────────────────────────────────────────────────────
 * The engine that turns real Google Meet participation into attendance
 * records in the EXISTING attendance_records table. This is the only place
 * that combines googleMeet.service.js (raw participant data) with
 * meetInterval.js (merge/clamp/percentage math) and writes the result.
 *
 * Runs two ways, both calling the exact same `syncClassAttendance`:
 *   - Automatically, on a lightweight in-process poller started from
 *     server.js (startScheduler), a configurable delay after each class's
 *     scheduled end time.
 *   - On demand, from the admin's "Sync Attendance" / "Retry Sync" button
 *     (onlineClasses.controller.js).
 * Both paths are fully idempotent — re-running a sync UPDATEs the same
 * attendance_records rows (unique on session_id+student_id) rather than
 * inserting duplicates, and never overwrites an admin's manual override.
 * ─────────────────────────────────────────────────────────────────────────────
 */

const supabase = require("../config/supabase");
const attendanceService = require("./attendance.service");
const attendanceSettingsService = require("./attendanceSettings.service");
const googleMeet = require("./googleMeet.service");
const { calculateAttendedMinutes, calculatePercentage, classifyAttendance } = require("../utils/meetInterval");

const MAX_AUTO_ATTEMPTS = 5; // after this many failed automatic attempts, only a manual "Retry Sync" tries again

/** "2026-08-15T10:00:00.000Z" + "Asia/Kolkata" -> "2026-08-15" (the calendar date in that zone, for the attendance_sessions.date column). */
function isoToDateInZone(iso, timeZone) {
  const fmt = new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" });
  const parts = {};
  fmt.formatToParts(new Date(iso)).forEach((p) => { if (p.type !== "literal") parts[p.type] = p.value; });
  return `${parts.year}-${parts.month}-${parts.day}`;
}

/**
 * Runs (or re-runs) attendance sync for one online class. Safe to call
 * repeatedly — see file header for the idempotency guarantee.
 */
async function syncClassAttendance(classId) {
  const settings = await attendanceSettingsService.getSettings();

  const { data: onlineClass, error: classErr } = await supabase
    .from("online_classes")
    .select("*, batches(name)")
    .eq("id", classId)
    .maybeSingle();
  if (classErr) throw classErr;
  if (!onlineClass) throw Object.assign(new Error("Online class not found"), { status: 404 });

  if (onlineClass.status === "cancelled") {
    return { synced: false, reason: "Class was cancelled" };
  }
  if (!onlineClass.google_meet_url) {
    return { synced: false, reason: "No Google Meet link on this class" };
  }

  const sessionDate = isoToDateInZone(onlineClass.scheduled_start, onlineClass.timezone);
  const session = await attendanceService.getOrCreateSessionForOnlineClass(
    onlineClass.batch_id,
    sessionDate,
    onlineClass.id
  );

  await attendanceService.updateSessionSyncStatus(session.id, {
    sync_attempts: (session.sync_attempts || 0) + 1,
  });

  try {
    const conferenceRecord = await googleMeet.findConferenceRecord(
      onlineClass.created_by,
      onlineClass.google_meet_url,
      onlineClass.scheduled_start,
      onlineClass.scheduled_end
    );

    if (!conferenceRecord) {
      // The class may not have started yet, or Google hasn't finalized the
      // record. Never treat "no data yet" as "everyone absent".
      await attendanceService.updateSessionSyncStatus(session.id, {
        sync_status: "AWAITING_ATTENDANCE_SYNC",
        sync_error: null,
      });
      return { synced: false, reason: "AWAITING_ATTENDANCE_SYNC" };
    }

    const participants = await googleMeet.listParticipantSessions(onlineClass.created_by, conferenceRecord.name);

    // Full expected roster: batch enrollment + any explicitly-added extra students.
    const { data: enrollments, error: enrollErr } = await supabase
      .from("batch_enrollments")
      .select("student_id, students(id, name, admission_number, google_user_id)")
      .eq("batch_id", onlineClass.batch_id);
    if (enrollErr) throw enrollErr;

    const { data: extraLinks, error: extraErr } = await supabase
      .from("online_class_attendees")
      .select("student_id, students(id, name, admission_number, google_user_id)")
      .eq("online_class_id", onlineClass.id);
    if (extraErr) throw extraErr;

    const rosterMap = new Map();
    (enrollments || []).forEach((e) => { if (e.students) rosterMap.set(e.students.id, e.students); });
    (extraLinks || []).forEach((e) => { if (e.students) rosterMap.set(e.students.id, e.students); });
    const roster = Array.from(rosterMap.values());

    const byGoogleUserId = new Map();
    roster.forEach((s) => { if (s.google_user_id) byGoogleUserId.set(s.google_user_id, s); });

    const classDurationMinutes =
      (new Date(onlineClass.scheduled_end).getTime() - new Date(onlineClass.scheduled_start).getTime()) / 60000;

    // Match every Meet participant to an LMS student PURELY by linked
    // Google identity — never by display name (names collide; see spec).
    const minutesByStudentId = new Map();
    const unmatched = [];

    participants.forEach((p) => {
      const { minutes } = calculateAttendedMinutes(
        p.sessions,
        onlineClass.scheduled_start,
        onlineClass.scheduled_end,
        { countAfterEnd: settings.countTimeAfterClassEnd }
      );
      if (minutes <= 0) return; // never actually overlapped the class window

      const student = p.googleUserId ? byGoogleUserId.get(p.googleUserId) : null;
      if (student) {
        minutesByStudentId.set(student.id, (minutesByStudentId.get(student.id) || 0) + minutes);
      } else {
        unmatched.push({
          googleUserId: p.googleUserId || null,
          displayName: p.displayName,
          isAnonymous: p.isAnonymous,
          minutes,
        });
      }
    });

    // Preserve existing overrides across re-syncs — a re-sync must never
    // silently undo an admin's manual correction.
    const { data: existingOverrides, error: overrideErr } = await supabase
      .from("attendance_records")
      .select("student_id, final_status, final_pct, override_by, override_reason, override_at")
      .eq("session_id", session.id)
      .eq("was_overridden", true);
    if (overrideErr) throw overrideErr;
    const overrideMap = new Map((existingOverrides || []).map((r) => [r.student_id, r]));

    // Write one record per ENROLLED student — including those who never
    // joined at all (0 minutes -> absent). Attendance is calculated against
    // the complete expected roster, not just who showed up.
    const now = new Date().toISOString();
    const rows = roster.map((s) => {
      const minutes = minutesByStudentId.get(s.id) || 0;
      const pct = calculatePercentage(minutes, classDurationMinutes);
      const status = classifyAttendance(pct, settings.presentThreshold, settings.partialThreshold);

      const override = overrideMap.get(s.id);
      if (override) {
        return {
          session_id: session.id,
          student_id: s.id,
          present: override.final_status === "present",
          status: override.final_status,
          duration_minutes: minutes,
          automatic_pct: pct,
          automatic_status: status,
          final_pct: override.final_pct,
          final_status: override.final_status,
          was_overridden: true,
          override_by: override.override_by,
          override_reason: override.override_reason,
          override_at: override.override_at,
          synced_at: now,
          marked_at: now,
        };
      }

      return {
        session_id: session.id,
        student_id: s.id,
        present: status === "present",
        status,
        duration_minutes: minutes,
        automatic_pct: pct,
        automatic_status: status,
        final_pct: pct,
        final_status: status,
        was_overridden: false,
        synced_at: now,
        marked_at: now,
      };
    });

    if (rows.length > 0) {
      // Idempotent: unique on (session_id, student_id) — a re-sync UPDATEs
      // these same rows rather than inserting duplicates.
      const { error: upsertErr } = await supabase
        .from("attendance_records")
        .upsert(rows, { onConflict: "session_id,student_id" });
      if (upsertErr) throw upsertErr;
    }

    await attendanceService.updateSessionSyncStatus(session.id, {
      sync_status: "SYNCED",
      google_conference_record_name: conferenceRecord.name,
      sync_error: null,
      unmatched_participants: unmatched,
    });

    return {
      synced: true,
      presentCount: rows.filter((r) => r.final_status === "present").length,
      partialCount: rows.filter((r) => r.final_status === "partial").length,
      absentCount: rows.filter((r) => r.final_status === "absent").length,
      unmatchedCount: unmatched.length,
    };
  } catch (err) {
    await attendanceService.updateSessionSyncStatus(session.id, {
      sync_status: "SYNC_FAILED",
      sync_error: err.message,
    });
    throw err;
  }
}

/** Finds classes whose sync is due and runs them. Called by the poller and can be triggered manually for testing. */
async function runDueSyncs() {
  const settings = await attendanceSettingsService.getSettings();
  if (!settings.autoSync) return { checked: 0, synced: 0 };

  const cutoffIso = new Date(Date.now() - settings.syncDelayMinutes * 60 * 1000).toISOString();

  const { data: dueClasses, error } = await supabase
    .from("online_classes")
    .select("id, status, scheduled_end")
    .neq("status", "cancelled")
    .neq("status", "pending")
    .lte("scheduled_end", cutoffIso);

  if (error) {
    console.error("[online-attendance-sync] poll query failed:", error.message);
    return { checked: 0, synced: 0 };
  }

  let synced = 0;
  for (const cls of dueClasses || []) {
    const { data: session } = await supabase
      .from("attendance_sessions")
      .select("id, sync_status, sync_attempts")
      .eq("online_class_id", cls.id)
      .maybeSingle();

    if (session?.sync_status === "SYNCED" || session?.sync_status === "MANUALLY_REVIEWED") continue;
    if ((session?.sync_attempts || 0) >= MAX_AUTO_ATTEMPTS) continue; // stop hammering Google; admin can still manually retry

    try {
      const result = await syncClassAttendance(cls.id);
      if (result.synced) synced++;
    } catch (err) {
      console.error(`[online-attendance-sync] class ${cls.id} sync failed:`, err.message);
    }
  }

  return { checked: (dueClasses || []).length, synced };
}

let schedulerHandle = null;

/** Starts the in-process poller. Called once from server.js at boot. */
function startScheduler({ intervalMs = 60 * 1000, initialDelayMs = 15 * 1000 } = {}) {
  if (schedulerHandle) return;

  schedulerHandle = setInterval(() => {
    runDueSyncs().catch((e) => console.error("[online-attendance-sync] scheduler tick failed:", e.message));
  }, intervalMs);
  if (typeof schedulerHandle.unref === "function") schedulerHandle.unref(); // don't keep the process alive just for this timer

  setTimeout(() => {
    runDueSyncs().catch((e) => console.error("[online-attendance-sync] initial sync pass failed:", e.message));
  }, initialDelayMs);

  console.log("[online-attendance-sync] scheduler started");
}

module.exports = { syncClassAttendance, runDueSyncs, startScheduler };
