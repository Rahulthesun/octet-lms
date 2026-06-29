/**
 * services/security.service.js
 */

const crypto = require("crypto");
const supabase = require("../config/supabase");

const WATERMARK_SECRET = process.env.WATERMARK_SECRET;

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

// ─── Security log ─────────────────────────────────────────────────────────────

async function logSecurityEvent(userId, event, metadata = {}) {
  const { error } = await supabase
    .from("security_logs")
    .insert({ user_id: userId || null, event, metadata });

  if (error) throw error;
}

module.exports = { getOrCreateWatermarkToken, logSecurityEvent };