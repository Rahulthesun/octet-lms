/**
 * services/testSettings.service.js
 * ─────────────────────────────────────────────────────────────────────────────
 * The configurable test pass-percentage threshold — a single settings row
 * (see test_settings in api/sql/test_settings.sql), mirroring the pattern
 * used by attendanceSettings.service.js for attendance_settings.
 * ─────────────────────────────────────────────────────────────────────────────
 */

const supabase = require("../config/supabase");

const SETTINGS_ID = "00000000-0000-0000-0000-000000000001";
const DEFAULT_PASS_PERCENTAGE = 35;

function mapSettings(row) {
  return {
    passPercentage: Number(row.pass_percentage),
    updatedAt: row.updated_at,
  };
}

/** Reads the singleton settings row, self-healing (and falling back to the default) if it's missing. */
async function getSettings() {
  const { data, error } = await supabase.from("test_settings").select("*").eq("id", SETTINGS_ID).maybeSingle();
  if (error) throw error;

  if (!data) {
    const { data: created, error: insertErr } = await supabase
      .from("test_settings")
      .insert({ id: SETTINGS_ID, pass_percentage: DEFAULT_PASS_PERCENTAGE })
      .select("*")
      .single();
    if (insertErr) {
      // If the table doesn't exist yet (migration not run), never break callers.
      return { passPercentage: DEFAULT_PASS_PERCENTAGE, updatedAt: null };
    }
    return mapSettings(created);
  }

  return mapSettings(data);
}

async function updateSettings(adminUserId, patch) {
  const dbPatch = { updated_by: adminUserId, updated_at: new Date().toISOString() };

  if (patch.passPercentage !== undefined) {
    const pct = Number(patch.passPercentage);
    if (!Number.isFinite(pct) || pct < 0 || pct > 100) {
      throw Object.assign(new Error("passPercentage must be a number between 0 and 100"), { status: 400 });
    }
    dbPatch.pass_percentage = pct;
  }

  const { data, error } = await supabase
    .from("test_settings")
    .upsert({ id: SETTINGS_ID, ...dbPatch }, { onConflict: "id" })
    .select("*")
    .single();
  if (error) throw error;
  return mapSettings(data);
}

module.exports = { getSettings, updateSettings, SETTINGS_ID, DEFAULT_PASS_PERCENTAGE };
