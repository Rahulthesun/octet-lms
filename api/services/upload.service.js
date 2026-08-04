const r2 = require("../config/r2");
const { PutObjectCommand } = require("@aws-sdk/client-s3");
const crypto = require("crypto");
const path = require("path");

const BUCKET = process.env.R2_BUCKET_NAME;
const PUBLIC_URL = process.env.R2_PUBLIC_URL.replace(/\/$/, "");

async function uploadStudentDocument(file, folder) {
    if (!file) return null;

    const ext = path.extname(file.originalname);

    const filename =
        crypto.randomUUID() + ext;

    const key = `students/${folder}/${filename}`;

    await r2.send(
        new PutObjectCommand({
            Bucket: BUCKET,
            Key: key,
            Body: file.buffer,
            ContentType: file.mimetype,
        })
    );

    return `${PUBLIC_URL}/${key}`;
}

module.exports = {
    uploadStudentDocument,
};