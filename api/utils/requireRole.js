// backend/middleware/requireRole.js
//
// Verifies the Supabase access token sent from the frontend, then checks the
// user's app_metadata.role against an allowlist.
//
// app_metadata is only writable via the Supabase Admin API / service role
// (the raw_app_meta_data SQL update you're already using) — a logged-in user
// can't edit it from the client the way they could user_metadata, so it's
// safe to trust as the source of truth for the role check.
//
// Response codes:
//   401 — no token, or the token doesn't correspond to a valid session
//   403 — valid session, but the role isn't in the allowed list
// (the ticket allows 403 or 404; 403 is used here since the requirement is
// really "valid user, wrong permissions" rather than "resource doesn't exist")

const supabase = require('../config/supabase');

function requireRole(allowedRoles = ['admin', 'developer' , 'both']) {
  return async function (req, res, next) {
    try {
      const authHeader = req.headers.authorization || '';
      const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

      if (!token) {
        return res.status(401).json({ error: 'Missing or invalid authorization token.' });
      }

      const { data, error } = await supabase.auth.getUser(token);

      if (error || !data?.user) {
        return res.status(401).json({ error: 'Invalid or expired session.' });
      }

      const role = data.user.app_metadata?.role;

      if (!role || !allowedRoles.includes(role)) {
        return res.status(403).json({ error: 'You do not have access to this resource.' });
      }

      // Available to downstream controllers as req.user
      req.user = {
        id: data.user.id,
        email: data.user.email,
        role,
      };

      return next();
    } catch (err) {
      console.error('requireRole middleware error:', err);
      return res.status(500).json({ error: 'Internal authorization error.' });
    }
  };
}

module.exports = requireRole;