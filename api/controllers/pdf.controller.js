/**
 * controllers/pdf.controller.js
 * ─────────────────────────────────────────────────────────────
 * What is a controller?
 *  A controller is a plain JS module that exports functions.
 *  Each function is a "route handler" – Express calls it when
 *  an incoming request matches a route in the router.
 *
 * Every handler receives the same two core objects:
 *
 *  req  (IncomingMessage) – everything about the request:
 *    req.body       → parsed JSON body (POST/PUT)
 *    req.params     → URL params, e.g. /:id → req.params.id
 *    req.query      → query string, e.g. ?page=2 → req.query.page
 *    req.headers    → HTTP headers (auth token lives here)
 *    req.file       → uploaded file (when using multer middleware)
 *
 *  res  (ServerResponse) – how you send a response:
 *    res.status(code)   → set HTTP status (chainable)
 *    res.json(obj)      → send JSON + set Content-Type header
 *    res.send(text)     → send plain text
 *    res.sendFile(path) → stream a file to the client
 *
 * HTTP status codes you'll use most:
 *  200 OK           – successful GET / PUT
 *  201 Created      – successful POST (resource created)
 *  400 Bad Request  – client sent invalid data
 *  404 Not Found    – resource doesn't exist
 *  500 Server Error – something crashed on the backend
 * ─────────────────────────────────────────────────────────────
 */

const pdfService = require("../services/pdf.service");

/**
 * POST /api/content/pdf/upload
 *
 * Expects: multipart/form-data with a "file" field + metadata fields
 *   { title, subjectId, chapterId, subtopicId, isVisible }
 *
 * In production you'd plug in multer (file upload middleware) here.
 * For now, req.file and req.body are placeholders.
 */

// memoryStorage keeps the file in RAM as a Buffer.
// This is what R2's PutObjectCommand expects.
// Don't use diskStorage — we're sending straight to R2, not saving locally.
const uploadPdf = async (req, res) => {
  console.log("req.body:", req.body);   // ← add this
  console.log("req.file:", req.file); 
  try {
    const { title, subtopicId, isVisible } = req.body;
    if (!title || !subtopicId) {
      return res.status(400).json({ error: "title and subtopicId are required" });
    }
    const newPdf = await pdfService.createPdf({
      title,
      subtopicId,
      isVisible: isVisible === "true",
      uploadedBy: req.user?.id || null,
      file: req.file,   // set by multer
    });
    res.status(201).json(newPdf);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
/**
 * GET /api/content/pdf
 *
 * Returns a list of all PDFs. You can later add query params
 * for filtering: ?subtopicId=xyz&isVisible=true
 */
const getAllPdfs = async (req, res) => {
  try {
    // req.query holds everything after the ? in the URL.
    // e.g. GET /api/content/pdf?subtopicId=abc → req.query = { subtopicId: 'abc' }
    const filters = req.query;
    const pdfs = await pdfService.getAllPdfs(filters);
    res.status(200).json(pdfs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/**
 * GET /api/content/pdf/:id
 *
 * Returns a single PDF document by its ID.
 * :id in the route path becomes req.params.id here.
 */
const getPdfById = async (req, res) => {
  try {
    const { id } = req.params; // destructure from req.params
    const pdf = await pdfService.getPdfById(id);

    if (!pdf) {
      return res.status(404).json({ error: "PDF not found" });
    }

    res.status(200).json(pdf);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/**
 * PUT /api/content/pdf/:id
 *
 * Updates metadata (title, visibility, subtopic, etc.) for a PDF.
 * Does NOT re-upload the file – that's a separate concern.
 */
const updatePdf = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body; // whatever fields the client sends

    const updated = await pdfService.updatePdf(id, updates);

    if (!updated) {
      return res.status(404).json({ error: "PDF not found" });
    }

    res.status(200).json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/**
 * DELETE /api/content/pdf/:id
 *
 * Deletes the PDF record (and ideally the file from storage too).
 * Returns 204 No Content – success but nothing to send back.
 */
const deletePdf = async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await pdfService.deletePdf(id);

    if (!deleted) {
      return res.status(404).json({ error: "PDF not found" });
    }

    // 204 = success, no body. Common for DELETE.
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Export each handler as a named property so the router can import
// specific ones: const { uploadPdf } = require('./pdf.controller')
module.exports = {
  uploadPdf,
  getAllPdfs,
  getPdfById,
  updatePdf,
  deletePdf,
};