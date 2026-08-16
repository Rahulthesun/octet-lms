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
const { verifyToken, requireRole } = require("../middleware/auth");

const adminOnly = requireRole(["admin", "developer"]);

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

// POST   /api/content/pdf/upload   → upload a new PDF/PPTX content file (admin only)
router.post(
  "/upload",
  verifyToken,
  adminOnly,
  upload.single("file"),
  handleUploadError,
  pdfController.uploadPdf,
);

// GET    /api/content/pdf/:id/stream   → Stream a PDF file by ID (any authenticated user)
router.get("/:id/stream", verifyToken, pdfController.streamPdfbyId);

// GET    /api/content/pdf          → list all PDFs across every chapter (admin only)
router.get("/", verifyToken, adminOnly, pdfController.getAllPdfs);

// GET    /api/content/pdf/:id      → get a single PDF by ID (any authenticated user)
// :id is a URL parameter – accessible via req.params.id
router.get("/:id", verifyToken, pdfController.getPdfById);

// GET    /api/content/pdf/chapter/:chapterId     → get PDFs by chapter ID (any authenticated user)
// :chapterId is a URL parameter – accessible via req.params.chapterId
router.get("/chapter/:chapterId", verifyToken, pdfController.getPdfsByChapterId);

// PUT    /api/content/pdf/:id      → update metadata of a PDF (admin only)
router.patch("/:id", verifyToken, adminOnly, pdfController.updatePdf);

// DELETE /api/content/pdf/:id      → delete a PDF (admin only)
router.delete("/:id", verifyToken, adminOnly, pdfController.deletePdf);

module.exports = router;
