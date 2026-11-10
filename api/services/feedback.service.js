/**
 * services/feedback.service.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Student feedback (Bug / Suggestion / General + rating) and parent feedback
 * (public "Parent's Feedback" page). Schema: sql/feedback_engagement.sql.
 * ─────────────────────────────────────────────────────────────────────────────
 */

const supabase = require("../config/supabase");

const STUDENT_TYPES = ["bug", "suggestion", "general"];
const STATUSES = ["new", "reviewed"];

function badRequest(message) {
  return Object.assign(new Error(message), { status: 400 });
}
function notFound(message) {
  return Object.assign(new Error(message), { status: 404 });
}

function cleanText(value, max) {
  if (typeof value !== "string") return "";
  return value.trim().slice(0, max);
}

function parseRating(value, required) {
  if (value === undefined || value === null || value === "") {
    if (required) throw badRequest("Please choose a rating from 1 to 5 stars.");
    return null;
  }
  const n = Number(value);
  if (!Number.isInteger(n) || n < 1 || n > 5) throw badRequest("Rating must be between 1 and 5.");
  return n;
}

async function batchNameMap() {
  const { data } = await supabase.from("batches").select("id, name");
  return new Map((data || []).map((b) => [b.id, b.name]));
}

// ─── Student feedback ────────────────────────────────────────────────────────

async function createStudentFeedback(authUserId, { type, details, rating }) {
  if (!STUDENT_TYPES.includes(type)) throw badRequest("Choose Bug, Suggestion or General.");
  const text = cleanText(details, 2000);
  if (!text) throw badRequest("Please write your feedback.");
  const isGeneral = type === "general";

  const { data, error } = await supabase
    .from("feedback")
    .insert({
      user_id: authUserId,
      type,
      area: isGeneral ? "general" : "pdf",
      details: text,
      rating: parseRating(rating, isGeneral),
    })
    .select("id, created_at")
    .single();
  if (error) throw error;
  return data;
}

async function listStudentFeedback() {
  const { data: rows, error } = await supabase
    .from("feedback")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(1000);
  if (error) throw error;

  const userIds = [...new Set((rows || []).map((r) => r.user_id).filter(Boolean))];
  let students = [];
  if (userIds.length > 0) {
    const { data: st, error: stErr } = await supabase
      .from("students")
      .select("auth_user_id, name, email, class_grade, preferred_batch, admission_number")
      .in("auth_user_id", userIds);
    if (stErr) throw stErr;
    students = st || [];
  }
  const byUser = new Map(students.map((s) => [s.auth_user_id, s]));
  const batches = await batchNameMap();

  return (rows || []).map((r) => {
    const s = byUser.get(r.user_id);
    return {
      id: r.id,
      type: r.type,
      area: r.area,
      details: r.details,
      rating: r.rating ?? null,
      status: r.status || "new",
      createdAt: r.created_at,
      student: {
        name: s?.name || "Unknown student",
        email: s?.email || null,
        admissionNumber: s?.admission_number || null,
        grade: s?.class_grade || null,
        batchId: s?.preferred_batch || null,
        batchName: s?.preferred_batch ? batches.get(s.preferred_batch) || s.preferred_batch : null,
      },
    };
  });
}

async function setStatus(table, id, status) {
  if (!STATUSES.includes(status)) throw badRequest("Invalid status.");
  const { data, error } = await supabase
    .from(table)
    .update({ status, reviewed_at: status === "reviewed" ? new Date().toISOString() : null })
    .eq("id", id)
    .select("id, status")
    .maybeSingle();
  if (error) throw error;
  if (!data) throw notFound("Feedback not found.");
  return data;
}

async function deleteRow(table, id) {
  const { error } = await supabase.from(table).delete().eq("id", id);
  if (error) throw error;
  return { deleted: true };
}

// ─── Parent feedback ─────────────────────────────────────────────────────────

async function createParentFeedback(body) {
  const parentName = cleanText(body.parentName, 120);
  if (!parentName) throw badRequest("Please enter your name.");

  const phone = cleanText(body.phone, 20);
  if (phone && !/^[+\d][\d\s-]{6,18}$/.test(phone)) throw badRequest("Please enter a valid phone number.");

  const count = Number(body.studentCount);
  if (!Number.isInteger(count) || count < 1 || count > 10) throw badRequest("Number of students must be between 1 and 10.");

  const names = (Array.isArray(body.studentNames) ? body.studentNames : [])
    .map((n) => cleanText(n, 120))
    .filter(Boolean)
    .slice(0, count);
  if (names.length !== count) throw badRequest("Please enter the name of each student.");

  const comment = cleanText(body.comment, 3000);
  if (!comment) throw badRequest("Please share your comments.");

  const { data, error } = await supabase
    .from("parent_feedback")
    .insert({
      parent_name: parentName,
      phone: phone || null,
      student_count: count,
      student_names: names,
      rating: parseRating(body.rating, true),
      comment,
    })
    .select("id, created_at")
    .single();
  if (error) throw error;
  return data;
}

async function listParentFeedback() {
  const { data, error } = await supabase
    .from("parent_feedback")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(1000);
  if (error) throw error;
  return (data || []).map((r) => ({
    id: r.id,
    parentName: r.parent_name,
    phone: r.phone,
    studentCount: r.student_count,
    studentNames: r.student_names || [],
    rating: r.rating ?? null,
    comment: r.comment,
    status: r.status || "new",
    createdAt: r.created_at,
  }));
}

module.exports = {
  createStudentFeedback,
  listStudentFeedback,
  setStudentFeedbackStatus: (id, status) => setStatus("feedback", id, status),
  deleteStudentFeedback: (id) => deleteRow("feedback", id),
  createParentFeedback,
  listParentFeedback,
  setParentFeedbackStatus: (id, status) => setStatus("parent_feedback", id, status),
  deleteParentFeedback: (id) => deleteRow("parent_feedback", id),
};
