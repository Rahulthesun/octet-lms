/**
 * utils/oauthState.js
 * ─────────────────────────────────────────────────────────────────────────────
 * CSRF protection for the Google OAuth redirect flow.
 *
 * Google's callback (`GET /api/google/callback`) is a plain browser redirect
 * with no Authorization header, so we can't run it through verifyToken. The
 * signed `state` parameter stands in for that: it's generated server-side
 * right before sending the admin to Google, carries the admin's own user id,
 * and is verified (signature + expiry) when Google redirects back — nobody
 * without the server secret can forge one, and a stolen/replayed state stops
 * working after 10 minutes.
 * ─────────────────────────────────────────────────────────────────────────────
 */

const crypto = require("crypto");

const SECRET = process.env.GOOGLE_OAUTH_STATE_SECRET || process.env.GOOGLE_TOKEN_ENCRYPTION_KEY;
const MAX_AGE_MS = 10 * 60 * 1000; // 10 minutes to complete the consent flow

function signState(adminUserId) {
  if (!SECRET) throw new Error("GOOGLE_OAUTH_STATE_SECRET is not configured");
  const payload = `${adminUserId}.${Date.now()}`;
  const sig = crypto.createHmac("sha256", SECRET).update(payload).digest("hex");
  return Buffer.from(`${payload}.${sig}`).toString("base64url");
}

/** Returns the admin user id encoded in a valid, unexpired state. Throws otherwise. */
function verifyState(state) {
  if (!SECRET) throw new Error("GOOGLE_OAUTH_STATE_SECRET is not configured");
  if (!state) throw Object.assign(new Error("Missing OAuth state"), { status: 400 });

  let decoded;
  try {
    decoded = Buffer.from(String(state), "base64url").toString("utf8");
  } catch {
    throw Object.assign(new Error("Malformed OAuth state"), { status: 400 });
  }

  const parts = decoded.split(".");
  if (parts.length !== 3) throw Object.assign(new Error("Malformed OAuth state"), { status: 400 });

  const [adminUserId, timestamp, sig] = parts;
  const expectedSig = crypto.createHmac("sha256", SECRET).update(`${adminUserId}.${timestamp}`).digest("hex");

  const sigBuf = Buffer.from(sig, "hex");
  const expectedBuf = Buffer.from(expectedSig, "hex");
  if (sigBuf.length !== expectedBuf.length || !crypto.timingSafeEqual(sigBuf, expectedBuf)) {
    throw Object.assign(new Error("Invalid OAuth state"), { status: 400 });
  }

  if (Date.now() - Number(timestamp) > MAX_AGE_MS) {
    throw Object.assign(new Error("OAuth state expired — please try connecting again"), { status: 400 });
  }

  return adminUserId;
}

module.exports = { signState, verifyState };
