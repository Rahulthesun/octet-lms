const express = require("express");

const router = express.Router();

const { searchDocuments } = require("../services/search.service");
const { verifyToken } = require("../middleware/auth");

// Any authenticated user — searches within content they're already allowed
// to browse (same trust level as GET /api/subjects, /api/chapters, etc.)
router.get("/documents", verifyToken, async (req, res) => {

    try {

        const { query } = req.query;

        if (!query) {
            return res.status(400).json({
                error: "query required",
            });
        }

        const results = await searchDocuments(query);

        res.json(results);

    } catch (err) {

        res.status(500).json({
            error: err.message,
        });
    }
});

module.exports = router;
