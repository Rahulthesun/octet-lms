/**
 * services/email.js
 * ─────────────────────────────────────────────────────────────
 * Handles all outbound emails (welcome, password reset, etc.)
 * Uses nodemailer with Gmail SMTP (configurable).
 * ─────────────────────────────────────────────────────────────
 */

const nodemailer = require('nodemailer');

// Create reusable transporter
const transporter = nodemailer.createTransport({
    service: 'gmail',               // or 'outlook', 'sendgrid', etc.
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
    },
});

/**
 * Sends a welcome email to a newly approved student containing login credentials.
 * @param {string} to - Recipient email address
 * @param {string} name - Student's name
 * @param {string} tempPassword - Temporary plaintext password
 * @param {string} admissionNumber - Generated admission number (e.g., OCTET-2026-001)
 * @param {string} [loginUrl] - Optional custom login URL (defaults to env variable)
 * @returns {Promise<void>}
 */
async function sendWelcomeEmail(to, name, tempPassword, admissionNumber, loginUrl = null) {
    const baseUrl = loginUrl || process.env.LOGIN_URL || 'https://your-lms.com/login';
    const html = `
        <!DOCTYPE html>
        <html>
        <head><meta charset="UTF-8"></head>
        <body style="font-family: Arial, sans-serif; background-color: #f4f4f4; margin: 0; padding: 20px;">
            <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
                <div style="background: #4F46E5; padding: 20px; text-align: center;">
                    <h1 style="color: white; margin: 0;">Welcome to OCTET LMS</h1>
                </div>
                <div style="padding: 30px;">
                    <p>Dear <strong>${name}</strong>,</p>
                    <p>Your admission has been confirmed. Use the credentials below to access the Learning Management System.</p>
                    
                    <div style="background: #f3f4f6; padding: 15px; border-radius: 6px; margin: 20px 0;">
                        <p><strong>Admission Number:</strong> ${admissionNumber}</p>
                        <p><strong>Login Email:</strong> ${to}</p>
                        <p><strong>Temporary Password:</strong> <code style="background: #e5e7eb; padding: 4px 8px; border-radius: 4px;">${tempPassword}</code></p>
                    </div>
                    
                    <p style="text-align: center; margin: 30px 0;">
                        <a href="${baseUrl}" style="background: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold;">
                            Log in to OCTET LMS
                        </a>
                    </p>
                    
                    <p><strong>Important security note:</strong> Please change your password after your first login.</p>
                    <p>If you didn't request this, please ignore this email.</p>
                    <hr style="margin: 20px 0;">
                    <p style="font-size: 12px; color: #6b7280;">OCTET Learning Management System</p>
                </div>
            </div>
        </body>
        </html>
    `;

    const text = `
Welcome to OCTET LMS, ${name}!

Your admission has been confirmed. Use the credentials below to log in.

Admission Number: ${admissionNumber}
Login Email: ${to}
Temporary Password: ${tempPassword}

Login URL: ${baseUrl}

Please change your password after first login.

If you didn't request this, ignore this email.

– OCTET Team
    `;

    await transporter.sendMail({
        from: `"OCTET LMS" <${process.env.EMAIL_USER}>`,
        to: to,
        subject: `Welcome to OCTET – Admission Number: ${admissionNumber}`,
        html: html,
        text: text,
    });
}

/**
 * Sends a password reset email using Supabase's built‑in template (optional).
 * This is a wrapper – you might not need it because Supabase sends its own email.
 * Provided for completeness.
 * @param {string} to - Recipient email address
 * @param {string} resetLink - The magic link (provided by Supabase)
 * @returns {Promise<void>}
 */
async function sendPasswordResetEmail(to, resetLink) {
    const html = `
        <div style="font-family: Arial, sans-serif;">
            <h2>Reset your OCTET LMS password</h2>
            <p>Click the link below to set a new password. This link expires in 1 hour.</p>
            <a href="${resetLink}" style="background: #4F46E5; color: white; padding: 10px 20px; text-decoration: none;">Reset Password</a>
            <p>If you didn't request this, ignore this email.</p>
        </div>
    `;
    await transporter.sendMail({
        from: `"OCTET LMS" <${process.env.EMAIL_USER}>`,
        to: to,
        subject: 'Reset your OCTET LMS password',
        html,
    });
}

module.exports = {
    sendWelcomeEmail,
    sendPasswordResetEmail,
};/**
 * services/email.js
 * ─────────────────────────────────────────────────────────────
 * Handles all outbound emails (welcome, password reset, etc.)
 * Uses nodemailer with Gmail SMTP (configurable).
 * ─────────────────────────────────────────────────────────────
 */

const nodemailer = require('nodemailer');

// Create reusable transporter
const transporter = nodemailer.createTransport({
    service: 'gmail',               // or 'outlook', 'sendgrid', etc.
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
    },
});

/**
 * Sends a welcome email to a newly approved student containing login credentials.
 * @param {string} to - Recipient email address
 * @param {string} name - Student's name
 * @param {string} tempPassword - Temporary plaintext password
 * @param {string} admissionNumber - Generated admission number (e.g., OCTET-2026-001)
 * @param {string} [loginUrl] - Optional custom login URL (defaults to env variable)
 * @returns {Promise<void>}
 */
async function sendWelcomeEmail(to, name, tempPassword, admissionNumber, loginUrl = null) {
    const baseUrl = loginUrl || process.env.LOGIN_URL || 'https://your-lms.com/login';
    const html = `
        <!DOCTYPE html>
        <html>
        <head><meta charset="UTF-8"></head>
        <body style="font-family: Arial, sans-serif; background-color: #f4f4f4; margin: 0; padding: 20px;">
            <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
                <div style="background: #4F46E5; padding: 20px; text-align: center;">
                    <h1 style="color: white; margin: 0;">Welcome to OCTET LMS</h1>
                </div>
                <div style="padding: 30px;">
                    <p>Dear <strong>${name}</strong>,</p>
                    <p>Your admission has been confirmed. Use the credentials below to access the Learning Management System.</p>
                    
                    <div style="background: #f3f4f6; padding: 15px; border-radius: 6px; margin: 20px 0;">
                        <p><strong>Admission Number:</strong> ${admissionNumber}</p>
                        <p><strong>Login Email:</strong> ${to}</p>
                        <p><strong>Temporary Password:</strong> <code style="background: #e5e7eb; padding: 4px 8px; border-radius: 4px;">${tempPassword}</code></p>
                    </div>
                    
                    <p style="text-align: center; margin: 30px 0;">
                        <a href="${baseUrl}" style="background: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold;">
                            Log in to OCTET LMS
                        </a>
                    </p>
                    
                    <p><strong>Important security note:</strong> Please change your password after your first login.</p>
                    <p>If you didn't request this, please ignore this email.</p>
                    <hr style="margin: 20px 0;">
                    <p style="font-size: 12px; color: #6b7280;">OCTET Learning Management System</p>
                </div>
            </div>
        </body>
        </html>
    `;

    const text = `
Welcome to OCTET LMS, ${name}!

Your admission has been confirmed. Use the credentials below to log in.

Admission Number: ${admissionNumber}
Login Email: ${to}
Temporary Password: ${tempPassword}

Login URL: ${baseUrl}

Please change your password after first login.

If you didn't request this, ignore this email.

– OCTET Team
    `;

    await transporter.sendMail({
        from: `"OCTET LMS" <${process.env.EMAIL_USER}>`,
        to: to,
        subject: `Welcome to OCTET – Admission Number: ${admissionNumber}`,
        html: html,
        text: text,
    });
}

/**
 * Sends a password reset email using Supabase's built‑in template (optional).
 * This is a wrapper – you might not need it because Supabase sends its own email.
 * Provided for completeness.
 * @param {string} to - Recipient email address
 * @param {string} resetLink - The magic link (provided by Supabase)
 * @returns {Promise<void>}
 */
async function sendPasswordResetEmail(to, resetLink) {
    const html = `
        <div style="font-family: Arial, sans-serif;">
            <h2>Reset your OCTET LMS password</h2>
            <p>Click the link below to set a new password. This link expires in 1 hour.</p>
            <a href="${resetLink}" style="background: #4F46E5; color: white; padding: 10px 20px; text-decoration: none;">Reset Password</a>
            <p>If you didn't request this, ignore this email.</p>
        </div>
    `;
    await transporter.sendMail({
        from: `"OCTET LMS" <${process.env.EMAIL_USER}>`,
        to: to,
        subject: 'Reset your OCTET LMS password',
        html,
    });
}

module.exports = {
    sendWelcomeEmail,
    sendPasswordResetEmail,
};