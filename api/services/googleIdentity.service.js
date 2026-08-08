/**
 * services/googleIdentity.service.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Lets a STUDENT link the Google account they'll actually use to join Meet,
 * so Google Meet participants can be matched to LMS students by real,
 * verified identity — never by display name alone (names collide; Google
 * Meet's own participant list does not expose email addresses to a
 * non-Workspace-admin caller, so this self-service link is what actually
 * makes reliable matching possible).
 *
 * This is intentionally a completely separate, much lighter flow than the
 * admin's Calendar OAuth in googleAuth.service.js:
 *   - Scope is just `openid email` — no Calendar/Meet access is ever
 *     requested of a student's account.
 *   - No access/refresh token is stored at all. The code is exchanged once,
 *     the resulting ID token is verified and used to read the student's
 *     stable Google account id (`sub`) and email, and the token itself is
 *     discarded immediately — there is nothing here to encrypt or refresh.
 * ─────────────────────────────────────────────────────────────────────────────
 */

const { google } = require("googleapis");
const supabase = require("../config/supabase");

const SCOPES = ["openid", "email"];

function getOAuthClient() {
  const { GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_IDENTITY_REDIRECT_URI } = process.env;
  if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET || !GOOGLE_IDENTITY_REDIRECT_URI) {
    throw Object.assign(
      new Error("Google identity linking is not configured on the server (missing GOOGLE_CLIENT_ID/SECRET/GOOGLE_IDENTITY_REDIRECT_URI)"),
      { status: 500 }
    );
  }
  return new google.auth.OAuth2(GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_IDENTITY_REDIRECT_URI);
}

/** Builds the URL a student's browser is sent to for this lightweight identity consent. */
function buildAuthUrl(state) {
  const client = getOAuthClient();
  return client.generateAuthUrl({
    access_type: "online", // no refresh token needed — we never call Google again on this student's behalf
    prompt: "select_account",
    scope: SCOPES,
    state,
  });
}

/**
 * Exchanges the ?code= for tokens, verifies the ID token's signature (not
 * just decodes it), and stores the resulting Google account id + email on
 * the student's row. The access/id tokens themselves are never persisted.
 */
async function exchangeCodeAndLink(code, studentAuthUserId) {
  const client = getOAuthClient();
  const { tokens } = await client.getToken(code);

  if (!tokens.id_token) {
    throw Object.assign(new Error("Google did not return an identity token"), { status: 502 });
  }

  const ticket = await client.verifyIdToken({
    idToken: tokens.id_token,
    audience: process.env.GOOGLE_CLIENT_ID,
  });
  const payload = ticket.getPayload();

  if (!payload?.sub) {
    throw Object.assign(new Error("Could not verify the Google account"), { status: 502 });
  }
  if (payload.email && payload.email_verified === false) {
    throw Object.assign(new Error("That Google account's email is not verified"), { status: 400 });
  }

  const { data: student, error: findErr } = await supabase
    .from("students")
    .select("id")
    .eq("auth_user_id", studentAuthUserId)
    .maybeSingle();
  if (findErr) throw findErr;
  if (!student) throw Object.assign(new Error("Student profile not found"), { status: 404 });

  // Guard against the same Google account already being linked to a
  // different student — each Google identity should resolve to exactly one
  // LMS student, or Meet attendance matching becomes ambiguous.
  const { data: conflict, error: conflictErr } = await supabase
    .from("students")
    .select("id")
    .eq("google_user_id", payload.sub)
    .neq("id", student.id)
    .maybeSingle();
  if (conflictErr) throw conflictErr;
  if (conflict) {
    throw Object.assign(new Error("This Google account is already linked to a different student"), { status: 409 });
  }

  const { error: updateErr } = await supabase
    .from("students")
    .update({
      google_user_id: payload.sub,
      google_identity_email: payload.email || null,
      google_identity_linked_at: new Date().toISOString(),
    })
    .eq("id", student.id);
  if (updateErr) throw updateErr;

  return { email: payload.email || null };
}

async function getStatus(studentAuthUserId) {
  const { data, error } = await supabase
    .from("students")
    .select("google_identity_email, google_identity_linked_at")
    .eq("auth_user_id", studentAuthUserId)
    .maybeSingle();
  if (error) throw error;
  if (!data) return { linked: false, email: null, linkedAt: null };
  return {
    linked: !!data.google_identity_email,
    email: data.google_identity_email,
    linkedAt: data.google_identity_linked_at,
  };
}

async function unlink(studentAuthUserId) {
  const { error } = await supabase
    .from("students")
    .update({ google_user_id: null, google_identity_email: null, google_identity_linked_at: null })
    .eq("auth_user_id", studentAuthUserId);
  if (error) throw error;
}

module.exports = { buildAuthUrl, exchangeCodeAndLink, getStatus, unlink };
