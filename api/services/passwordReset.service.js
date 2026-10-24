/**
 * services/passwordReset.service.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Forgot-password flow for any account (student or staff — both live in
 * auth.users). A student or admin requests a reset by email, gets a one-time
 * link (valid 30 minutes), and the password they set there becomes their
 * real login credential — written straight into Supabase Auth via the
 * service-role Admin API, the same source of truth every login checks.
 *
 * The raw token is only ever in the emailed link; the database only ever
 * stores its sha256 hash, so a leaked database row can't be used to log in.
 * Whether or not an email is registered is never revealed to the caller —
 * both paths return the same generic message — so this can't be used to
 * discover which emails have accounts.
 * ─────────────────────────────────────────────────────────────────────────────
 */

const crypto = require("crypto");
const supabase = require("../config/supabase");
const { sendPasswordResetEmail } = require("../utils/email");
const { revokeSessions } = require("./alumni.service"); // generic by user id — not student-specific despite the file name

const TOKEN_TTL_MS = 30 * 60 * 1000; // 30 minutes
const RESEND_COOLDOWN_MS = 60 * 1000; // 1 minute between requests for the same email
const MIN_PASSWORD_LENGTH = 8;

function badRequest(message) {
  return Object.assign(new Error(message), { status: 400 });
}

function hashToken(rawToken) {
  return crypto.createHash("sha256").update(rawToken).digest("hex");
}

function resetUrl(rawToken) {
  const base = (process.env.FRONTEND_URL || "http://localhost:3000").replace(/\/$/, "");
  return `${base}/reset-password?token=${rawToken}`;
}

/** Finds an auth user by email. Supabase's admin API has no "get by email", so this pages through, same as scripts/admin-roles.js. */
async function findAuthUserByEmail(email) {
  const target = email.trim().toLowerCase();

  // Fast path: students carry their auth user id, so one indexed lookup + one
  // getUserById replaces paging through every account.
  const { data: student } = await supabase
    .from("students")
    .select("auth_user_id")
    .ilike("email", target)
    .not("auth_user_id", "is", null)
    .limit(1)
    .maybeSingle();
  if (student?.auth_user_id) {
    const { data } = await supabase.auth.admin.getUserById(student.auth_user_id);
    if (data?.user && (data.user.email || "").toLowerCase() === target) return data.user;
  }
  // Staff accounts have no students row — fall back to the full scan.
  for (let page = 1; ; page += 1) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw error;
    const found = data.users.find((u) => (u.email || "").toLowerCase() === target);
    if (found) return found;
    if (data.users.length < 200) return null;
  }
}

/**
 * Step 1: the student/admin asks for a reset link. Always resolves the same
 * way whether or not the email is registered — only the presence of a real
 * account decides whether anything is actually sent.
 */
async function requestReset(email) {
  if (!email?.trim()) throw badRequest("Email is required");
  const normalizedEmail = email.trim().toLowerCase();

  // The lookup, DB write and email all happen AFTER we answer, so a registered
  // and an unregistered address take exactly the same time to respond — the
  // response can't be used to discover which emails have accounts.
  setImmediate(() => {
    processResetRequest(normalizedEmail).catch((err) => {
      console.error("[password-reset] request failed:", err.message);
    });
  });
  return { ok: true };
}

async function processResetRequest(normalizedEmail) {
  const user = await findAuthUserByEmail(normalizedEmail);
  if (!user) return;

  // Per-email cooldown: skip silently.
  const { data: recent, error: recentErr } = await supabase
    .from("password_reset_tokens")
    .select("created_at")
    .eq("email", normalizedEmail)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (recentErr) throw recentErr;
  if (recent && Date.now() - new Date(recent.created_at).getTime() < RESEND_COOLDOWN_MS) return;

  const rawToken = crypto.randomBytes(32).toString("base64url");
  const { error: insertErr } = await supabase.from("password_reset_tokens").insert({
    user_id: user.id,
    email: normalizedEmail,
    token_hash: hashToken(rawToken),
    expires_at: new Date(Date.now() + TOKEN_TTL_MS).toISOString(),
  });
  if (insertErr) throw insertErr;

  await sendPasswordResetEmail(user.email, resetUrl(rawToken));
}

/** Looks up a live (unexpired, unused) token row, or throws a 400 the reset page can show directly. */
async function getLiveToken(rawToken) {
  if (!rawToken) throw badRequest("Missing reset token");
  const { data, error } = await supabase
    .from("password_reset_tokens")
    .select("*")
    .eq("token_hash", hashToken(rawToken))
    .maybeSingle();
  if (error) throw error;
  if (!data || data.used_at || new Date(data.expires_at).getTime() < Date.now()) {
    throw badRequest("This reset link is invalid or has expired. Request a new one.");
  }
  return data;
}

/** Step 2a (optional, for the reset page to check before showing the form). */
async function validateToken(rawToken) {
  await getLiveToken(rawToken);
  return { valid: true };
}

/**
 * Step 2b: the new password is written straight into Supabase Auth — the
 * same table every login reads — so it is the account's real credential
 * from that moment on. The token is single-use, and every other outstanding
 * token for the account is invalidated at the same time. Existing sessions
 * are revoked so a stolen, still-open session doesn't survive the reset.
 */
async function resetPassword(rawToken, newPassword) {
  if (!newPassword || newPassword.length < MIN_PASSWORD_LENGTH) {
    throw badRequest(`Password must be at least ${MIN_PASSWORD_LENGTH} characters`);
  }

  const row = await getLiveToken(rawToken);

  // Atomically claim the token BEFORE touching the password: the UPDATE only
  // matches while used_at is still null, so of two simultaneous requests with
  // the same link exactly one gets a row back and the other is refused.
  const claimedAt = new Date().toISOString();
  const { data: claimed, error: claimErr } = await supabase
    .from("password_reset_tokens")
    .update({ used_at: claimedAt })
    .eq("id", row.id)
    .is("used_at", null)
    .select("id");
  if (claimErr) throw claimErr;
  if (!claimed || claimed.length === 0) {
    throw badRequest("This reset link is invalid or has expired. Request a new one.");
  }

  const { error: updateErr } = await supabase.auth.admin.updateUserById(row.user_id, { password: newPassword });
  if (updateErr) {
    // Release the claim so the user can retry with the same link.
    await supabase.from("password_reset_tokens").update({ used_at: null }).eq("id", row.id);
    throw Object.assign(new Error("Could not update the password"), { status: 500 });
  }

  const now = new Date().toISOString();
  // Defense in depth: any other still-live token for this account (e.g. two
  // reset emails requested back to back) is burned too, not just this one.
  await supabase
    .from("password_reset_tokens")
    .update({ used_at: now })
    .eq("user_id", row.user_id)
    .is("used_at", null);

  await revokeSessions(row.user_id).catch(() => {}); // best-effort — the password change itself is what matters

  return { ok: true, email: row.email };
}

module.exports = { requestReset, validateToken, resetPassword };
