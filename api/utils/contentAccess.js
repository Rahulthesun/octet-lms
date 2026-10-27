/**
 * utils/contentAccess.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Server-side gate for students fetching a PDF / video by id. Hiding a file in
 * the Content Manager (or its chapter/subject) must actually stop access, and a
 * student must only reach content of their own grade — the UI filtering alone
 * isn't enforcement, because ids can be requested directly.
 *
 * Staff (admin / developer / both) always pass.
 * ─────────────────────────────────────────────────────────────────────────────
 */
const supabase = require("../config/supabase");

const STAFF = ["admin", "developer", "both"];

function forbidden(message = "This content is not available") {
  return Object.assign(new Error(message), { status: 403 });
}

/** "12", "12th Std", "Class 12" -> 12; anything without 11/12 -> null (unknown, don't block). */
function parseGrade(raw) {
  const m = String(raw ?? "").match(/(?<!\d)(11|12)(?!\d)/);
  return m ? Number(m[1]) : null;
}

/**
 * @param {object} user       req.user (Supabase user)
 * @param {object} item       the pdf/video row: { is_visible, chapter_id }
 */
async function assertStudentCanAccess(user, item) {
  const role = user?.app_metadata?.role;
  if (STAFF.includes(role)) return;

  if (item.is_visible === false) throw forbidden();

  if (!item.chapter_id) return;
  const { data: chapter } = await supabase
    .from("chapters")
    .select("is_visible, subject_id")
    .eq("id", item.chapter_id)
    .maybeSingle();
  if (!chapter) return;
  if (chapter.is_visible === false) throw forbidden();

  const { data: subject } = await supabase
    .from("subjects")
    .select("is_visible, grade")
    .eq("id", chapter.subject_id)
    .maybeSingle();
  if (!subject) return;
  if (subject.is_visible === false) throw forbidden();

  // Grade check — only enforced when both sides are known.
  if (subject.grade) {
    const { data: student } = await supabase
      .from("students")
      .select("class_grade")
      .eq("auth_user_id", user.id)
      .maybeSingle();
    const studentGrade = parseGrade(student?.class_grade);
    if (studentGrade && Number(subject.grade) !== studentGrade) throw forbidden();
  }
}

module.exports = { assertStudentCanAccess, parseGrade };
