/**
 * services/googleAuth.service.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Google OAuth 2.0 for the admin's own Google account (organizer of every
 * class). Tokens are stored server-side only, encrypted at rest, in
 * public.google_admin_tokens — never sent to the frontend.
 *
 * One row per admin (admin_user_id is unique) so this already generalizes to
 * "each faculty member connects their own Google account" later — nothing
 * here assumes a single global connection, it's just that today only admins
 * are allowed to schedule (see routes/onlineClasses.routes.js).
 * ─────────────────────────────────────────────────────────────────────────────
 */

const { google } = require("googleapis");
const supabase = require("../config/supabase");
const { encrypt, decrypt } = require("../utils/googleTokenCrypto");

// calendar.events is enough to create/update/cancel events and attach Meet
// conferences. meetings.space.readonly is what lets the backend read back
// actual participant join/leave data after class ends, for attendance sync
// (see googleMeet.service.js) — no broader Calendar, Meet, or Drive scope
// is requested.
const SCOPES = [
  "https://www.googleapis.com/auth/calendar.events",
  "https://www.googleapis.com/auth/meetings.space.readonly",
  "https://www.googleapis.com/auth/userinfo.email",
];

function getOAuthClient() {
  const { GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI } = process.env;
  if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET || !GOOGLE_REDIRECT_URI) {
    throw Object.assign(
      new Error("Google OAuth is not configured on the server (missing GOOGLE_CLIENT_ID/SECRET/REDIRECT_URI)"),
      { status: 500 }
    );
  }
  return new google.auth.OAuth2(GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI);
}

/** Builds the URL the admin's browser is sent to for consent. */
function buildAuthUrl(state) {
  const client = getOAuthClient();
  return client.generateAuthUrl({
    access_type: "offline", // required to receive a refresh_token
    prompt: "consent", // forces a refresh_token on every (re)connect
    scope: SCOPES,
    state,
  });
}

/** Exchanges the ?code= from Google for tokens and persists them for this admin. */
async function exchangeCodeAndStore(code, adminUserId) {
  const client = getOAuthClient();
  const { tokens } = await client.getToken(code);
  client.setCredentials(tokens);

  const oauth2 = google.oauth2({ auth: client, version: "v2" });
  const { data: profile } = await oauth2.userinfo.get();

  const row = {
    admin_user_id: adminUserId,
    google_email: profile.email || null,
    access_token: tokens.access_token ? encrypt(tokens.access_token) : null,
    refresh_token: tokens.refresh_token ? encrypt(tokens.refresh_token) : null,
    token_expiry: tokens.expiry_date ? new Date(tokens.expiry_date).toISOString() : null,
    scope: tokens.scope || SCOPES.join(" "),
    updated_at: new Date().toISOString(),
  };

  if (!row.refresh_token) {
    // Shouldn't happen with access_type=offline + prompt=consent, but if
    // Google ever omits it, we'd silently end up with a connection that
    // stops working the moment the short-lived access token expires.
    throw Object.assign(
      new Error("Google did not return a refresh token — please try connecting again"),
      { status: 502 }
    );
  }

  const { error } = await supabase
    .from("google_admin_tokens")
    .upsert(row, { onConflict: "admin_user_id" });
  if (error) throw error;

  return { email: row.google_email };
}

async function getStoredTokenRow(adminUserId) {
  const { data, error } = await supabase
    .from("google_admin_tokens")
    .select("*")
    .eq("admin_user_id", adminUserId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

/**
 * Returns a ready-to-use, auto-refreshing OAuth2 client for this admin.
 * Throws a typed GOOGLE_NOT_CONNECTED / GOOGLE_REAUTH_REQUIRED error the
 * frontend can key off of to show "Reconnect Google Account".
 */
async function getAuthorizedClient(adminUserId) {
  const row = await getStoredTokenRow(adminUserId);
  if (!row) {
    throw Object.assign(new Error("Google account not connected"), {
      status: 424,
      code: "GOOGLE_NOT_CONNECTED",
    });
  }

  const client = getOAuthClient();
  client.setCredentials({
    access_token: row.access_token ? decrypt(row.access_token) : undefined,
    refresh_token: row.refresh_token ? decrypt(row.refresh_token) : undefined,
    expiry_date: row.token_expiry ? new Date(row.token_expiry).getTime() : undefined,
  });

  // Whenever googleapis silently refreshes the access token under the hood,
  // persist the new one so we don't re-refresh on every single request.
  client.on("tokens", (tokens) => {
    const patch = { updated_at: new Date().toISOString() };
    if (tokens.access_token) patch.access_token = encrypt(tokens.access_token);
    if (tokens.refresh_token) patch.refresh_token = encrypt(tokens.refresh_token);
    if (tokens.expiry_date) patch.token_expiry = new Date(tokens.expiry_date).toISOString();
    supabase
      .from("google_admin_tokens")
      .update(patch)
      .eq("admin_user_id", adminUserId)
      .then(({ error }) => {
        if (error) console.error("[google-auth] failed to persist refreshed token:", error.message);
      });
  });

  try {
    // Forces a refresh right now if the cached access token is expired/near
    // expiry, so callers always get a live client instead of failing later.
    await client.getAccessToken();
  } catch (err) {
    throw Object.assign(
      new Error("Google authorization expired — please reconnect your Google account"),
      { status: 424, code: "GOOGLE_REAUTH_REQUIRED" }
    );
  }

  return client;
}

async function disconnect(adminUserId) {
  const { error } = await supabase.from("google_admin_tokens").delete().eq("admin_user_id", adminUserId);
  if (error) throw error;
}

async function getStatus(adminUserId) {
  const row = await getStoredTokenRow(adminUserId);
  return row ? { connected: true, email: row.google_email } : { connected: false, email: null };
}

module.exports = {
  buildAuthUrl,
  exchangeCodeAndStore,
  getAuthorizedClient,
  disconnect,
  getStatus,
};
