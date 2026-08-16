// services/email.service.js
const nodemailer = require('nodemailer');

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

    try {
        const info = await transporter.sendMail({
            from: `"${fromName}" <${fromEmail}>`,
            to: to,
            subject: subject,
            text: text,
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

    try {
        const info = await transporter.sendMail({
            from: `"${fromName}" <${fromEmail}>`,
            to: to,
            subject: subject,
            text: text,
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

    try {
        const info = await transporter.sendMail({
            from: `"${fromName}" <${fromEmail}>`,
            to,
            subject,
            text: lines.join('\n'),
        });
        console.log(`Online class ${action} email sent to ${to} (${info.messageId})`);
    } catch (err) {
        console.error(`Failed to send online class email to ${to}:`, err.message);
        // Do NOT throw – a notification failure must never undo a
        // successfully scheduled/rescheduled/cancelled class.
    }
}

module.exports = { sendWelcomeEmail, sendPasswordResetEmail, sendOnlineClassEmail };