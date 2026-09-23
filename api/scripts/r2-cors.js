/**
 * scripts/r2-cors.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Browser uploads (question images, exam documents) PUT straight to Cloudflare
 * R2 with a presigned URL. The browser refuses that request unless the bucket
 * has a CORS rule allowing the web origin, which shows up in the app as
 * "Upload failed: could not reach storage".
 *
 *   node scripts/r2-cors.js show
 *       Prints the bucket's current CORS rules.
 *
 *   node scripts/r2-cors.js set [extraOrigin ...]
 *       Adds the origins below to the existing rules (nothing already allowed
 *       is removed): http://localhost:3000, FRONTEND_URL from .env, CORS_ORIGINS
 *       from .env, plus any origins passed as arguments.
 * ─────────────────────────────────────────────────────────────────────────────
 */

require("dotenv").config();
const { GetBucketCorsCommand, PutBucketCorsCommand } = require("@aws-sdk/client-s3");
const r2 = require("../config/r2");

const BUCKET = process.env.R2_BUCKET_NAME;

async function current() {
  try {
    const res = await r2.send(new GetBucketCorsCommand({ Bucket: BUCKET }));
    return res.CORSRules || [];
  } catch (err) {
    if (err.name === "NoSuchCORSConfiguration" || err.$metadata?.httpStatusCode === 404) return [];
    throw err;
  }
}

function wantedOrigins(extra) {
  const fromEnv = [process.env.FRONTEND_URL, ...(process.env.CORS_ORIGINS || "").split(",")];
  return [...new Set(["http://localhost:3000", ...fromEnv, ...extra].map((o) => (o || "").trim().replace(/\/$/, "")).filter(Boolean))];
}

(async () => {
  const [cmd, ...extra] = process.argv.slice(2);
  try {
    const rules = await current();
    if (cmd === "show") {
      console.log(JSON.stringify(rules, null, 2));
      return;
    }
    if (cmd !== "set") {
      console.log("Usage:\n  node scripts/r2-cors.js show\n  node scripts/r2-cors.js set [extraOrigin ...]");
      process.exitCode = 1;
      return;
    }

    const origins = wantedOrigins(extra);
    const upload = {
      ID: "browser-uploads",
      AllowedOrigins: origins,
      AllowedMethods: ["PUT", "GET", "HEAD"],
      AllowedHeaders: ["*"],
      ExposeHeaders: ["ETag"],
      MaxAgeSeconds: 3600,
    };
    // Keep every other rule, replace only our own.
    const next = [...rules.filter((r) => r.ID !== upload.ID), upload];
    await r2.send(new PutBucketCorsCommand({ Bucket: BUCKET, CORSConfiguration: { CORSRules: next } }));
    console.log(`CORS updated on bucket ${BUCKET}. Allowed origins: ${origins.join(", ")}`);
  } catch (err) {
    console.error("Error:", err.name, err.message);
    process.exitCode = 1;
  }
})();
