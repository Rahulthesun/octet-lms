/**
 * controllers/feedback.controller.js
 * Thin HTTP wrappers around services/feedback.service.js.
 */

const svc = require("../services/feedback.service");

const handle = (fn, okStatus = 200) => async (req, res) => {
  try {
    const result = await fn(req);
    res.status(okStatus).json(result);
  } catch (err) {
    const status = err.status || 500;
    if (status >= 500) console.error("[feedback]", err.message);
    res.status(status).json({ error: status >= 500 ? "Could not process feedback" : err.message });
  }
};

// Students
exports.createStudent = handle((req) => svc.createStudentFeedback(req.user.id, req.body || {}), 201);
exports.listStudent = handle(async () => ({ feedback: await svc.listStudentFeedback() }));
exports.setStudentStatus = handle((req) => svc.setStudentFeedbackStatus(req.params.id, req.body?.status));
exports.deleteStudent = handle((req) => svc.deleteStudentFeedback(req.params.id));

// Parents
exports.createParent = handle((req) => svc.createParentFeedback(req.body || {}), 201);
exports.listParent = handle(async () => ({ feedback: await svc.listParentFeedback() }));
exports.setParentStatus = handle((req) => svc.setParentFeedbackStatus(req.params.id, req.body?.status));
exports.deleteParent = handle((req) => svc.deleteParentFeedback(req.params.id));
