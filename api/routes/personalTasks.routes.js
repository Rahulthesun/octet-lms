/**
 * routes/personalTasks.routes.js
 * ─────────────────────────────────────────────────────────────
 * Mounted at: /api/personal-tasks
 * Any authenticated user — admin or student — manages only their own
 * tasks; the controller/service layer enforces that regardless of role.
 * ─────────────────────────────────────────────────────────────
 */

const express = require("express");
const router = express.Router();
const ctrl = require("../controllers/personalTasks.controller");
const { verifyToken } = require("../middleware/auth");

router.get("/", verifyToken, ctrl.list);
router.post("/", verifyToken, ctrl.create);
router.patch("/:id", verifyToken, ctrl.update);
router.delete("/:id", verifyToken, ctrl.remove);

module.exports = router;
