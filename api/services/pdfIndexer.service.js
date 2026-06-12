const { GetObjectCommand } = require("@aws-sdk/client-s3");

const r2 = require("../config/r2");
const supabase = require("../config/supabase");

const pdfjsLibPromise = import("pdfjs-dist/legacy/build/pdf.mjs");

const streamToBuffer = async (stream) => {
    return new Promise((resolve, reject) => {
        const chunks = [];

        stream.on("data", (chunk) => {
            chunks.push(chunk);
        });

        stream.on("end", () => {
            resolve(Buffer.concat(chunks));
        });

        stream.on("error", reject);
    });
};

const indexPdfDocument = async (pdfRecord) => {
    const pdfjsLib = await pdfjsLibPromise;

    const command = new GetObjectCommand({
        Bucket: process.env.R2_BUCKET_NAME,
        Key: pdfRecord.r2_key,
    });

    const response = await r2.send(command);
    const pdfBuffer = await streamToBuffer(response.Body);

    const pdf = await pdfjsLib.getDocument({
        data: new Uint8Array(pdfBuffer),
    }).promise;

    console.log("Total pages:", pdf.numPages);

    const rows = [];

    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
        const page = await pdf.getPage(pageNum);
        const textContent = await page.getTextContent();

        const text = textContent.items
            .map((item) => item.str)
            .join(" ");

        rows.push({
            document_id: pdfRecord.id,
            chapter_id: pdfRecord.chapter_id,
            topic: `Page ${pageNum}`,
            content: text,
            page_start: pageNum,
            page_end: pageNum,
        });

        console.log(`Indexed page ${pageNum}`);
    }

    const { error: deleteError } = await supabase
        .from("document_index")
        .delete()
        .eq("document_id", pdfRecord.id);

    if (deleteError) {
        throw new Error(deleteError.message);
    }

    if (rows.length > 0) {
        const { error: insertError } = await supabase
            .from("document_index")
            .insert(rows);

        if (insertError) {
            throw new Error(insertError.message);
        }
    }
};

module.exports = {
    indexPdfDocument,
};