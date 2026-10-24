/**
 * scripts/cloneSubjectsIntoQaPractice.js
 * ─────────────────────────────────────────────────────────────────────────
 * One-time population: copies every existing `category='notes'` subject,
 * its chapters (Units), AND its classes into the new `qa` and `practice`
 * categories, so the admin doesn't have to retype the whole structure from
 * scratch for the new Q&A / Practice Questions sections.
 *
 * "Class" here means what the admin's real content already calls a class:
 * the individual PDF titles inside a chapter are literally named
 * "Class-1 <topic>", "Class-2 <topic>", etc (confirmed against live data —
 * e.g. the "Solutions" chapter has 10 PDFs titled Class-1..Class-10). This
 * script reads those existing PDF titles per chapter (oldest first, so the
 * numbering order matches how they were originally uploaded) and creates a
 * matching Subtopic (Class) row with that exact title under the
 * corresponding cloned Unit — it does NOT copy the PDF files themselves
 * (Q&A/Practice classes hold questions + attached resources, not notes
 * PDFs); only the class NAMES are reused as a starting structure.
 *
 * Idempotent: safe to re-run — skips a subject/chapter/class that was
 * already cloned (matched by name, scoped to its parent).
 *
 * Requires these migrations to already be run, in order:
 *   1. subtopics.sql
 *   2. content_category.sql
 *   3. qa_bank_questions.sql
 *   4. qa_bank_resources.sql
 *   5. subject_category_uniqueness_fix.sql
 *
 * Usage: node scripts/cloneSubjectsIntoQaPractice.js
 * ─────────────────────────────────────────────────────────────────────────
 */

require("dotenv").config();
const subjectService = require("../services/subject.service");
const chapterService = require("../services/chapter.service");
const subtopicService = require("../services/subtopic.service");
const supabase = require("../config/supabase");

const TARGET_CATEGORIES = ["qa", "practice"];

async function main() {
  const { data: notesSubjects, error } = await supabase
    .from("subjects")
    .select("id, name, grade, order_index")
    .eq("category", "notes")
    .order("order_index", { ascending: true });
  if (error) throw error;

  console.log(`Found ${notesSubjects.length} notes subject(s) to clone.\n`);

  for (const category of TARGET_CATEGORIES) {
    console.log(`\n══ Cloning into category="${category}" ══`);

    const { data: existingInCategory } = await supabase
      .from("subjects")
      .select("id, name, grade")
      .eq("category", category);
    const existingByKey = new Map(
      (existingInCategory || []).map((s) => [`${s.grade}:${s.name.toLowerCase()}`, s.id])
    );

    for (const subject of notesSubjects) {
      const key = `${subject.grade}:${subject.name.toLowerCase()}`;
      let newSubjectId = existingByKey.get(key);

      if (newSubjectId) {
        console.log(`= Subject "${subject.name}" (grade ${subject.grade}) already exists, reusing it`);
      } else {
        const created = await subjectService.createSubject({
          name: subject.name,
          grade: subject.grade,
          category,
        });
        newSubjectId = created.id;
        console.log(`+ Created subject "${subject.name}" (grade ${subject.grade})`);
      }

      const { data: chapters } = await supabase
        .from("chapters")
        .select("id, name, order_index")
        .eq("subject_id", subject.id)
        .order("order_index", { ascending: true });

      const { data: existingChapters } = await supabase
        .from("chapters")
        .select("id, name")
        .eq("subject_id", newSubjectId);
      const existingChapterByName = new Map(
        (existingChapters || []).map((c) => [c.name.toLowerCase(), c.id])
      );

      for (const chapter of chapters || []) {
        let newChapterId = existingChapterByName.get(chapter.name.toLowerCase());

        if (newChapterId) {
          console.log(`  = Unit "${chapter.name}" already exists, reusing it`);
        } else {
          const createdChapter = await chapterService.createChapter({ name: chapter.name, subjectId: newSubjectId });
          newChapterId = createdChapter.id;
          console.log(`  + Created unit "${chapter.name}"`);
        }

        // Real class names = the existing PDF titles in this chapter
        // (oldest first, matching their original Class-1/Class-2/... order).
        const { data: pdfs } = await supabase
          .from("pdfs")
          .select("title, created_at")
          .eq("chapter_id", chapter.id)
          .order("created_at", { ascending: true });

        const classNames = [...new Set((pdfs || []).map((p) => p.title.trim()).filter(Boolean))];

        if (classNames.length === 0) continue;

        const { data: existingSubtopics } = await supabase
          .from("subtopics")
          .select("name")
          .eq("chapter_id", newChapterId);
        const existingSubtopicNames = new Set((existingSubtopics || []).map((s) => s.name.toLowerCase()));

        for (const className of classNames) {
          if (existingSubtopicNames.has(className.toLowerCase())) {
            console.log(`    = Class "${className}" already exists, skipping`);
            continue;
          }
          // Match fixClassOrder.js's parsing so these sort correctly
          // (Class-1, Class-2, ...) without needing that script afterward.
          const m = className.match(/^\s*(?:Class[\s-]*)?(\d+)\b/i);
          const orderIndex = m ? parseInt(m[1], 10) : 0;
          await subtopicService.createSubtopic({ name: className, chapterId: newChapterId, orderIndex });
          console.log(`    + Created class "${className}" (order ${orderIndex})`);
        }
      }
    }
  }

  console.log("\nDone. Every cloned Class is empty of questions/resources — open it in the admin UI and use + Add Questions / Import from Question Bank / attach a file to fill it in.");
}

main().catch((e) => {
  console.error("Failed:", e.message);
  process.exitCode = 1;
});
