/**
 * utils/helpers.js
 * ─────────────────────────────────────────────────────────────
 * Reusable utility functions for the entire OCTET LMS backend.
 * ─────────────────────────────────────────────────────────────
 */

/**
 * Generates a random temporary password for a new student.
 * @param {number} length - Desired password length (default 10)
 * @returns {string} - Alphanumeric password
 */
function generateTempPassword(length = 10) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let password = '';
    for (let i = 0; i < length; i++) {
        password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
}

/**
 * Generates a unique username from the student's full name.
 * Format: first 8 letters of name (alphanumeric only) + random 3‑digit number.
 * @param {string} name - Student's full name
 * @returns {string} - e.g., "arjunkum742"
 */
function generateUsername(name) {
    const base = name.toLowerCase().replace(/[^a-z]/g, '').substring(0, 8);
    const random = Math.floor(Math.random() * 1000);
    return `${base}${random}`;
}

/**
 * Validates if a given batch ID is one of the three allowed.
 * @param {string} batch - Batch ID to check
 * @returns {boolean}
 */
function isValidBatch(batch) {
    return ['MORNING', 'EVENING', 'NIGHT'].includes(batch);
}

/**
 * Validates learning mode.
 * @param {string} mode - Learning mode to check
 * @returns {boolean}
 */
function isValidLearningMode(mode) {
    return ['ONLINE', 'OFFLINE', 'HYBRID'].includes(mode);
}

/**
 * Sanitizes a student object by removing sensitive fields (password_hash, temp_password).
 * @param {Object} student - Raw student object from Supabase
 * @returns {Object} - Clean student object
 */
function sanitizeStudent(student) {
    if (!student) return null;
    const { password_hash, temp_password, ...clean } = student;
    return clean;
}

/**
 * Delays execution for a given number of milliseconds (useful for rate limiting).
 * @param {number} ms - Milliseconds to sleep
 * @returns {Promise<void>}
 */
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

module.exports = {
    generateTempPassword,
    generateUsername,
    isValidBatch,
    isValidLearningMode,
    sanitizeStudent,
    sleep,
};