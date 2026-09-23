/**
 * controllers/personalTasks.controller.js
 * ─────────────────────────────────────────────────────────────
 * The user id ALWAYS comes from req.user.id (verifyToken, the caller's own
 * verified session) — never from the request body or a route param. That's
 * what keeps this a private per-user list instead of a data-access hole.
 * ─────────────────────────────────────────────────────────────
 */

const service = require("../services/personalTasks.service");

function handleError(res, err, fallback) {
  res.status(err.status || 500).json({ error: err.message || fallback });
}

/** GET /api/personal-tasks */
const list = async (req, res) => {
  try {
    const tasks = await service.listTasks(req.user.id);
    res.status(200).json({ tasks });
  } catch (err) {
    handleError(res, err, "Failed to load tasks");
  }
};

/** POST /api/personal-tasks  body: { content, dueAt? } */
const create = async (req, res) => {
  try {
    const task = await service.createTask(req.user.id, req.body || {});
    res.status(201).json({ task });
  } catch (err) {
    handleError(res, err, "Failed to create task");
  }
};

/** PATCH /api/personal-tasks/:id  body: { content?, completed?, dueAt? } */
const update = async (req, res) => {
  try {
    const task = await service.updateTask(req.user.id, req.params.id, req.body || {});
    res.status(200).json({ task });
  } catch (err) {
    handleError(res, err, "Failed to update task");
  }
};

/** DELETE /api/personal-tasks/:id */
const remove = async (req, res) => {
  try {
    const result = await service.deleteTask(req.user.id, req.params.id);
    res.status(200).json(result);
  } catch (err) {
    handleError(res, err, "Failed to delete task");
  }
};

module.exports = { list, create, update, remove };
