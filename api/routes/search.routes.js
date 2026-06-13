const express = require("express");

const router = express.Router();

const { searchDocuments } = require("../services/search.service");

router.get("/documents", async (req, res) => {

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