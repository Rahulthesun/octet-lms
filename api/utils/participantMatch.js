/**
 * utils/participantMatch.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Matches a Google Meet participant to a student by the student's REGISTERED
 * email (and name) when no Google account has been linked yet.
 *
 * Why this exists: Google Meet's API tells us a participant's numeric Google
 * account id and display name — never their email. Students are invited (and
 * sign in to Meet) with the email they registered with, so a display name like
 * "Ithihas Thiruvenkata Durai 23BLC1259" is directly traceable to the
 * registered email ithihas.thiruvenkata2023@vitstudent.ac.in. The old flow
 * only matched students who had manually linked a Google account first, so
 * everyone who had not was silently marked absent.
 *
 * This is deliberately conservative — a wrong match would credit someone with
 * another student's attendance — so it only returns a student when the match
 * is UNIQUE and STRONG:
 *   - at least two distinct name words in common, or one long (6+ letter) word
 *   - and no other candidate scores as well
 *   - and the candidate has not already linked a different Google account
 * Anything ambiguous is left unmatched for the admin to assign by hand.
 * ─────────────────────────────────────────────────────────────────────────────
 */

const MIN_TOKEN_LENGTH = 3;
const STRONG_SINGLE_TOKEN_LENGTH = 6;

/** Lowercase letters only, words split on anything else (digits, dots, punctuation drop out). */
function tokens(text) {
  return String(text || "")
    .normalize("NFKD")
    .toLowerCase()
    .replace(/[^a-z]+/g, " ")
    .split(" ")
    .filter((t) => t.length >= MIN_TOKEN_LENGTH);
}

/** The part of an email before "@", letters only, no separators: "ithihas.thiruvenkata2023" -> "ithihasthiruvenkata". */
function compactLocalPart(email) {
  return String(email || "")
    .split("@")[0]
    .normalize("NFKD")
    .toLowerCase()
    .replace(/[^a-z]+/g, "");
}

function scoreStudent(displayTokens, student) {
  const local = compactLocalPart(student.email);
  const nameTokens = new Set(tokens(student.name));
  let score = 0;
  let strongest = 0;
  for (const t of displayTokens) {
    if (nameTokens.has(t) || (local && local.includes(t))) {
      score += 1;
      strongest = Math.max(strongest, t.length);
    }
  }
  return { score, strongest };
}

/**
 * @param displayName the participant's Meet display name
 * @param candidates students eligible to be matched (roster members with no Google account linked yet)
 * @returns the single matching student, or null if there is no strong, unique match
 */
function matchByRegisteredEmail(displayName, candidates) {
  const displayTokens = [...new Set(tokens(displayName))];
  if (displayTokens.length === 0 || !candidates || candidates.length === 0) return null;

  const scored = candidates
    .map((student) => ({ student, ...scoreStudent(displayTokens, student) }))
    .filter((c) => c.score > 0)
    .sort((a, b) => b.score - a.score || b.strongest - a.strongest);

  if (scored.length === 0) return null;
  const best = scored[0];

  const strongEnough = best.score >= 2 || best.strongest >= STRONG_SINGLE_TOKEN_LENGTH;
  if (!strongEnough) return null;

  const runnerUp = scored[1];
  if (runnerUp && runnerUp.score === best.score) return null; // ambiguous — leave it for the admin

  return best.student;
}

module.exports = { matchByRegisteredEmail, tokens, compactLocalPart };
