/**
 * routes/pdf.routes.js
 * ─────────────────────────────────────────────────────────────
 * Defines all routes for PDF content management.
 *
 * What is a Router?
 *  express.Router() is a mini Express app – it has its own
 *  middleware and route definitions but no HTTP server of its own.
 *  We export it and mount it in server.js under a prefix.
 *
 * Route anatomy:
 *  router.METHOD(path, ...middlewareFns, controllerFn)
 *
 *  - METHOD  : get | post | put | delete | patch
 *  - path    : relative to the mount prefix in server.js
 *  - controller : the function that actually builds the response
 *
 * Mounted at: /api/content/pdf  (see server.js)
 * ─────────────────────────────────────────────────────────────
 */

const express = require("express");
const multer = require("multer");
const router = express.Router();
const pdfController = require("../controllers/pdf.controller");

const allowedContentTypes = new Set([
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
]);

const upload = multer({
  storage: multer.memoryStorage(),
  fileFilter: (req, file, cb) => {
    const extension = file.originalname.split(".").pop()?.toLowerCase();
    const allowedExtension = extension === "pdf" || extension === "pptx";

    if (allowedContentTypes.has(file.mimetype) && allowedExtension) {
      cb(null, true);
    } else {
      cb(new Error("Only PDF and PPTX files are supported right now"), false);
    }
  },
  limits: { fileSize: 50 * 1024 * 1024 },
});

const handleUploadError = (err, req, res, next) => {
  if (!err) return next();
  if (err instanceof multer.MulterError && err.code === "LIMIT_FILE_SIZE") {
    return res
      .status(413)
      .json({ error: "File is too large. Maximum upload size is 50 MB." });
  }
  return res.status(400).json({ error: err.message || "Invalid upload" });
};

// POST   /api/content/pdf/upload   → upload a new PDF/PPTX content file
router.post(
  "/upload",
  upload.single("file"),
  handleUploadError,
  pdfController.uploadPdf,
);

// GET    /api/content/pdf/:id/stream   → Stream a PDF file by ID (for inline viewing)
router.get("/:id/stream", pdfController.streamPdfbyId);

// GET    /api/content/pdf          → list all PDFs
router.get("/", pdfController.getAllPdfs);

// GET    /api/content/pdf/:id      → get a single PDF by ID
// :id is a URL parameter – accessible via req.params.id
router.get("/:id", pdfController.getPdfById);

// GET    /api/content/pdf/chapter/:chapterId     → get PDFs by chapter ID
// :chapterId is a URL parameter – accessible via req.params.chapterId
router.get("/chapter/:chapterId", pdfController.getPdfsByChapterId);

// PUT    /api/content/pdf/:id      → update metadata of a PDF
router.patch("/:id", pdfController.updatePdf);

// DELETE /api/content/pdf/:id      → delete a PDF
router.delete("/:id", pdfController.deletePdf);

module.exports = router;
