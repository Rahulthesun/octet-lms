/**
 * scripts/deleteStudents.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Permanently deletes a FIXED list of student accounts, through the same path as the admin "Delete student" button
 * (students.service.js → deleteStudent: Supabase Auth user + students row;
 * attempts, attendance, enrollments etc. go with it via ON DELETE CASCADE).
 *
 * Safety: every entry must match exactly ONE student by email AND that
 * student's name must match the expected name (case/space-insensitive), or
 * the whole run aborts before deleting anything.
 *
 *   node scripts/deleteStudents.js           # dry run — shows what matches
 *   node scripts/deleteStudents.js --apply   # deletes
 *
 * NOTE: Sanjana (sanjanamoturi24@gmail.com) and Ithihas
 * (ithihas.thiruvenkata2023@vitstudent.ac.in) are deliberately NOT in this
 * list — they stay; they are only hidden from Excel exports
 * (config/excelExclusions.js).
 * ─────────────────────────────────────────────────────────────────────────────
 */

const supabase = require("../config/supabase");
const { deleteStudent } = require("../services/students.service");

// 2026-11-12: students removed from the course (list S.No 19, 24, 25, 41, 45).
// (Earlier run deleted 15 test/placeholder accounts.)
const TO_DELETE = [
  { name: "Inesh Raja", email: "qaineshrjain@gmail.com" },
  { name: "Nameera F", email: "nameerafazlullah@gmail.com" },
  { name: "Niharika Samyuktha S", email: "nihaakshi@gmail.com" },
  { name: "Sarvesh", email: "infisarvesh007@gmail.com" },
  { name: "Soundarya S", email: "gangas2k18@gmail.com" },
];

const APPLY = process.argv.includes("--apply");
const norm = (s) => String(s || "").trim().toLowerCase().replace(/\s+/g, " ");

async function main() {
  if (TO_DELETE.length === 0) throw new Error("Nothing to delete");

  const matched = [];
  const problems = [];
  for (const entry of TO_DELETE) {
    const { data, error } = await supabase
      .from("students")
      .select("id, name, email, is_alumni, auth_user_id")
      .ilike("email", entry.email);
    if (error) throw error;
    if (!data || data.length === 0) { problems.push(`${entry.email}: no student found (already deleted?)`); continue; }
    if (data.length > 1) { problems.push(`${entry.email}: ${data.length} students share this email`); continue; }
    const s = data[0];
    if (norm(s.name) !== norm(entry.name)) { problems.push(`${entry.email}: name in DB is "${s.name}", expected "${entry.name}"`); continue; }
    if (s.is_alumni) { problems.push(`${entry.email}: "${s.name}" is in Alumni (cannot be deleted)`); continue; }
    matched.push(s);
    console.log(`  match  ${s.name.padEnd(18)} ${s.email.padEnd(36)} ${s.id}`);
  }

  if (problems.length > 0) {
    console.log("\nProblems:\n  " + problems.join("\n  "));
  }
  console.log(`\n${matched.length}/${TO_DELETE.length} matched.`);
  if (!APPLY) { console.log("Dry run — nothing deleted. Pass --apply to delete the matched students."); return; }
  if (problems.length > 0) throw new Error("Refusing to delete: resolve the problems above first.");

  for (const s of matched) {
    await deleteStudent(s.id);
    console.log(`  deleted ${s.name} <${s.email}>`);
  }
  console.log(`\nDeleted ${matched.length} students.`);
}

main().catch((e) => {
  console.error(e.message || e);
  process.exit(1);
});
