/**
 * services/security.service.js
 */

const crypto = require("crypto");
const supabase = require("../config/supabase");

const WATERMARK_SECRET = process.env.WATERMARK_SECRET || "3fce03e1d1657b5a4d56144d986ff820e92d241ccf06e44df89f6dd6af33d2b2";

// ─── Watermark token ─────────────────────────────────────────────────────────

/**
 * Returns the existing token for this user, or generates + persists a new one.
 * Deterministic: sha256(userId + WATERMARK_SECRET), truncated to 12 hex chars.
 */
async function getOrCreateWatermarkToken(userId) {
  // Check existing
  const { data: existing, error: findErr } = await supabase
    .from("watermark_tokens")
    .select("token")
    .eq("user_id", userId)
    .maybeSingle();

  if (findErr) throw findErr;
  if (existing) return existing.token;

  // Generate
  const token = crypto
    .createHmac("sha256", WATERMARK_SECRET)
    .update(userId)
    .digest("hex")
    .slice(0, 12);

  const { error: insertErr } = await supabase
    .from("watermark_tokens")
    .insert({ user_id: userId, token });

  if (insertErr) throw insertErr;

  return token;
}

/**
 * Looks up a watermark token and returns the associated user_id.
 * Used when a leaked document needs to be traced back to a student.
 * 
 * @param {string} token - The 12-char hex watermark token
 * @returns {Object|null} - { user_id, created_at } or null if not found
 */
async function lookupWatermarkToken(token) {
  const { data, error } = await supabase
    .from("watermark_tokens")
    .select("user_id, created_at")
    .eq("token", token)
    .single();

  if (error) return null;
  return data;
}

/**
 * Gets student details for a watermark lookup result.
 * Returns minimal info needed for investigation.
 */
async function getStudentForWatermark(userId) {
  const { data, error } = await supabase
    .from("students")
    .select("id, name, email, blocked")
    .eq("auth_user_id", userId)
    .single();

  if (error) return null;
  return data;
}



// ─── Security log ─────────────────────────────────────────────────────────────

async function logSecurityEvent(userId, event, metadata = {}) {
  const { error } = await supabase
    .from("security_logs")
    .insert({ user_id: userId || null, event, metadata });

  if (error) throw error;
}

module.exports = { getOrCreateWatermarkToken,lookupWatermarkToken, getStudentForWatermark, logSecurityEvent };