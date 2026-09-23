/**
 * utils/emailTemplate.js
 * ─────────────────────────────────────────────────────────────────────────────
 * One formal, branded HTML shell used by every email the app sends — the
 * welcome email, password reset, online-class notices, parent/absence
 * reports, test results, and every centralized notification. Callers only
 * ever provide the inner message; the header, footer, and "Chemistry@OCTET"
 * sign-off are applied here, once, so every email in the app looks the same.
 * ─────────────────────────────────────────────────────────────────────────────
 */

const BRAND_COLOR = "#5e4075";
const BRAND_NAME = "Chemistry@OCTET";

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Converts plain text (with blank-line paragraph breaks) into safe HTML paragraphs. */
function textToHtmlParagraphs(text) {
  return String(text)
    .split(/\n\s*\n/)
    .map((para) => `<p style="margin:0 0 16px;">${escapeHtml(para).replace(/\n/g, "<br/>")}</p>`)
    .join("\n");
}

/**
 * Wraps a body (HTML fragment) in the full branded email shell.
 *
 * @param {object} opts
 * @param {string} opts.preheader   Short hidden preview text shown in inbox lists.
 * @param {string} opts.bodyHtml    The inner message, already HTML (paragraphs, etc.).
 * @param {{text: string, url: string}} [opts.cta]  Optional call-to-action button.
 * @param {string} [opts.trackingPixelUrl]  Optional 1x1 open-tracking pixel URL.
 */
function wrapEmailHtml({ preheader = "", bodyHtml, cta, trackingPixelUrl }) {
  const loginUrl = process.env.LOGIN_URL || "https://your-lms.com/login";
  const ctaHtml = cta
    ? `
    <tr>
      <td style="padding:8px 0 24px;">
        <a href="${cta.url}" style="display:inline-block;background:${BRAND_COLOR};color:#ffffff;text-decoration:none;font-family:Arial,Helvetica,sans-serif;font-size:14px;font-weight:bold;padding:12px 28px;border-radius:6px;">
          ${escapeHtml(cta.text)}
        </a>
      </td>
    </tr>`
    : "";

  const pixelHtml = trackingPixelUrl
    ? `<img src="${trackingPixelUrl}" width="1" height="1" alt="" style="display:none;" />`
    : "";

  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${BRAND_NAME}</title>
</head>
<body style="margin:0;padding:0;background:#f4f2f7;font-family:Arial,Helvetica,sans-serif;">
  <span style="display:none;max-height:0;overflow:hidden;opacity:0;">${escapeHtml(preheader)}</span>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f2f7;padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:10px;overflow:hidden;border:1px solid #e5e1ec;">
          <tr>
            <td style="background:${BRAND_COLOR};padding:22px 28px;">
              <span style="color:#ffffff;font-size:18px;font-weight:bold;letter-spacing:0.2px;">Chemistry<span style="font-weight:normal;color:#e3d9f0;">@OCTET</span></span>
            </td>
          </tr>
          <tr>
            <td style="padding:28px 28px 8px;color:#27212f;font-size:14px;line-height:1.6;">
              ${bodyHtml}
            </td>
          </tr>
          ${cta ? `<tr><td style="padding:0 28px;"><table role="presentation" cellpadding="0" cellspacing="0"><tbody>${ctaHtml}</tbody></table></td></tr>` : ""}
          <tr>
            <td style="padding:4px 28px 24px;color:#27212f;font-size:14px;">
              — ${BRAND_NAME}
            </td>
          </tr>
          <tr>
            <td style="background:#faf9fb;padding:16px 28px;border-top:1px solid #eee7f5;">
              <p style="margin:0;color:#9a8fac;font-size:11px;line-height:1.6;">
                This is an automated message from ${BRAND_NAME}. Please do not reply directly to this email.<br/>
                Visit your portal: <a href="${loginUrl}" style="color:${BRAND_COLOR};">${loginUrl}</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
  ${pixelHtml}
</body>
</html>`;
}

module.exports = { wrapEmailHtml, textToHtmlParagraphs, escapeHtml, BRAND_COLOR, BRAND_NAME };
