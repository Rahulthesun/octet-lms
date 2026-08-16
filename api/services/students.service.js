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
const { uploadStudentDocument } = require("./upload.service");
const  supabase  = require("../config/supabase");
const { generateTempPassword, generateUsername , generateAdmissionNumber } = require("../utils/helpers");
const { sendWelcomeEmail } = require("../utils/email");

const { createStudentAuthUser , deleteStudentAuthUser } = require("../utils/auth");
console.log('Checking environment:');
console.log('BREVO_FROM_EMAIL:', process.env.BREVO_FROM_EMAIL);
console.log('BREVO_SMTP_HOST:', process.env.BREVO_SMTP_HOST);

// ─── Attendance bridge ────────────────────────────────────────────────────
// The attendance system (calendar, roster, summary) reads enrollment from
// `batch_enrollments`, not from `students.preferred_batch`. Every place that
// creates/approves an APPROVED student must also mirror them into
// batch_enrollments, or their attendance calendar stays permanently blank.
async function enrollInPreferredBatch(studentId, preferredBatch) {
    if (!preferredBatch) return;
    const { error } = await supabase
        .from("batch_enrollments")
        .upsert(
            { batch_id: preferredBatch, student_id: studentId },
            { onConflict: "batch_id,student_id", ignoreDuplicates: true }
        );
    if (error) {
        console.error(`[batch_enrollments] upsert failed for student ${studentId} / batch ${preferredBatch}:`, error.message);
    }
}

// ========================= GET /students =========================
async function getAllStudents({ batch, mode, status, search, limit = 100, offset = 0 }) {
    let query = supabase.from("students").select("*", { count: "exact" });
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
    const { data, error } = await supabase
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
    const { data, error } = await supabase
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
async function createStudent(studentData, files) {

    const {

        name,
        email,

        date_of_birth,

        mobile_number,
        whatsapp_number,
        telegram_number,

        tenth_school,
        tenth_score,

        class_grade,
        school_college,

        subjects,

        maths_tuition,
        physics_tuition,
        other_tuition,

        neet_jee_details,

        future_plan,

        preferred_batch,
        learning_mode,

        father_name,
        father_mobile,
        father_whatsapp,
        father_telegram,
        father_email,
        father_profession,

        mother_name,
        mother_mobile,
        mother_whatsapp,
        mother_telegram,
        mother_email,
        mother_profession,

        address,
        landmark,
        city,
        pincode,

    } = studentData;

    // Upload documents
    const idCardUrl = files?.id_card?.[0]
        ? await uploadStudentDocument(files.id_card[0], "id-cards")
        : null;

    const marksheetUrl = files?.marksheet?.[0]
        ? await uploadStudentDocument(files.marksheet[0], "marksheets")
        : null;

    if (!name || !email) {
        throw new Error("Name and email are required");
    }

    // Check duplicate email
    const { data: existing } = await supabase
        .from("students")
        .select("id")
        .eq("email", email)
        .maybeSingle();

    if (existing) {
        throw new Error("Student with this email already exists");
    }

    // Parse subjects
    let parsedSubjects = [];

    try {
        parsedSubjects = JSON.parse(subjects || "[]");
    } catch {
        parsedSubjects = subjects
            ? subjects.split(",").map(s => s.trim())
            : [];
    }

    const { data, error } = await supabase
        .from("students")
        .insert({

            // Student
            name,
            email,
            date_of_birth,

            mobile_number,
            whatsapp_number,
            telegram_number,

            // Academic
            tenth_school,
            tenth_score,

            class_grade,
            school_college,

            subjects: parsedSubjects,

            maths_tuition,
            physics_tuition,
            other_tuition,

            neet_jee_details,

            future_plan,

            preferred_batch: preferred_batch || "EVENING",

            learning_mode: learning_mode || "OFFLINE",

            // Father
            father_name,
            father_mobile,
            father_whatsapp,
            father_telegram,
            father_email,
            father_profession,

            // Mother
            mother_name,
            mother_mobile,
            mother_whatsapp,
            mother_telegram,
            mother_email,
            mother_profession,

            // Address
            address,
            landmark,
            city,
            pincode,

            // Documents
            school_id_card_url: idCardUrl,
            marksheet_10th_url: marksheetUrl,

            status: "PENDING"

        })
        .select()
        .single();

    if (error) {
        throw error;
    }

    delete data.password_hash;
    delete data.temp_password;

    return {
        success: true,
        message: "Application submitted successfully",
        data,
    };
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
    const { data, error } = await supabase
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
    const { data: student } = await supabase
        .from("students")
        .select("auth_user_id")
        .eq("id", id)
        .single();
    if (student?.auth_user_id) {
        // Delete the Supabase Auth user as well
        await deleteStudentAuthUser(student.auth_user_id);    }
    const { error } = await supabase
        .from("students")
        .delete()
        .eq("id", id);
    if (error) throw error;
    return { success: true, message: "Student deleted" };
}

// ========================= POST /students/bulk-import =========================

async function bulkImportStudents(studentsArray) {
    console.log('First student record:', studentsArray[0]);
    console.log("Total students:", studentsArray.length);
    if (!studentsArray || !studentsArray.length) throw new Error("No students provided");
    
    const results = [];
    const errors = [];

    for (const student of studentsArray) {
        try {
            console.log(`\n[${student.email}] 1. Checking existing...`);
            const { data: existing } = await supabase
                .from("students")
                .select("email")
                .eq("email", student.email)
                .maybeSingle();

            if (existing) {
                errors.push({ email: student.email, error: "Already exists" });
                continue;
            }

            // 2. Generate admission number (synchronous, file‑persisted)
            const admissionNumber = generateAdmissionNumber();
            console.log(`[${student.email}] Admission number: ${admissionNumber}`);

            // 3. Create Supabase Auth user (returns authUserId, tempPassword, username)
            const { authUserId, tempPassword, username } = await createStudentAuthUser(student, admissionNumber);
            console.log(`[${student.email}] Auth user created: ${authUserId}`);

            const preferredBatch = student.preferred_batch || "EVENING";

            // 4. Insert into students table – do NOT store temp_password
            const { data: newStudent, error: dbError } = await supabase
                .from("students")
                .insert({
                    ...student,

                    id: authUserId,
                    auth_user_id: authUserId,
                    admission_number: admissionNumber,
                    name: student.name,
                    email: student.email,
                    preferred_batch: preferredBatch,
                    learning_mode: student.learning_mode || "OFFLINE",
                    status: "APPROVED",
                    username,
                    // temp_password is NOT stored here
                                       // all other CSV fields
                })
                .select()
                .single();

            if (dbError) throw dbError;
            console.log(`[${student.email}] Insert successful.`);

            // 4b. Mirror into batch_enrollments so the attendance system
            // (calendar / roster / summary) actually sees this student.
            await enrollInPreferredBatch(authUserId, preferredBatch);

            // 5. Send welcome email (non‑blocking)
            try {
                await sendWelcomeEmail(student.email, student.name, tempPassword, admissionNumber);
                console.log(`[${student.email}] Welcome email sent.`);
            } catch (emailErr) {
                console.error(`[${student.email}] Email failed:`, emailErr.message);
                // Student already imported – just log the error
            }

            results.push(newStudent);
        } catch (err) {
            console.error(`[${student.email}] FAILED:`, err.message);
            console.error(err.stack);
            errors.push({ email: student.email, error: err.message });
        }
    }

    return { success: true, imported: results.length, results, errors };
}

// ========================= POST /students/:id/approve =========================
async function approveStudent(id) {
    // Get pending student
    const { data: student, error: fetchError } = await supabase
        .from("students")
        .select("*")
        .eq("id", id)
        .eq("status", "PENDING")
        .single();
    if (fetchError || !student) throw new Error("Pending student not found");
    const admissionNumber = generateAdmissionNumber();
    const { authUserId, tempPassword, username } = await createStudentAuthUser(student, admissionNumber);
    // Update student record
    const { data: approved, error: updateError } = await supabase
        .from("students")
        .update({
            id: authUserId,
            auth_user_id: authUserId,
            admission_number: admissionNumber,
            status: "APPROVED",
            username
        })
        .eq("id", id)
        .select()
        .single();
    if (updateError) throw updateError;

    // Mirror preferred_batch into batch_enrollments so the attendance system
    // (calendar / roster / summary) actually sees this student.
    await enrollInPreferredBatch(authUserId, student.preferred_batch);

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
    const { data, error } = await supabase
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
    const { data, error } = await supabase
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
    const total = await supabase.from("students").select("*", { count: "exact", head: true });
    const pending = await supabase.from("students").select("*", { count: "exact", head: true }).eq("status", "PENDING");
    const approved = await supabase.from("students").select("*", { count: "exact", head: true }).eq("status", "APPROVED");
    const rejected = await supabase.from("students").select("*", { count: "exact", head: true }).eq("status", "REJECTED");
    const morning = await supabase.from("students").select("*", { count: "exact", head: true }).eq("preferred_batch", "MORNING").eq("status", "APPROVED");
    const evening = await supabase.from("students").select("*", { count: "exact", head: true }).eq("preferred_batch", "EVENING").eq("status", "APPROVED");
    const night = await supabase.from("students").select("*", { count: "exact", head: true }).eq("preferred_batch", "NIGHT").eq("status", "APPROVED");
    const online = await supabase.from("students").select("*", { count: "exact", head: true }).eq("learning_mode", "ONLINE").eq("status", "APPROVED");
    const offline = await supabase.from("students").select("*", { count: "exact", head: true }).eq("learning_mode", "OFFLINE").eq("status", "APPROVED");
    const hybrid = await supabase.from("students").select("*", { count: "exact", head: true }).eq("learning_mode", "HYBRID").eq("status", "APPROVED");
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

async function getStudentByUserId(userId) {
  console.log("A. Querying for auth_user_id:", userId);
  
  const { data: student, error } = await supabase
    .from("students")
    .select(`
    name,
    email,
    mobile_number,
    admission_number,
    created_at,
    blocked
`)
    .eq("auth_user_id", userId)
    .single();

  console.log("B. Query result:", { data: student, error: error });

  if (error) {
    console.log("C. Error code:", error.code);
    if (error.code === "PGRST116") {
      throw new NotFoundError(`No student profile found for user ID: ${userId}`);
    }
    throw new Error(`Database query failed: ${error.message}`);
  }

  if (!student) {
    throw new NotFoundError(`No student profile found for user ID: ${userId}`);
  }

  return {
    name: student.name,
    email: student.email,
    mobile: student.mobile_number,
    rollNumber: student.admission_number,
    joinedDate: student.created_at,
    blocked: student.blocked,
    avatar: student.avatar,
};
}
async function getRejectedStudents() {

    const { data, error } = await supabase
        .from("students")
        .select("*")
        .eq("status", "REJECTED")
        .order("created_at", {
            ascending: false
        });

    if (error) throw error;

    return {
        success: true,
        data,
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
    getDashboardStats,
    getStudentByUserId,
    getRejectedStudents
};
