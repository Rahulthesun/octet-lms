/**
 * middleware/sanitizeErrors.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Controllers answer 5xx with `{ error: err.message }`, which for database /
 * storage failures contains table names, SQL fragments or stack traces. This
 * wraps res.json so any 5xx body is logged in full server-side but reaches the
 * client as a generic message (and never carries `stack`/`detail`).
 * 4xx messages are deliberate validation text and pass through untouched.
 * Outside production the original body is kept to ease debugging.
 * ─────────────────────────────────────────────────────────────────────────────
 */
const GENERIC = "Something went wrong on our side. Please try again.";

function sanitizeErrors(req, res, next) {
  const original = res.json.bind(res);
  res.json = (body) => {
    if (res.statusCode >= 500 && body && typeof body === "object") {
      console.error(`[5xx] ${req.method} ${req.originalUrl}:`, body.error || body.message || body);
      if (process.env.NODE_ENV === "production") {
        return original({ error: GENERIC });
      }
      const { stack, ...rest } = body;
      return original(rest);
    }
    return original(body);
  };
  next();
}

module.exports = sanitizeErrors;
