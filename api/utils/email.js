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
    if (err) console.error('❌ Email transporter error:', err.message);
    else console.log('✅ Email transporter ready');
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
        console.error('❌ BREVO_FROM_EMAIL not set – cannot send email');
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
        console.log(`✅ Welcome email sent to ${to} (${info.messageId})`);
    } catch (err) {
        console.error(`❌ Failed to send email to ${to}:`, err.message);
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
        console.error('❌ BREVO_FROM_EMAIL not set – cannot send reset email');
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
        console.log(`✅ Reset email sent to ${to} (${info.messageId})`);
    } catch (err) {
        console.error(`❌ Failed to send reset email to ${to}:`, err.message);
    }
}

module.exports = { sendWelcomeEmail, sendPasswordResetEmail };