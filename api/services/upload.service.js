const r2 = require("../config/r2");
const { PutObjectCommand } = require("@aws-sdk/client-s3");
const crypto = require("crypto");
const { GetObjectCommand } = require("@aws-sdk/client-s3");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");

const BUCKET = process.env.R2_BUCKET_NAME;
const PUBLIC_URL = process.env.R2_PUBLIC_URL.replace(/\/$/, "");

// Only these types are ever stored, and the extension + Content-Type are
// derived from the allow-list — never from the client's filename/mimetype — so
// an uploaded .html/.svg can never be served back as a web page.
const SAFE_TYPES = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
    "application/pdf": "pdf",
};

// Magic-number check so a renamed executable/HTML file with a spoofed
// mimetype is rejected too.
function matchesSignature(buf, mimetype) {
    if (!buf || buf.length < 12) return false;
    switch (mimetype) {
        case "image/jpeg": return buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff;
        case "image/png": return buf.slice(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
        case "image/webp": return buf.slice(0, 4).toString("ascii") === "RIFF" && buf.slice(8, 12).toString("ascii") === "WEBP";
        case "application/pdf": return buf.slice(0, 5).toString("ascii") === "%PDF-";
        default: return false;
    }
}

async function uploadStudentDocument(file, folder) {
    if (!file) return null;

    const ext = SAFE_TYPES[file.mimetype];
    if (!ext || !matchesSignature(file.buffer, file.mimetype)) {
        throw Object.assign(new Error("Only JPG, PNG, WEBP or PDF files are allowed"), { status: 400 });
    }

    const key = `students/${folder}/${crypto.randomUUID()}.${ext}`;

    await r2.send(
        new PutObjectCommand({
            Bucket: BUCKET,
            Key: key,
            Body: file.buffer,
            ContentType: file.mimetype,
            // Never let a browser sniff or render these inline as something else.
            ContentDisposition: "attachment",
            CacheControl: "private, max-age=0, no-store",
        })
    );

    return `${PUBLIC_URL}/${key}`;
}

const DOC_FIELDS = ["school_id_card_url", "marksheet_10th_url"];

/**
 * Admission documents are stored under a public base URL, but admins should
 * only ever be handed short-lived signed links — so a leaked/bookmarked URL
 * stops working (once the bucket itself is made private, nothing else changes).
 * Accepts one student row or an array; returns copies with signed document URLs.
 */
async function signStudentDocs(input) {
    const list = Array.isArray(input) ? input : [input];
    const out = await Promise.all(list.map(async (row) => {
        if (!row) return row;
        const copy = { ...row };
        for (const f of DOC_FIELDS) {
            const url = copy[f];
            if (typeof url === "string" && url.startsWith(`${PUBLIC_URL}/`)) {
                try {
                    copy[f] = await getSignedUrl(
                        r2,
                        new GetObjectCommand({ Bucket: BUCKET, Key: url.slice(PUBLIC_URL.length + 1), ResponseContentDisposition: "inline" }),
                        { expiresIn: 3600 }
                    );
                } catch { /* keep the stored URL if signing fails */ }
            }
        }
        return copy;
    }));
    return Array.isArray(input) ? out : out[0];
}

module.exports = {
    uploadStudentDocument,
    signStudentDocs,
    matchesSignature,
    SAFE_TYPES,
};
