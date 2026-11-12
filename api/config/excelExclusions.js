/**
 * config/excelExclusions.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Students who must NEVER appear in a marks Excel export — neither the
 * downloaded .xlsx nor the in-app "View" of it (services/testExcel.service.js
 * builds both from the same data, so one filter covers both).
 *
 * This only affects the Excel register. These students stay in the database
 * and everywhere else in the app (rosters, reports, analytics) as normal.
 *
 * Matched by email, case-insensitively. Some of these accounts have since
 * been deleted outright (scripts/deleteStudents.js); they stay listed here so
 * that, if one is ever re-created with the same email, it is still kept out.
 * ─────────────────────────────────────────────────────────────────────────────
 */

const EXCEL_EXCLUDED_EMAILS = [
  "sanjanamoturi24@gmail.com", // Sanjana — kept in the app, hidden from Excel only
  "ithihas.thiruvenkata2023@vitstudent.ac.in", // Ithihas — kept in the app, hidden from Excel only
  "ithihas.cps@gmail.com", // Rahul
  "parvesh.sm2023@vitstudent.ac.in", // Parvesh
  "roma@gmail.com", // Vinay
  "rohit.s@example.com", // Rohit Singh
  "tanvi.j@example.com", // Tanvi Joshi
  "varun.n@example.com", // Varun Nair
  "ishita.v@example.com", // Ishita Verma
  "aditya.s@example.com", // Aditya Sharma
  "neha.g@example.com", // Neha Gupta
  "rahul.v@example.com", // Rahul Venkat
  "meenakshi.a@example.com", // Meenakshi A.
  "priya.t@example.com", // Priya Thirumalai
  "karthik.s@example.com", // Karthik S.
  "sneha.rajan@example.com", // Sneha Rajan
  "arjun.kumar@example.com", // Arjun Kumar
  "qaineshrjain@gmail.com", // Inesh Raja — deleted 2026-11-12
  "nameerafazlullah@gmail.com", // Nameera F — deleted 2026-11-12
  "nihaakshi@gmail.com", // Niharika Samyuktha S — deleted 2026-11-12
  "infisarvesh007@gmail.com", // Sarvesh — deleted 2026-11-12
  "gangas2k18@gmail.com", // Soundarya S — deleted 2026-11-12
];

const excludedSet = new Set(EXCEL_EXCLUDED_EMAILS.map((e) => e.trim().toLowerCase()));

/** True when this student must be left out of every Excel export. */
function isExcludedFromExcel(student) {
  const email = String(student?.email || "").trim().toLowerCase();
  return email !== "" && excludedSet.has(email);
}

module.exports = { EXCEL_EXCLUDED_EMAILS, isExcludedFromExcel };
