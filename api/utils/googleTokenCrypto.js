/**
 * utils/googleTokenCrypto.js
 * ─────────────────────────────────────────────────────────────────────────────
 * AES-256-GCM encrypt/decrypt for Google OAuth tokens at rest.
 *
 * Tokens are stored in public.google_admin_tokens. The service role key
 * already fully trusts the backend (same posture as the rest of this app),
 * but the tokens themselves are extra-sensitive — they're a standing grant
 * to the admin's real Google account — so they're additionally encrypted
 * with a key that only lives in the server's environment, never in the DB
 * or the frontend.
 *
 * GOOGLE_TOKEN_ENCRYPTION_KEY can be any secret string; it's hashed down to
 * a 32-byte key, so it does not need to be exactly 32 bytes itself.
 * ─────────────────────────────────────────────────────────────────────────────
 */

const crypto = require("crypto");

const ALGORITHM = "aes-256-gcm";

function getKey() {
  const raw = process.env.GOOGLE_TOKEN_ENCRYPTION_KEY;
  if (!raw) {
    throw new Error("GOOGLE_TOKEN_ENCRYPTION_KEY is not configured");
  }
  return crypto.createHash("sha256").update(raw).digest();
}

/** Encrypts a UTF-8 string, returning a single base64 payload (iv + authTag + ciphertext). */
function encrypt(plainText) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGORITHM, getKey(), iv);
  const encrypted = Buffer.concat([cipher.update(plainText, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, encrypted]).toString("base64");
}

/** Reverses encrypt(). Throws if the payload was tampered with or the key is wrong. */
function decrypt(payload) {
  const raw = Buffer.from(payload, "base64");
  const iv = raw.subarray(0, 12);
  const tag = raw.subarray(12, 28);
  const encrypted = raw.subarray(28);
  const decipher = crypto.createDecipheriv(ALGORITHM, getKey(), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString("utf8");
}

module.exports = { encrypt, decrypt };
