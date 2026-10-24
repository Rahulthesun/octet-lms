/**
 * services/qaBankResources.service.js
 * ─────────────────────────────────────────────────────────────
 * Attached PDF/Word resource files for a Class (subtopic) under the new
 * Q&A / Practice Questions content categories. Mirrors
 * services/pdf.service.js's R2 + Supabase pattern exactly — the only
 * difference is the target table (qa_bank_resources) and that it accepts
 * PDF and Word mimetypes instead of PDF/PPTX. These files are never parsed
 * into questions; they are plain downloadable/viewable resources attached
 * alongside a Class's question list.
 * ─────────────────────────────────────────────────────────────
 */

const { PutObjectCommand, DeleteObjectCommand, GetObjectCommand } = require("@aws-sdk/client-s3");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");
const { v4: uuidv4 } = require("uuid");

const supabase = require("../config/supabase");
const r2 = require("../config/r2");

const BUCKET = process.env.R2_BUCKET_NAME;

const getSignedResourceUrl = async (r2Key) => {
  const command = new GetObjectCommand({ Bucket: BUCKET, Key: r2Key });
  return getSignedUrl(r2, command, { expiresIn: 3600 });
};

/**
 * `file` is the multer file object (memoryStorage): file.buffer,
 * file.originalname, file.mimetype, file.size.
 */
const createResource = async ({ title, subtopicId, uploadedBy, file }) => {
  if (!file) throw Object.assign(new Error("No file provided"), { status: 400 });
  if (!subtopicId) throw Object.assign(new Error("subtopicId is required"), { status: 400 });
  if (!title) throw Object.assign(new Error("title is required"), { status: 400 });

  const ext = (file.originalname.split(".").pop() || "bin").toLowerCase();
  const r2Key = `qa-bank-resources/${uuidv4()}.${ext}`;

  try {
    await r2.send(new PutObjectCommand({
      Bucket: BUCKET,
      Key: r2Key,
      Body: file.buffer,
      ContentType: file.mimetype,
    }));
  } catch (r2Error) {
    console.error("R2 upload error (qa_bank_resources):", r2Error);
    throw r2Error;
  }

  const { data, error } = await supabase
    .from("qa_bank_resources")
    .insert({
      title,
      subtopic_id: subtopicId,
      filename: file.originalname,
      r2_key: r2Key,
      mime_type: file.mimetype,
      size_bytes: file.size,
      created_by: uploadedBy || null,
    })
    .select()
    .single();

  if (error) {
    await r2.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: r2Key }));
    throw new Error(error.message);
  }

  const signedUrl = await getSignedResourceUrl(r2Key);
  return { ...data, signedUrl };
};

const getResourcesBySubtopic = async (subtopicId) => {
  const { data, error } = await supabase
    .from("qa_bank_resources")
    .select("*")
    .eq("subtopic_id", subtopicId)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return Promise.all(
    (data || []).map(async (r) => ({ ...r, signedUrl: await getSignedResourceUrl(r.r2_key) }))
  );
};

const deleteResource = async (id) => {
  const { data: resource, error: fetchError } = await supabase
    .from("qa_bank_resources")
    .select("*")
    .eq("id", id)
    .single();

  if (fetchError?.code === "PGRST116") return null;
  if (fetchError) throw new Error(fetchError.message);

  await r2.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: resource.r2_key }));

  const { error: deleteError } = await supabase.from("qa_bank_resources").delete().eq("id", id);
  if (deleteError) throw new Error(deleteError.message);

  return resource;
};

module.exports = { createResource, getResourcesBySubtopic, deleteResource, getSignedResourceUrl };
