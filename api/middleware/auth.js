/**
 * middleware/auth.js
 * ─────────────────────────────────────────────────────────────────────────────
 * verifyToken  — confirms the request has a valid Supabase JWT.
 *                Attaches the decoded user to req.user.
 *
 * requireRole  — checks req.user.app_metadata.role against an allowed list.
 *                Always call AFTER verifyToken.
 *
 * Usage in a router:
 *   router.get("/something", verifyToken, requireRole(["admin", "developer"]), ctrl.fn)
 *   router.post("/scan",     verifyToken, ctrl.fn)   // any authenticated user
 * ─────────────────────────────────────────────────────────────────────────────
 */

const supabase = require("../config/supabase");
const alumniService = require("../services/alumni.service");
const { REVOKED_MESSAGE } = require("../utils/graduation");

// Roles that are never subject to the student graduation check.
const STAFF_ROLES = ["admin", "developer", "both"];

/**
 * Extracts and verifies the Bearer token from the Authorization header.
 * On success → attaches decoded user to req.user and calls next().
 * On failure → 401.
 */
async function verifyToken(req, res, next) {
  const authHeader = req.headers["authorization"];

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Missing or malformed Authorization header" });
  }

  const token = authHeader.split(" ")[1];

  const { data, error } = await supabase.auth.getUser(token);

  if (error || !data?.user) {
    return res.status(401).json({ error: "Invalid or expired token" });
  }

  req.user = data.user; // { id, email, app_metadata: { role }, user_metadata, ... }

  // Graduation revoke. Decided from students.graduation_date on every
  // request, so access ends the same day even if the archive job has not
  // run. Staff accounts are exempt. A revoked student's sessions are also
  // destroyed so they are logged out, not merely refused.
  const role = data.user.app_metadata?.role;
  if (!STAFF_ROLES.includes(role)) {
    try {
      const access = await alumniService.getStudentAccessState(data.user.id);
      if (access.graduated) {
        alumniService.revokeSessions(data.user.id).catch(() => {});
        return res.status(403).json({ error: REVOKED_MESSAGE, code: "ACCESS_REVOKED" });
      }
    } catch (err) {
      console.error("[auth] graduation check failed:", err.message);
      return res.status(500).json({ error: "Unable to verify account status" });
    }
  }

  next();
}

/**
 * Returns middleware that checks req.user.app_metadata.role.
 * Students have no role set (undefined) — they are blocked by this middleware.
 * Pass ["admin", "developer"] for admin-only routes.
 * Pass ["admin", "developer", "both"] if you use the "both" role.
 *
 * @param {string[]} allowedRoles
 */
function requireRole(allowedRoles) {
  return (req, res, next) => {
    const role = req.user?.app_metadata?.role;

    // "both" means full access — always allow it if it's in your role system
    if (role === "both" || allowedRoles.includes(role)) {
      return next();
    }

    return res.status(403).json({ error: "Forbidden: insufficient role" });
  };
}

module.exports = { verifyToken, requireRole };