/**
 * middleware/rateLimit.js
 * Per-IP rate limiters. In-memory (fine for a single Fly machine); swap the
 * store for Redis if the API is ever scaled horizontally.
 */
const { rateLimit } = require("express-rate-limit");

const make = (windowMs, limit, message) =>
  rateLimit({
    windowMs,
    limit,
    standardHeaders: "draft-7",
    legacyHeaders: false,
    message: { error: message },
  });

module.exports = {
  // Everything under /api
  globalLimiter: make(60 * 1000, 600, "Too many requests, please slow down."),
  // Unauthenticated public admission form (also uploads files)
  admissionLimiter: make(60 * 60 * 1000, 10, "Too many applications from this network. Try again later."),
  // Forgot / reset password
  passwordResetLimiter: make(15 * 60 * 1000, 10, "Too many password reset attempts. Try again later."),
  // Unauthenticated tracking pixel / webhook
  publicHookLimiter: make(60 * 1000, 120, "Too many requests."),
};
