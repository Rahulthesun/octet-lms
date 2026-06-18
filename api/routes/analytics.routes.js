// backend/routes/analytics.routes.js
//
// Every route on this router is gated to admin/developer roles by requireRole.
// Mount it once in your main app file:
//
//   const analyticsRoutes = require('./routes/analytics.routes');
//   app.use('/api/analytics', analyticsRoutes);
//
// Phase 2 (bug management), Phase 3 (infra metrics), and Phase 4 (user
// tracking) routes all get added to this same router, so they inherit the
// access check automatically — no need to re-apply requireRole per route.

const express = require('express');
const requireRole = require('../utils/requireRole');
const { checkAccess } = require('../controllers/analytics.controller');

const router = express.Router();

router.use(requireRole(['admin', 'developer']));

router.get('/access-check', checkAccess);

module.exports = router;