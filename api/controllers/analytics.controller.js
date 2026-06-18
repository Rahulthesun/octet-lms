// backend/controllers/analyticsAccess.controller.js
//
// Lightweight endpoint the frontend calls on page load to confirm the current
// session is authorized before rendering the dashboard shell. Real data
// endpoints (bugs, infra metrics, user stats) get added to this same
// guarded router in the next phases.

async function checkAccess(req, res) {
  // requireRole has already run by the time we get here, so req.user is set
  // and guaranteed to have an allowed role.
  return res.status(200).json({
    authorized: true,
    user: {
      email: req.user.email,
      role: req.user.role,
    },
  });
}

module.exports = { checkAccess };