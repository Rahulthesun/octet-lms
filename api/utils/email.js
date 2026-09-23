// utils/email.js
const nodemailer = require('nodemailer');
const { wrapEmailHtml, textToHtmlParagraphs } = require('./emailTemplate');

// Create transporter (fail gracefully if env vars missing)
const transporter = nodemailer.createTransport({
    host: process.env.BREVO_SMTP_HOST || 'smtp.brevo.com',
    port: parseInt(process.env.BREVO_SMTP_PORT) || 587,
    secure: false,
    auth: {
        user: process.env.BREVO_SMTP_USER || '',
        pass: process.env.BREVO_SMTP_PASS || '',
    },
});

// Verify on startup (just log, don't crash)
transporter.verify((err) => {
    if (err) console.error('Email transporter error:', err.message);
    else console.log('Email transporter ready');
});

/**
 * Sends a welcome email (plain text version).
 */
async function sendWelcomeEmail(to, name, tempPassword, admissionNumber, loginUrl = null) {
    const baseUrl = loginUrl || process.env.LOGIN_URL || 'https://your-lms.com/login';
    const fromEmail = process.env.BREVO_FROM_EMAIL;
    const fromName = process.env.BREVO_FROM_NAME || 'OCTET LMS';

    // Guard against missing fromEmail
    if (!fromEmail) {
        console.error('BREVO_FROM_EMAIL not set - cannot send email');
        return;
    }

    const subject = `Welcome to OCTET – Admission No: ${admissionNumber}`;
    const text = `
Hey ${name},

Raju Sir wanted your LMS active immediately so you can access all class notes and the exclusive Exam Eve Study material. 

Your Chemistry@OCTET LMS portal is ready:

Admission No:  ${admissionNumber}
Login Email:   ${to}
Temp Password: ${tempPassword}

Portal: ${baseUrl}

Good Luck For your Exams !!!

Let's crush the chemistry boards.

-- Chemistry@OCTET
    `.trim();

    const html = wrapEmailHtml({
        preheader: `Your Chemistry@OCTET LMS portal is ready — Admission No: ${admissionNumber}`,
        bodyHtml: `
            <p style="margin:0 0 16px;">Hey ${name},</p>
            <p style="margin:0 0 16px;">Raju Sir wanted your LMS active immediately so you can access all class notes and the exclusive Exam Eve Study material.</p>
            <p style="margin:0 0 8px;">Your Chemistry@OCTET LMS portal is ready:</p>
            <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 16px;width:100%;background:#faf9fb;border-radius:6px;">
                <tr><td style="padding:6px 14px;color:#6b6478;font-size:13px;">Admission No</td><td style="padding:6px 14px;font-weight:bold;">${admissionNumber}</td></tr>
                <tr><td style="padding:6px 14px;color:#6b6478;font-size:13px;">Login Email</td><td style="padding:6px 14px;font-weight:bold;">${to}</td></tr>
                <tr><td style="padding:6px 14px;color:#6b6478;font-size:13px;">Temp Password</td><td style="padding:6px 14px;font-weight:bold;">${tempPassword}</td></tr>
            </table>
            <p style="margin:0 0 16px;">Good luck for your exams — let's crush the chemistry boards.</p>
        `,
        cta: { text: 'Open your portal', url: baseUrl },
    });

    try {
        const info = await transporter.sendMail({
            from: `"${fromName}" <${fromEmail}>`,
            to: to,
            subject: subject,
            text: text,
            html: html,
        });
        console.log(`Welcome email sent to ${to} (${info.messageId})`);
    } catch (err) {
        console.error(`Failed to send email to ${to}:`, err.message);
        // Do NOT throw – let the import continue
    }
}

/**
 * Sends a password reset email (plain text version).
 */
async function sendPasswordResetEmail(to, resetLink) {
    const fromEmail = process.env.BREVO_FROM_EMAIL;
    const fromName = process.env.BREVO_FROM_NAME || 'OCTET LMS';

    if (!fromEmail) {
        console.error('BREVO_FROM_EMAIL not set - cannot send reset email');
        return;
    }

    const subject = 'Reset your OCTET LMS password';
    const text = `
Hello,

Click the link below to reset your password (valid for 1 hour):

${resetLink}

If you didn't request this, ignore this email.

– OCTET Team
    `.trim();

    const html = wrapEmailHtml({
        preheader: 'Reset your Chemistry@OCTET LMS password',
        bodyHtml: `
            <p style="margin:0 0 16px;">Hello,</p>
            <p style="margin:0 0 16px;">Click the button below to reset your password. This link is valid for 1 hour.</p>
            <p style="margin:0 0 16px;color:#6b6478;font-size:13px;">If you didn't request this, you can safely ignore this email.</p>
        `,
        cta: { text: 'Reset password', url: resetLink },
    });

    try {
        const info = await transporter.sendMail({
            from: `"${fromName}" <${fromEmail}>`,
            to: to,
            subject: subject,
            text: text,
            html: html,
        });
        console.log(`Reset email sent to ${to} (${info.messageId})`);
    } catch (err) {
        console.error(`Failed to send reset email to ${to}:`, err.message);
    }
}

/**
 * Sends the LMS-branded notification for an online class being scheduled,
 * rescheduled, or cancelled. This is in addition to (not instead of) the
 * Google Calendar invitation itself — Calendar's own `sendUpdates: 'all'`
 * (see googleCalendar.service.js) already delivers the standard Google
 * invite/notification; this is the LMS's own copy of that notification,
 * sent through the app's existing email system.
 */
async function sendOnlineClassEmail(to, {
    studentName,
    title,
    batchName,
    description,
    scheduledStart,
    scheduledEnd,
    timezone,
    meetUrl,
    action, // 'scheduled' | 'rescheduled' | 'cancelled'
}) {
    const fromEmail = process.env.BREVO_FROM_EMAIL;
    const fromName = process.env.BREVO_FROM_NAME || 'OCTET LMS';

    if (!fromEmail) {
        console.error('BREVO_FROM_EMAIL not set – cannot send online class email');
        return;
    }

    const loginUrl = process.env.LOGIN_URL || 'https://your-lms.com/login';
    const zone = timezone || 'Asia/Kolkata';

    const startLabel = new Date(scheduledStart).toLocaleString('en-IN', {
        timeZone: zone,
        weekday: 'long', day: '2-digit', month: 'long', year: 'numeric',
        hour: '2-digit', minute: '2-digit', hour12: true,
    });
    const endLabel = new Date(scheduledEnd).toLocaleString('en-IN', {
        timeZone: zone, hour: '2-digit', minute: '2-digit', hour12: true,
    });

    const actionLabel = action === 'cancelled' ? 'Cancelled' : action === 'rescheduled' ? 'Rescheduled' : 'Scheduled';
    const subject = `Online Class ${actionLabel}${batchName ? ` – ${batchName}` : ''}: ${title}`;

    const lines = [
        `Hi ${studentName || 'there'},`,
        '',
        action === 'cancelled'
            ? 'The following online class has been cancelled:'
            : action === 'rescheduled'
                ? 'The following online class has been rescheduled:'
                : 'A new online class has been scheduled:',
        '',
        title,
        batchName ? `Batch: ${batchName}` : null,
        description || null,
        '',
        `Date & Time: ${startLabel} – ${endLabel}`,
    ].filter((l) => l !== null);

    if (action !== 'cancelled' && meetUrl) {
        lines.push('', 'Google Meet:', meetUrl);
    }

    lines.push('', `The class is also available in your LMS portal: ${loginUrl}`, '', '-- OCTET Team');

    const bodyHtml = `
        <p style="margin:0 0 16px;">Hi ${studentName || 'there'},</p>
        <p style="margin:0 0 16px;">
            ${action === 'cancelled' ? 'The following online class has been cancelled:' : action === 'rescheduled' ? 'The following online class has been rescheduled:' : 'A new online class has been scheduled:'}
        </p>
        <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 16px;width:100%;background:#faf9fb;border-radius:6px;">
            <tr><td style="padding:6px 14px;color:#6b6478;font-size:13px;">Title</td><td style="padding:6px 14px;font-weight:bold;">${title}</td></tr>
            ${batchName ? `<tr><td style="padding:6px 14px;color:#6b6478;font-size:13px;">Batch</td><td style="padding:6px 14px;">${batchName}</td></tr>` : ''}
            <tr><td style="padding:6px 14px;color:#6b6478;font-size:13px;">When</td><td style="padding:6px 14px;">${startLabel} – ${endLabel}</td></tr>
        </table>
        ${description ? `<p style="margin:0 0 16px;">${description}</p>` : ''}
    `;
    const html = wrapEmailHtml({
        preheader: `${actionLabel}: ${title}`,
        bodyHtml,
        cta: action !== 'cancelled' && meetUrl ? { text: 'Join Google Meet', url: meetUrl } : { text: 'Open your portal', url: loginUrl },
    });

    try {
        const info = await transporter.sendMail({
            from: `"${fromName}" <${fromEmail}>`,
            to,
            subject,
            text: lines.join('\n'),
            html,
        });
        console.log(`Online class ${action} email sent to ${to} (${info.messageId})`);
    } catch (err) {
        console.error(`Failed to send online class email to ${to}:`, err.message);
        // Do NOT throw – a notification failure must never undo a
        // successfully scheduled/rescheduled/cancelled class.
    }
}

/**
 * Generic sender with optional attachments and multiple recipients — used
 * by the parent/student report emails (monthly PDF reports, same-day
 * absence alerts), where subject/body/recipients/attachments all vary per
 * call, unlike the templated functions above.
 *
 * Unlike the other functions here, this one THROWS on failure instead of
 * swallowing the error — the caller (parentReports.service.js) needs to
 * know a send failed so it can record that accurately rather than
 * silently mark a report as sent when it wasn't.
 */
/**
 * `html`/`cta`/`trackingPixelUrl` are optional — when omitted, `text` is
 * auto-converted into the same branded template every other email in the
 * app uses, so every caller gets the formal Chemistry@OCTET look without
 * having to build HTML itself.
 */
async function sendEmail({ to, subject, text, html, cta, trackingPixelUrl, attachments }) {
    const fromEmail = process.env.BREVO_FROM_EMAIL;
    const fromName = process.env.BREVO_FROM_NAME || 'OCTET LMS';

    if (!fromEmail) {
        throw new Error('BREVO_FROM_EMAIL not set - cannot send email');
    }
    const recipients = Array.isArray(to) ? to.filter(Boolean) : [to].filter(Boolean);
    if (recipients.length === 0) {
        throw new Error('No recipients supplied');
    }

    const finalHtml = wrapEmailHtml({
        preheader: subject,
        bodyHtml: html || textToHtmlParagraphs(text || ''),
        cta,
        trackingPixelUrl,
    });

    const info = await transporter.sendMail({
        from: `"${fromName}" <${fromEmail}>`,
        to: recipients.join(', '),
        subject,
        text,
        html: finalHtml,
        attachments,
    });
    return info;
}

module.exports = { sendWelcomeEmail, sendPasswordResetEmail, sendOnlineClassEmail, sendEmail };