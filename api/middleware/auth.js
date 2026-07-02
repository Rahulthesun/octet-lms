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