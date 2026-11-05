/**
 * middleware/rateLimit.js
 * Per-IP rate limiters. In-memory (fine for a single Fly machine); swap the
 * store for Redis if the API is ever scaled horizontally.
 */
const crypto = require("crypto");
const { rateLimit, ipKeyGenerator } = require("express-rate-limit");

const make = (windowMs, limit, message) =>
  rateLimit({
    windowMs,
    limit,
    standardHeaders: "draft-7",
    legacyHeaders: false,
    message: { error: message },
  });

// Signed-in requests are counted per user (a hash of the bearer token), not
// per IP: a whole classroom on one school Wi-Fi shares a single public IP and
// would otherwise trip the limit together. Anonymous requests stay per IP.
const userOrIpKey = (req) => {
  const auth = req.headers.authorization;
  if (auth && auth.startsWith("Bearer ")) {
    return "u:" + crypto.createHash("sha256").update(auth.slice(7)).digest("hex").slice(0, 32);
  }
  return "ip:" + ipKeyGenerator(req.ip);
};

module.exports = {
  // Everything under /api
  globalLimiter: rateLimit({
    windowMs: 60 * 1000,
    limit: 1200,
    standardHeaders: "draft-7",
    legacyHeaders: false,
    keyGenerator: userOrIpKey,
    message: { error: "Too many requests, please slow down." },
  }),
  // Per-IP backstop sized for a full classroom behind one NAT — stops a
  // single host from dodging the per-user limit by inventing tokens.
  ipFloodLimiter: make(60 * 1000, 5000, "Too many requests, please slow down."),
  // Unauthenticated public admission form (also uploads files)
  admissionLimiter: make(60 * 60 * 1000, 10, "Too many applications from this network. Try again later."),
  // Forgot / reset password
  passwordResetLimiter: make(15 * 60 * 1000, 10, "Too many password reset attempts. Try again later."),
  // Unauthenticated tracking pixel / webhook
  publicHookLimiter: make(60 * 1000, 120, "Too many requests."),
};
