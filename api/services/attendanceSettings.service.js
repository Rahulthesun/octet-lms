/**
 * services/attendanceSettings.service.js
 * ─────────────────────────────────────────────────────────────────────────────
 * The configurable knobs for online-class attendance calculation — a single
 * settings row (see attendance_settings in api/sql/online_attendance.sql),
 * not hard-coded thresholds.
 * ─────────────────────────────────────────────────────────────────────────────
 */

const supabase = require("../config/supabase");

const SETTINGS_ID = "00000000-0000-0000-0000-000000000001";

function mapSettings(row) {
  return {
    presentThreshold: Number(row.present_threshold),
    partialThreshold: Number(row.partial_threshold),
    autoCalculate: row.auto_calculate,
    autoSync: row.auto_sync,
    allowOverride: row.allow_override,
    syncDelayMinutes: row.sync_delay_minutes,
    countTimeAfterClassEnd: row.count_time_after_class_end,
    updatedAt: row.updated_at,
  };
}

/** Reads the singleton settings row, self-healing if the seed row is somehow missing. */
async function getSettings() {
  const { data, error } = await supabase.from("attendance_settings").select("*").eq("id", SETTINGS_ID).maybeSingle();
  if (error) throw error;

  if (!data) {
    const { data: created, error: insertErr } = await supabase
      .from("attendance_settings")
      .insert({ id: SETTINGS_ID })
      .select("*")
      .single();
    if (insertErr) throw insertErr;
    return mapSettings(created);
  }

  return mapSettings(data);
}

async function updateSettings(adminUserId, patch) {
  const dbPatch = { updated_by: adminUserId, updated_at: new Date().toISOString() };

  if (patch.presentThreshold !== undefined) dbPatch.present_threshold = patch.presentThreshold;
  if (patch.partialThreshold !== undefined) dbPatch.partial_threshold = patch.partialThreshold;
  if (patch.autoCalculate !== undefined) dbPatch.auto_calculate = patch.autoCalculate;
  if (patch.autoSync !== undefined) dbPatch.auto_sync = patch.autoSync;
  if (patch.allowOverride !== undefined) dbPatch.allow_override = patch.allowOverride;
  if (patch.syncDelayMinutes !== undefined) dbPatch.sync_delay_minutes = patch.syncDelayMinutes;
  if (patch.countTimeAfterClassEnd !== undefined) dbPatch.count_time_after_class_end = patch.countTimeAfterClassEnd;

  const current = await getSettings();
  const nextPresent = dbPatch.present_threshold ?? current.presentThreshold;
  const nextPartial = dbPatch.partial_threshold ?? current.partialThreshold;
  if (nextPresent <= nextPartial) {
    throw Object.assign(new Error("Present threshold must be greater than the partial threshold"), { status: 400 });
  }

  const { data, error } = await supabase
    .from("attendance_settings")
    .update(dbPatch)
    .eq("id", SETTINGS_ID)
    .select("*")
    .single();
  if (error) throw error;
  return mapSettings(data);
}

module.exports = { getSettings, updateSettings, SETTINGS_ID };
