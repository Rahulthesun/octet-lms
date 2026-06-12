/**
 * services/pdf.service.js
 * ─────────────────────────────────────────────────────────────
 * Real implementation using:
 *  - Cloudflare R2  → stores the actual PDF file
 *  - Supabase       → stores the metadata (title, r2_key, size, etc.)
 *
 * Flow for upload:
 *  1. Receive file buffer from multer (in controller)
 *  2. Build a unique r2_key (the file's path inside the bucket)
 *  3. Upload the buffer to R2 using the AWS S3 SDK
 *  4. Save metadata to Supabase pdfs table
 *  5. Return the saved record
 *
 * Flow for retrieval:
 *  1. Fetch metadata row from Supabase
 *  2. Generate a signed URL from the r2_key
 *  3. Return metadata + signed URL (client fetches file directly from R2)
 * ─────────────────────────────────────────────────────────────
 */

const { indexPdfDocument } = require("./pdfIndexer.service");

const { PutObjectCommand, DeleteObjectCommand} = require("@aws-sdk/client-s3");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");
const { GetObjectCommand } = require("@aws-sdk/client-s3");
const { v4: uuidv4 } = require("uuid");

const supabase = require("../config/supabase");
const r2 = require("../config/r2");

const BUCKET = process.env.R2_BUCKET_NAME;

// ─────────────────────────────────────────────────────────────
// HELPER: generate a signed URL for a given r2_key
// A signed URL is a temporary link that lets the client access
// a private R2 file without needing any credentials.
// expiresIn: 3600 = the URL expires after 1 hour.
// ─────────────────────────────────────────────────────────────
const getSignedPdfUrl = async (r2Key) => {
  const command = new GetObjectCommand({ Bucket: BUCKET, Key: r2Key });
  return getSignedUrl(r2, command, { expiresIn: 3600 });
};

// ─────────────────────────────────────────────────────────────
// createPdf
// Called by the controller after multer has parsed the upload.
// `file` is the multer file object:
//   file.buffer       → the raw file bytes
//   file.originalname → original filename from the client
//   file.mimetype     → e.g. "application/pdf"
//   file.size         → bytes
// ─────────────────────────────────────────────────────────────
const createPdf = async ({ title, chapterId, isVisible = true, uploadedBy, file }) => {
  if (!file) throw new Error("No file provided");

  // Build a unique key so two files with the same name never collide.
  // e.g.  pdfs/3f1b2c4d-...-uuid.pdf
  const ext    = file.originalname.split(".").pop();
  const r2Key  = `pdfs/${uuidv4()}.${ext}`;

  // ── Step 1: Upload to R2 ──────────────────────────────────
  // PutObjectCommand sends the file buffer to R2.
  // Body accepts a Buffer (which is what multer gives us with memoryStorage).
  try {
    await r2.send(new PutObjectCommand({
      Bucket:      BUCKET,
      Key:         r2Key,
      Body:        file.buffer,
      ContentType: file.mimetype,
    }));
  } catch (r2Error) {
    console.log("BUCKET:", BUCKET);           // ← is this correct?
    console.log("R2 error code:", r2Error.Code);
    console.log("R2 error message:", r2Error.message);
    console.log("R2 full error:", r2Error);
    throw r2Error;
  }

  // ── Step 2: Save metadata to Supabase ─────────────────────
  // We never store the full URL — only the r2Key.
  // URLs are generated fresh each time via getSignedPdfUrl().
  const { data, error } = await supabase
    .from("pdfs")
    .insert({
      title,
      chapter_id: chapterId,
      filename:    file.originalname,
      r2_key:      r2Key,
      mime_type:   file.mimetype,
      size_bytes:  file.size,
      uploaded_by: uploadedBy || null,
      is_visible:  isVisible,
    })
    .select()   // .select() returns the inserted row
    .single();  // .single() unwraps the array to a plain object

  if (error) {
    // If DB insert fails, delete the file we just uploaded to R2
    // so we don't end up with orphaned files.
    await r2.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: r2Key }));
    throw new Error(error.message);
  }

  // ── Step 3: Return metadata + a fresh signed URL ──────────
  const signedUrl = await getSignedPdfUrl(r2Key);
  // return { ...data, signedUrl };

  setImmediate(async () => {

    try {

        await indexPdfDocument(data);

        console.log("PDF indexed successfully");

    } catch (err) {

        console.error("Indexing failed:", err);
    }

});

return { ...data, signedUrl };
};

// ─────────────────────────────────────────────────────────────
// getAllPdfs
// Supports optional filtering by chapterId and/or isVisible.
// Example: getAllPdfs({ chapter_id: "abc", is_visible: true })
// ─────────────────────────────────────────────────────────────
const getAllPdfs = async (filters = {}) => {
  let query = supabase.from("pdfs").select("*").order("created_at", { ascending: false });

  // Dynamically apply whatever filters were passed in.
  // This avoids writing a separate query for every filter combo.
  if (filters.chapterId) query = query.eq("chapter_id", filters.chapterId);
  if (filters.isVisible !== undefined) query = query.eq("is_visible", filters.isVisible === "true");

  const { data, error } = await query;
  if (error) throw new Error(error.message);

  // Attach a signed URL to every record so the client can
  // immediately render/link to each PDF.
  const pdfsWithUrls = await Promise.all(
    data.map(async (pdf) => ({
      ...pdf,
      signedUrl: await getSignedPdfUrl(pdf.r2_key),
    }))
  );

  return pdfsWithUrls;
};

// ─────────────────────────────────────────────────────────────
// streamPdfById
// ─────────────────────────────────────────────────────────────
const streamPdfbyId = async (id , res) => {
  const { data : pdf, error } = await supabase
    .from("pdfs")
    .select("r2_key, title , filename")
    .eq("id", id)
    .single();

  // Supabase returns error.code "PGRST116" when no row is found.
  // We return null so the controller can send a 404.
  if (error?.code === "PGRST116") return null;
  if (error || !pdf) {
    throw new Error("PDF_NOT_FOUND");
  }

  if (error) throw new Error(error.message);
  
  const command = new GetObjectCommand({
    Bucket: process.env.R2_BUCKET_NAME,
    Key: pdf.r2_key,
  });

  try {
    const s3Response = await r2.send(command);
  
    console.log("R2 response received");
    console.log("Body exists:", !!s3Response.Body);
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `inline; filename="${pdf.filename ?? pdf.title}.pdf"`
    );
    res.setHeader("Cache-Control", "private, max-age=3600");
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("X-Frame-Options", "SAMEORIGIN");
    // Stream directly from R2 → Client
    console.log({
    contentType: s3Response.ContentType,
    contentLength: s3Response.ContentLength,
    metadata: s3Response.Metadata,
    });
    s3Response.Body.pipe(res);
  } catch (r2Error) {
    console.log("Error fetching from R2:", r2Error);
    throw new Error("Failed to fetch PDF from storage");
  }
  
  
};

// ─────────────────────────────────────────────────────────────
// getPdfById
// ─────────────────────────────────────────────────────────────
const getPdfById = async (id) => {
  const { data, error } = await supabase
    .from("pdfs")
    .select("*")
    .eq("id", id)
    .single();

  // Supabase returns error.code "PGRST116" when no row is found.
  // We return null so the controller can send a 404.
  if (error?.code === "PGRST116") return null;
  if (error) throw new Error(error.message);

  const signedUrl = await getSignedPdfUrl(data.r2_key);
  return { ...data, signedUrl };
};

// ─────────────────────────────────────────────────────────────
// getPdfByChapterId
// ─────────────────────────────────────────────────────────────
const getPdfsByChapterId = async (chapterId) => {
  const { data, error } = await supabase
    .from("pdfs")
    .select("*")
    .eq("chapter_id", chapterId)

  // Supabase returns error.code "PGRST116" when no row is found.
  // We return null so the controller can send a 404.
  if (error?.code === "PGRST116") return null;
  if (error) throw new Error(error.message);

  //Takes the arrays of PDF's From data , and fetches signed URL for each PDF in the array and returns a new array with the signed URLs included  
  return await Promise.all(
    data.map(async (pdf) => ({
      ...pdf,
      signedUrl: await getSignedPdfUrl(pdf.r2_key),
    }))
  );
};


// ─────────────────────────────────────────────────────────────
// updatePdf
// Only updates metadata fields — does NOT re-upload the file.
// Allowed fields: title, is_visible, chapter_id
// ─────────────────────────────────────────────────────────────
const updatePdf = async (id, updates) => {
  // Whitelist what's allowed to be updated.
  // Never let raw req.body go straight into the DB.
  const allowed = {};
  if (updates.title      !== undefined) allowed.title       = updates.title;
  if (updates.isVisible  !== undefined) allowed.is_visible  = updates.isVisible;
  if (updates.chapterId !== undefined) allowed.chapter_id = updates.chapterId;
  allowed.updated_at = new Date().toISOString();

  const { data, error } = await supabase
    .from("pdfs")
    .update(allowed)
    .eq("id", id)
    .select()
    .single();

  if (error?.code === "PGRST116") return null;
  if (error) throw new Error(error.message);

  const signedUrl = await getSignedPdfUrl(data.r2_key);
  return { ...data, signedUrl };
};

// ─────────────────────────────────────────────────────────────
// deletePdf
// Deletes from R2 first, then from Supabase.
// Order matters: if DB delete fails after R2 delete, the file
// is gone but the record remains — recoverable.
// If R2 delete fails before DB delete, nothing is lost.
// ─────────────────────────────────────────────────────────────
const deletePdf = async (id) => {
  // First fetch the record so we have the r2_key
  const { data: pdf, error: fetchError } = await supabase
    .from("pdfs")
    .select("*")
    .eq("id", id)
    .single();

  if (fetchError?.code === "PGRST116") return null;
  if (fetchError) throw new Error(fetchError.message);

  // Delete from R2
  await r2.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: pdf.r2_key }));

  // Delete from Supabase
  const { error: deleteError } = await supabase
    .from("pdfs")
    .delete()
    .eq("id", id);

  if (deleteError) throw new Error(deleteError.message);

  // Return the deleted record so the controller can confirm what was removed
  return pdf;
};

module.exports = { createPdf, getAllPdfs, getPdfById,streamPdfbyId, getPdfsByChapterId , updatePdf, deletePdf };