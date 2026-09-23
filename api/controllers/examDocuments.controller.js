/**
 * controllers/examDocuments.controller.js
 * Thin HTTP wrappers around services/examDocuments.service.js.
 */

const svc = require("../services/examDocuments.service");

const handle = (fn, status = 200) => async (req, res) => {
  try {
    const result = await fn(req);
    res.status(status).json(result);
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
};

// ─── Admin ───────────────────────────────────────────────────────
exports.createEvent = handle((req) => svc.createEvent(req.body, req.user.id), 201);
exports.updateEvent = handle((req) => svc.updateEvent(req.params.id, req.body));
exports.listEvents = handle(() => svc.listEvents());
exports.openHallTicket = handle((req) => svc.openHallTicketWindow(req.params.id));
exports.openResults = handle((req) => svc.openResultsWindow(req.params.id));
exports.tracking = handle((req) =>
  svc.getTracking(req.params.id, { kind: req.query.kind, pendingOnly: req.query.pendingOnly === "true" })
);

// ─── Student (self-service) ──────────────────────────────────────
exports.myEvents = handle((req) => svc.listMyEvents(req.user.id));
exports.myPending = handle((req) => svc.listMyPending(req.user.id));
exports.myEvent = handle((req) => svc.getMyEvent(req.user.id, req.params.id));
exports.uploadUrl = handle((req) => svc.createUploadUrl(req.user.id, req.params.id, req.params.kind, req.body || {}));
exports.confirmUpload = handle((req) => svc.confirmUpload(req.user.id, req.params.id, req.params.kind, req.body || {}));
exports.manualMarks = handle((req) => svc.submitManualMarks(req.user.id, req.params.id, req.body || {}));
