/**
 * services/questionImages.service.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Images for MCQ questions and options. Uploads go browser -> Cloudflare R2
 * through a presigned PUT URL (bytes never pass through this server), and
 * images are only ever shown through short-lived signed GET URLs so a
 * question cannot be guessed from a public link before the test.
 * ─────────────────────────────────────────────────────────────────────────────
 */

const { v4: uuidv4 } = require("uuid");
const { PutObjectCommand, GetObjectCommand } = require("@aws-sdk/client-s3");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");
const r2 = require("../config/r2");
const { IMAGE_PREFIX } = require("../utils/mcqQuestion");

const BUCKET = process.env.R2_BUCKET_NAME;
const MAX_IMAGE_BYTES = 5 * 1024 * 1024; // the browser compresses first; this is the hard ceiling
const UPLOAD_TTL_SECONDS = 10 * 60;
// Long enough to cover a full exam sitting plus review, so images never
// expire mid-test.
const VIEW_TTL_SECONDS = 6 * 60 * 60;
const TYPES = { "image/webp": "webp", "image/png": "png", "image/jpeg": "jpg" };

function badRequest(message) {
  return Object.assign(new Error(message), { status: 400 });
}

/** Signed GET URL for a stored question image key (null for no key). */
async function signKey(key) {
  if (!key) return null;
  return getSignedUrl(r2, new GetObjectCommand({ Bucket: BUCKET, Key: key }), { expiresIn: VIEW_TTL_SECONDS });
}

async function createUploadUrl({ contentType, sizeBytes }) {
  const ext = TYPES[contentType];
  if (!ext) throw badRequest("Only WebP, PNG or JPEG images are accepted");
  const size = Number(sizeBytes);
  if (!Number.isFinite(size) || size <= 0) throw badRequest("The image appears to be empty");
  if (size > MAX_IMAGE_BYTES) {
    throw badRequest(`The image is too large. The maximum size is ${MAX_IMAGE_BYTES / (1024 * 1024)} MB`);
  }

  const key = `${IMAGE_PREFIX}${uuidv4()}.${ext}`;
  const uploadUrl = await getSignedUrl(
    r2,
    new PutObjectCommand({ Bucket: BUCKET, Key: key, ContentType: contentType, ContentLength: size }),
    { expiresIn: UPLOAD_TTL_SECONDS }
  );
  return { uploadUrl, key, method: "PUT", headers: { "Content-Type": contentType } };
}

module.exports = { createUploadUrl, signKey, MAX_IMAGE_BYTES };
