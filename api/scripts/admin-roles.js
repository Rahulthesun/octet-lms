/**
 * scripts/admin-roles.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Compare and set the role stored in Supabase `app_metadata.role`.
 *
 *   node scripts/admin-roles.js list
 *       Lists every account that has a staff role (admin / developer / both)
 *       with its role and Google connection state, so the Buildify account and
 *       Mr. Raju's account can be compared side by side.
 *
 *   node scripts/admin-roles.js show <email>
 *       Prints the full app_metadata / user_metadata of one account.
 *
 *   node scripts/admin-roles.js set <email> <admin|developer|both|student>
 *       Sets app_metadata.role (only the service role can do this — a user can
 *       never change their own app_metadata). Existing app_metadata keys are
 *       preserved. "student" removes the role.
 *
 * Uses SUPABASE_URL / SUPABASE_SERVICE_KEY from api/.env. After a role change
 * the person must sign out and back in so their JWT carries the new role.
 * ─────────────────────────────────────────────────────────────────────────────
 */

require("dotenv").config();
const supabase = require("../config/supabase");

const STAFF = ["admin", "developer", "both"];
const ALLOWED = [...STAFF, "student"];

async function findAllUsers() {
  const users = [];
  for (let page = 1; ; page += 1) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw error;
    users.push(...data.users);
    if (data.users.length < 200) break;
  }
  return users;
}

async function findByEmail(email) {
  const users = await findAllUsers();
  return users.find((u) => (u.email || "").toLowerCase() === email.toLowerCase());
}

async function list() {
  const users = await findAllUsers();
  const staff = users.filter((u) => STAFF.includes(u.app_metadata?.role));
  const { data: tokens } = await supabase.from("google_admin_tokens").select("admin_user_id, google_email, token_expiry, updated_at");
  const tokenByUser = new Map((tokens || []).map((t) => [t.admin_user_id, t]));

  console.log(`\n${staff.length} staff account(s):\n`);
  for (const u of staff) {
    const t = tokenByUser.get(u.id);
    console.log(
      [
        u.email.padEnd(40),
        `role=${u.app_metadata.role}`.padEnd(18),
        t ? `google=connected (${t.google_email})` : "google=not connected",
      ].join("  ")
    );
  }
  console.log("");
}

async function show(email) {
  const user = await findByEmail(email);
  if (!user) throw new Error(`No user with email ${email}`);
  console.log(JSON.stringify({ id: user.id, email: user.email, app_metadata: user.app_metadata, user_metadata: user.user_metadata }, null, 2));
}

async function setRole(email, role) {
  if (!ALLOWED.includes(role)) throw new Error(`Role must be one of: ${ALLOWED.join(", ")}`);
  const user = await findByEmail(email);
  if (!user) throw new Error(`No user with email ${email}`);

  const appMetadata = { ...(user.app_metadata || {}) };
  if (role === "student") delete appMetadata.role;
  else appMetadata.role = role;

  // Supabase merges app_metadata keys, so removing a role needs an explicit null.
  const payload = role === "student" ? { ...appMetadata, role: null } : appMetadata;
  const { error } = await supabase.auth.admin.updateUserById(user.id, { app_metadata: payload });
  if (error) throw error;
  console.log(`Updated ${email}: role = ${role}. They must sign out and sign back in for it to take effect.`);
}

(async () => {
  const [cmd, a, b] = process.argv.slice(2);
  try {
    if (cmd === "list") await list();
    else if (cmd === "show" && a) await show(a);
    else if (cmd === "set" && a && b) await setRole(a, b);
    else {
      console.log("Usage:\n  node scripts/admin-roles.js list\n  node scripts/admin-roles.js show <email>\n  node scripts/admin-roles.js set <email> <admin|developer|both|student>");
      process.exitCode = 1;
    }
  } catch (err) {
    console.error("Error:", err.message);
    process.exitCode = 1;
  }
})();
