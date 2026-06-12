/**
 * services/auth.js
 * ─────────────────────────────────────────────────────────────
 * Helper service for managing student authentication via Supabase.
 * All calls use the service role key (bypasses RLS).
 * ─────────────────────────────────────────────────────────────
 */

const { supabaseAdmin } = require("../config/supabase");
const { generateTempPassword, generateUsername } = require("../utils/helpers");

/**
 * Creates a new auth user in Supabase for an approved student.
 *
 * @param {Object} student - The student record from `public.students` (must contain email, name, etc.)
 * @param {string} admissionNumber - Pre‑generated admission number (OCTET-2026-XXX)
 * @returns {Promise<Object>} - Returns { authUserId, tempPassword, username }
 * @throws {Error} - If user creation fails (duplicate email, invalid input, etc.)
 */
async function createStudentAuthUser(student, admissionNumber) {
    const tempPassword = generateTempPassword();
    const username = generateUsername(student.name);

    const { data, error } = await supabaseAdmin.auth.admin.createUser({
        email: student.email,
        password: tempPassword,
        email_confirm: true,                // No extra confirmation email
        user_metadata: {
            name: student.name,
            role: "student",
            admission_number: admissionNumber,
            batch: student.preferred_batch,
            learning_mode: student.learning_mode,
        },
    });

    if (error) {
        throw new Error(`Auth user creation failed for ${student.email}: ${error.message}`);
    }

    return {
        authUserId: data.user.id,
        tempPassword,
        username,
    };
}

/**
 * Deletes an auth user by ID (used when deleting a student).
 *
 * @param {string} authUserId - UUID from `auth.users`
 * @returns {Promise<void>}
 */
async function deleteStudentAuthUser(authUserId) {
    const { error } = await supabaseAdmin.auth.admin.deleteUser(authUserId);
    if (error) {
        throw new Error(`Failed to delete auth user ${authUserId}: ${error.message}`);
    }
}

/**
 * Updates a student's password (e.g., after first login or admin reset).
 * Prefer using Supabase's built‑in "forgot password" flow, but this is available.
 *
 * @param {string} authUserId - UUID from `auth.users`
 * @param {string} newPassword - Plaintext new password
 * @returns {Promise<void>}
 */
async function updateStudentPassword(authUserId, newPassword) {
    const { error } = await supabaseAdmin.auth.admin.updateUserById(authUserId, {
        password: newPassword,
    });
    if (error) throw new Error(`Password update failed: ${error.message}`);
}

/**
 * Sends a password reset email to the student (uses Supabase's built‑in template).
 *
 * @param {string} email - Student's email address
 * @param {string} redirectUrl - Frontend reset page (e.g., https://lms.com/reset-password)
 * @returns {Promise<void>}
 */
async function sendPasswordResetEmail(email, redirectUrl) {
    const { error } = await supabaseAdmin.auth.resetPasswordForEmail(email, {
        redirectTo: redirectUrl,
    });
    if (error) throw new Error(`Reset email could not be sent: ${error.message}`);
}

module.exports = {
    createStudentAuthUser,
    deleteStudentAuthUser,
    updateStudentPassword,
    sendPasswordResetEmail,
};