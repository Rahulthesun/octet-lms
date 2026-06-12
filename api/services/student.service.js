/**
 * services/student.service.js
 * ─────────────────────────────────────────────────────────────
 * All business logic for student management.
 * - Talks to Supabase (DB + Auth)
 * - Generates admission numbers, usernames, temp passwords
 * - Sends emails
 * - No HTTP knowledge (no req/res)
 * ─────────────────────────────────────────────────────────────
 */

const { supabaseAdmin } = require("../config/supabase");
const { generateTempPassword, generateUsername } = require("../utils/helpers");
const { sendWelcomeEmail } = require("./email.service");

const { createStudentAuthUser , deleteStudentAuthUser } = require("../utils/auth");




// Helper: get admission number from DB function
async function generateAdmissionNumber() {
    const { data, error } = await supabaseAdmin.rpc("generate_admission_number");
    if (error) throw new Error(`Admission number generation failed: ${error.message}`);
    return data;
}

// ========================= GET /students =========================
async function getAllStudents({ batch, mode, status, search, limit = 100, offset = 0 }) {
    let query = supabaseAdmin.from("students").select("*", { count: "exact" });
    if (batch) query = query.eq("preferred_batch", batch);
    if (mode) query = query.eq("learning_mode", mode);
    if (status) query = query.eq("status", status);
    if (search) {
        query = query.or(
            `name.ilike.%${search}%,` +
            `email.ilike.%${search}%,` +
            `admission_number.ilike.%${search}%,` +
            `mobile_number.ilike.%${search}%`
        );
    }
    const { data, error, count } = await query
        .order("created_at", { ascending: false })
        .range(offset, offset + limit - 1);
    if (error) throw error;
    // Remove sensitive fields
    const sanitized = data.map(({ password_hash, temp_password, ...rest }) => rest);
    return {
        success: true,
        data: sanitized,
        pagination: { total: count, limit: parseInt(limit), offset: parseInt(offset), has_more: offset + sanitized.length < count }
    };
}

// ========================= GET /students/pending =========================
async function getPendingStudents() {
    const { data, error } = await supabaseAdmin
        .from("students")
        .select("*")
        .eq("status", "PENDING")
        .order("created_at", { ascending: false });
    if (error) throw error;
    const sanitized = data.map(({ password_hash, temp_password, ...rest }) => rest);
    return { success: true, count: sanitized.length, applications: sanitized };
}

// ========================= GET /students/:id =========================
async function getStudentById(id) {
    const { data, error } = await supabaseAdmin
        .from("students")
        .select("*")
        .eq("id", id)
        .single();
    if (error) return null;
    delete data.password_hash;
    delete data.temp_password;
    return { success: true, data };
}

// ========================= POST /students =========================
async function createStudent(studentData) {
    const { name, email, preferred_batch, learning_mode, ...rest } = studentData;
    if (!name || !email) throw new Error("Name and email are required");
    // Check existing
    const { data: existing } = await supabaseAdmin
        .from("students")
        .select("id")
        .eq("email", email)
        .maybeSingle();
    if (existing) throw new Error("Student with this email already exists");
    const { data, error } = await supabaseAdmin
        .from("students")
        .insert({
            name,
            email,
            preferred_batch: preferred_batch || "EVENING",
            learning_mode: learning_mode || "OFFLINE",
            ...rest,
            status: "PENDING"
        })
        .select()
        .single();
    if (error) throw error;
    delete data.password_hash;
    delete data.temp_password;
    return { success: true, message: "Application submitted", data };
}

// ========================= PUT /students/:id =========================
async function updateStudent(id, updates) {
    // Prevent updating sensitive/system fields
    delete updates.id;
    delete updates.created_at;
    delete updates.password_hash;
    delete updates.temp_password;
    delete updates.admission_number; // manual change not allowed
    delete updates.auth_user_id;
    const { data, error } = await supabaseAdmin
        .from("students")
        .update(updates)
        .eq("id", id)
        .select()
        .single();
    if (error) throw error;
    return { success: true, data };
}

// ========================= DELETE /students/:id =========================
async function deleteStudent(id) {
    // First get the student to check for auth_user_id
    const { data: student } = await supabaseAdmin
        .from("students")
        .select("auth_user_id")
        .eq("id", id)
        .single();
    if (student?.auth_user_id) {
        // Delete the Supabase Auth user as well
        await deleteStudentAuthUser(student.auth_user_id);    }
    const { error } = await supabaseAdmin
        .from("students")
        .delete()
        .eq("id", id);
    if (error) throw error;
    return { success: true, message: "Student deleted" };
}

// ========================= POST /students/bulk-import =========================
async function bulkImportStudents(studentsArray) {
    if (!studentsArray || !studentsArray.length) throw new Error("No students provided");
    const results = [];
    const errors = [];
    for (const student of studentsArray) {
        try {
            const { data: existing } = await supabaseAdmin
                .from("students")
                .select("email")
                .eq("email", student.email)
                .maybeSingle();
            if (existing) {
                errors.push({ email: student.email, error: "Already exists" });
                continue;
            }
            const admissionNumber = await generateAdmissionNumber();
            const { authUserId, tempPassword, username } = await createStudentAuthUser(student, admissionNumber);
            
            // Create auth user
            const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
                email: student.email,
                password: tempPassword,
                email_confirm: true,
                user_metadata: {
                    name: student.name,
                    role: "student",
                    admission_number: admissionNumber
                }
            });
            if (authError) throw authError;
            // Insert into students table – use auth user ID as primary key
            const { data: newStudent, error: dbError } = await supabaseAdmin
                .from("students")
                .insert({
                    id: authUser.user.id,
                    auth_user_id: authUser.user.id,
                    admission_number: admissionNumber,
                    name: student.name,
                    email: student.email,
                    preferred_batch: student.preferred_batch || "EVENING",
                    learning_mode: student.learning_mode || "OFFLINE",
                    status: "APPROVED",
                    username,
                    ...student
                })
                .select()
                .single();
            if (dbError) throw dbError;
            await sendWelcomeEmail(student.email, student.name, tempPassword, admissionNumber);
            results.push(newStudent);
        } catch (err) {
            errors.push({ email: student.email, error: err.message });
        }
    }
    return { success: true, imported: results.length, results, errors };
}

// ========================= POST /students/:id/approve =========================
async function approveStudent(id) {
    // Get pending student
    const { data: student, error: fetchError } = await supabaseAdmin
        .from("students")
        .select("*")
        .eq("id", id)
        .eq("status", "PENDING")
        .single();
    if (fetchError || !student) throw new Error("Pending student not found");
    const admissionNumber = await generateAdmissionNumber();
    const { authUserId, tempPassword, username } = await createStudentAuthUser(student, admissionNumber);
    // Create auth user
    const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email: student.email,
        password: tempPassword,
        email_confirm: true,
        user_metadata: {
            name: student.name,
            role: "student",
            admission_number: admissionNumber
        }
    });
    if (authError) throw authError;
    // Update student record
    const { data: approved, error: updateError } = await supabaseAdmin
        .from("students")
        .update({
            id: authUser.user.id,
            auth_user_id: authUser.user.id,
            admission_number: admissionNumber,
            status: "APPROVED",
            username
        })
        .eq("id", id)
        .select()
        .single();
    if (updateError) throw updateError;
    await sendWelcomeEmail(student.email, student.name, tempPassword, admissionNumber);
    return {
        success: true,
        message: "Student approved",
        student: approved,
        credentials: { email: student.email, temp_password: tempPassword }
    };
}

// ========================= POST /students/:id/reject =========================
async function rejectStudent(id, reason) {
    const { data, error } = await supabaseAdmin
        .from("students")
        .update({ status: "REJECTED", admin_notes: reason })
        .eq("id", id)
        .eq("status", "PENDING")
        .select()
        .single();
    if (error) throw error;
    return { success: true, message: "Student rejected", data };
}

// ========================= GET /students/batch/:batchId =========================
async function getStudentsByBatch(batchId) {
    if (!["MORNING", "EVENING", "NIGHT"].includes(batchId)) {
        throw new Error("Invalid batch");
    }
    const { data, error } = await supabaseAdmin
        .from("students")
        .select("id, name, email, admission_number, learning_mode, status")
        .eq("preferred_batch", batchId)
        .eq("status", "APPROVED")
        .order("name");
    if (error) throw error;
    return { success: true, batch: batchId, count: data.length, students: data };
}

// ========================= GET /students/stats/dashboard =========================
async function getDashboardStats() {
    // Get counts
    const total = await supabaseAdmin.from("students").select("*", { count: "exact", head: true });
    const pending = await supabaseAdmin.from("students").select("*", { count: "exact", head: true }).eq("status", "PENDING");
    const approved = await supabaseAdmin.from("students").select("*", { count: "exact", head: true }).eq("status", "APPROVED");
    const rejected = await supabaseAdmin.from("students").select("*", { count: "exact", head: true }).eq("status", "REJECTED");
    const morning = await supabaseAdmin.from("students").select("*", { count: "exact", head: true }).eq("preferred_batch", "MORNING").eq("status", "APPROVED");
    const evening = await supabaseAdmin.from("students").select("*", { count: "exact", head: true }).eq("preferred_batch", "EVENING").eq("status", "APPROVED");
    const night = await supabaseAdmin.from("students").select("*", { count: "exact", head: true }).eq("preferred_batch", "NIGHT").eq("status", "APPROVED");
    const online = await supabaseAdmin.from("students").select("*", { count: "exact", head: true }).eq("learning_mode", "ONLINE").eq("status", "APPROVED");
    const offline = await supabaseAdmin.from("students").select("*", { count: "exact", head: true }).eq("learning_mode", "OFFLINE").eq("status", "APPROVED");
    const hybrid = await supabaseAdmin.from("students").select("*", { count: "exact", head: true }).eq("learning_mode", "HYBRID").eq("status", "APPROVED");
    return {
        success: true,
        stats: {
            total: total.count,
            pending: pending.count,
            approved: approved.count,
            rejected: rejected.count,
            by_batch: { MORNING: morning.count, EVENING: evening.count, NIGHT: night.count },
            by_mode: { ONLINE: online.count, OFFLINE: offline.count, HYBRID: hybrid.count }
        }
    };
}

module.exports = {
    getAllStudents,
    getPendingStudents,
    getStudentById,
    createStudent,
    updateStudent,
    deleteStudent,
    bulkImportStudents,
    approveStudent,
    rejectStudent,
    getStudentsByBatch,
    getDashboardStats
};