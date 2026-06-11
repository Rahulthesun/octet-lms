/**
 * services/storage.service.js
 * ─────────────────────────────────────────────────────────────
 * Storage statistics using Cloudflare R2.
 */

const { S3Client, ListObjectsV2Command } = require("@aws-sdk/client-s3");

const r2 = new S3Client({
  region: "auto",
  endpoint: process.env.R2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
});

const BUCKET = process.env.R2_BUCKET_NAME;

const getStorageUsage = async () => {
  let continuationToken;

  let totalBytes = 0;
  let totalPdfs = 0;
  let totalVideos = 0;
  let totalPdfBytes = 0;
  let totalVideoBytes = 0;

  do {
    const response = await r2.send(
      new ListObjectsV2Command({
        Bucket: BUCKET,
        ContinuationToken: continuationToken,
      })
    );

    const objects = response.Contents || [];

    for (const object of objects) {
      const key = object.Key || "";
      const size = object.Size || 0;

      totalBytes += size;

      if (key.toLowerCase().endsWith(".pdf")) {
        totalPdfs += 1;
        totalPdfBytes += size;
      }

      if (
        key.toLowerCase().endsWith(".mp4") ||
        key.toLowerCase().endsWith(".mov") ||
        key.toLowerCase().endsWith(".avi") ||
        key.toLowerCase().endsWith(".mkv") ||
        key.toLowerCase().endsWith(".webm")
      ) {
        totalVideos += 1;
        totalVideoBytes += size;
      }
    }

    continuationToken = response.IsTruncated
      ? response.NextContinuationToken
      : undefined;
  } while (continuationToken);

  return {
    totalBytes,
    totalPdfs,
    totalVideos,
    totalPdfBytes,
    totalVideoBytes,
  };
};

const getContentStats = async () => {
  const usage = await getStorageUsage();

  return {
    bySubject: [],
    byUser: [],
    summary: usage,
  };
};

module.exports = {
  getStorageUsage,
  getContentStats,
};