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
const multer  = require("multer");
const router  = express.Router();
const pdfController = require("../controllers/pdf.controller");


const upload = multer({
  storage: multer.memoryStorage(),
  fileFilter: (req, file, cb) => {
    if (file.mimetype === "application/pdf") cb(null, true);
    else cb(new Error("Only PDF files allowed"), false);
  },
  limits: { fileSize: 50 * 1024 * 1024 },
});

// POST   /api/content/pdf/upload   → upload a new PDF
router.post("/upload", upload.single("file"), pdfController.uploadPdf);

// GET    /api/content/pdf          → list all PDFs
router.get("/", pdfController.getAllPdfs);

// GET    /api/content/pdf/:id      → get a single PDF by ID
// :id is a URL parameter – accessible via req.params.id
router.get("/:id", pdfController.getPdfById);

// PUT    /api/content/pdf/:id      → update metadata of a PDF
router.patch("/:id", pdfController.updatePdf);

// DELETE /api/content/pdf/:id      → delete a PDF
router.delete("/:id", pdfController.deletePdf);

module.exports = router;