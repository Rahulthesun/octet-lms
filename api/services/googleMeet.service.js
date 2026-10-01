/**
 * services/googleMeet.service.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Reads actual Google Meet participation data (who joined, when they joined
 * and left — possibly multiple times) for a class that was created via
 * Calendar's conferenceData.createRequest. This is the only place in the
 * codebase that calls the Google Meet REST API (meet.googleapis.com, v2).
 *
 * Uses the SAME admin OAuth client as googleCalendar.service.js
 * (getAuthorizedClient) — just with the additional
 * `meetings.space.readonly` scope. An admin who connected before that scope
 * existed will get a GOOGLE_MEET_SCOPE_MISSING error and needs to
 * reconnect once (see GOOGLE_MEET_INTEGRATION.md).
 *
 * Every method/field name here was verified against the type definitions
 * shipped inside the installed `googleapis` package
 * (node_modules/googleapis/build/src/apis/meet/v2.d.ts), not just recalled
 * from memory.
 * ─────────────────────────────────────────────────────────────────────────────
 */

const { google } = require("googleapis");
const { getAuthorizedClient } = require("./googleAuth.service");

/** "https://meet.google.com/abc-defg-hij?query" -> "abc-defg-hij" */
function extractMeetingCode(meetUrl) {
  if (!meetUrl) return null;
  const match = meetUrl.match(/meet\.google\.com\/([a-z]{3}-[a-z]{4}-[a-z]{3})/i);
  return match ? match[1].toLowerCase() : null;
}

/** "users/1234567890" -> "1234567890" (this is the same numeric Google Account id exposed as `sub` in a normal OpenID sign-in — see googleIdentity.service.js) */
function extractGoogleUserId(resourceName) {
  if (!resourceName) return null;
  const match = resourceName.match(/users\/(.+)$/);
  return match ? match[1] : null;
}

function normalizeGoogleError(err, fallbackMessage) {
  const status = err?.response?.status || err?.code;

  if (status === 401) {
    return Object.assign(new Error("Google authorization expired — please reconnect your Google account"), {
      status: 424,
      code: "GOOGLE_REAUTH_REQUIRED",
    });
  }
  if (status === 403) {
    return Object.assign(
      new Error(
        "Google Meet access was denied. If this Google account was connected before online-class attendance sync was added, reconnect it to grant the additional Meet permission."
      ),
      { status: 424, code: "GOOGLE_MEET_SCOPE_MISSING" }
    );
  }
  if (status === 404) {
    return Object.assign(new Error(fallbackMessage || "Google Meet conference data not found"), {
      status: 404,
      code: "GOOGLE_MEET_NOT_FOUND",
    });
  }
  if (status === 429) {
    return Object.assign(new Error("Google API quota exceeded — try again shortly"), {
      status: 429,
      code: "GOOGLE_QUOTA_EXCEEDED",
    });
  }
  return Object.assign(new Error(err?.message || fallbackMessage || "Google Meet API is unavailable right now"), {
    status: 502,
    code: "GOOGLE_MEET_UNAVAILABLE",
  });
}

/**
 * Resolves the Meet space for a class's Meet URL, then finds the specific
 * conference record (one real meeting occurrence) that overlaps the class's
 * scheduled window.
 *
 * Returns `null` (not an error) if no conference has happened for this
 * space yet — that's the normal "class hasn't started / Google hasn't
 * finalized the record yet" case. Callers must treat that as
 * AWAITING_ATTENDANCE_SYNC and retry later, never as "mark everyone absent".
 */
async function findConferenceRecord(adminUserId, meetUrl, classStartIso, classEndIso) {
  const meetingCode = extractMeetingCode(meetUrl);
  if (!meetingCode) {
    throw Object.assign(new Error("Could not determine the Meet space from this class's Meet link"), {
      status: 422,
      code: "GOOGLE_MEET_NO_CODE",
    });
  }

  const auth = await getAuthorizedClient(adminUserId);
  const meet = google.meet({ version: "v2", auth });

  let space;
  try {
    const { data } = await meet.spaces.get({ name: `spaces/${meetingCode}` });
    space = data;
  } catch (err) {
    throw normalizeGoogleError(err, "Could not find the Google Meet space for this class");
  }

  let records = [];
  try {
    let pageToken;
    do {
      const { data } = await meet.conferenceRecords.list({
        filter: `space.name = "${space.name}"`,
        pageSize: 50,
        pageToken,
      });
      records = records.concat(data.conferenceRecords || []);
      pageToken = data.nextPageToken;
    } while (pageToken);
  } catch (err) {
    throw normalizeGoogleError(err, "Could not list Google Meet conference records for this class");
  }

  if (records.length === 0) return null;

  const windowStart = new Date(classStartIso).getTime();
  const windowEnd = new Date(classEndIso).getTime();
  const GRACE_MS = 15 * 60 * 1000; // allow for a meeting that started a little early/late

  const withStart = records
    .filter((r) => r.startTime)
    .map((r) => ({ record: r, startMs: new Date(r.startTime).getTime() }));

  // Prefer the conference whose start overlaps the scheduled window (the
  // normal case — one real meeting per scheduled class). Fall back to the
  // most recent one for this space if none line up cleanly.
  const overlapping = withStart.find((r) => r.startMs >= windowStart - GRACE_MS && r.startMs <= windowEnd + GRACE_MS);
  if (overlapping) return overlapping.record;

  withStart.sort((a, b) => b.startMs - a.startMs);
  return withStart[0]?.record || records[0];
}

/**
 * Returns every participant of a conference record, each with ALL of their
 * join/leave sessions (a participant who left and rejoined has multiple
 * entries — all of them are returned here, unmerged; merging/clamping to
 * the class window happens in onlineAttendanceSync.service.js, not here).
 */
async function listParticipantSessions(adminUserId, conferenceRecordName) {
  const auth = await getAuthorizedClient(adminUserId);
  const meet = google.meet({ version: "v2", auth });

  let participants = [];
  try {
    let pageToken;
    do {
      const { data } = await meet.conferenceRecords.participants.list({
        parent: conferenceRecordName,
        pageSize: 100,
        pageToken,
      });
      participants = participants.concat(data.participants || []);
      pageToken = data.nextPageToken;
    } while (pageToken);
  } catch (err) {
    throw normalizeGoogleError(err, "Could not list Google Meet participants for this class");
  }

  const results = [];
  for (const participant of participants) {
    let sessions = [];
    try {
      let pageToken;
      do {
        const { data } = await meet.conferenceRecords.participants.participantSessions.list({
          parent: participant.name,
          pageSize: 100,
          pageToken,
        });
        sessions = sessions.concat(data.participantSessions || []);
        pageToken = data.nextPageToken;
      } while (pageToken);
    } catch (err) {
      throw normalizeGoogleError(err, "Could not list Google Meet participant sessions");
    }

    const isAnonymous = !participant.signedinUser && !participant.phoneUser;
    const displayName =
      participant.signedinUser?.displayName ||
      participant.anonymousUser?.displayName ||
      participant.phoneUser?.displayName ||
      "Unknown participant";

    results.push({
      participantName: participant.name,
      googleUserId: extractGoogleUserId(participant.signedinUser?.user),
      displayName,
      isAnonymous,
      sessions: sessions.filter((s) => s.startTime).map((s) => ({ start: s.startTime, end: s.endTime || null })),
    });
  }

  return results;
}

/**
 * True if the Meet space currently has a LIVE conference (people are in the
 * room right now). A Meet link created through Calendar never closes by
 * itself: as long as one person stays connected the conference — and the
 * link — stays live indefinitely, long after the scheduled end.
 */
async function getActiveConference(adminUserId, meetUrl) {
  const meetingCode = extractMeetingCode(meetUrl);
  if (!meetingCode) return null;
  const auth = await getAuthorizedClient(adminUserId);
  const meet = google.meet({ version: "v2", auth });
  try {
    const { data } = await meet.spaces.get({ name: `spaces/${meetingCode}` });
    return data.activeConference?.conferenceRecord ? { spaceName: data.name, conferenceRecord: data.activeConference.conferenceRecord } : null;
  } catch (err) {
    throw normalizeGoogleError(err, "Could not read the Google Meet space for this class");
  }
}

/**
 * Ends the live conference for a class's Meet link — everyone in the room is
 * removed and the meeting stops. Needs the meetings.space.created /
 * meetings.space.settings scope (an admin who connected before those were
 * requested must reconnect once: GOOGLE_MEET_CLOSE_SCOPE_MISSING).
 * Returns true if a live conference was ended, false if none was running.
 */
async function endActiveConference(adminUserId, meetUrl) {
  const active = await getActiveConference(adminUserId, meetUrl);
  if (!active) return false;

  const auth = await getAuthorizedClient(adminUserId);
  const meet = google.meet({ version: "v2", auth });
  try {
    await meet.spaces.endActiveConference({ name: active.spaceName, requestBody: {} });
    return true;
  } catch (err) {
    const status = err?.response?.status || err?.code;
    if (status === 403) {
      throw Object.assign(
        new Error("Google needs one more permission to close meetings automatically — reconnect the Google account once (Admin > Online Classes)."),
        { status: 424, code: "GOOGLE_MEET_CLOSE_SCOPE_MISSING" }
      );
    }
    throw normalizeGoogleError(err, "Could not end the Google Meet conference");
  }
}

const organizerIdCache = new Map(); // adminUserId -> { id, at } — only ever holds a CONFIRMED id, never a failure
const ORGANIZER_CACHE_TTL_MS = 10 * 60 * 1000;

/**
 * The organizer's own numeric Google account id (same id Meet reports as
 * users/{id}), so the host can be told apart from students in attendance.
 * A failure here is never cached and never silently swallowed to null —
 * misreading "couldn't check" as "definitely not the host" would risk
 * counting the teacher as a student (or vice versa), so the caller is
 * expected to let this throw and retry the whole sync later instead.
 */
async function getOrganizerGoogleUserId(adminUserId) {
  const cached = organizerIdCache.get(adminUserId);
  if (cached && Date.now() - cached.at < ORGANIZER_CACHE_TTL_MS) return cached.id;

  const auth = await getAuthorizedClient(adminUserId);
  const { data } = await google.oauth2({ auth, version: "v2" }).userinfo.get();
  if (!data?.id) {
    throw Object.assign(new Error("Could not confirm the organizer's Google account id"), { status: 502, code: "GOOGLE_ORGANIZER_UNKNOWN" });
  }
  const id = String(data.id);
  organizerIdCache.set(adminUserId, { id, at: Date.now() });
  return id;
}

module.exports = {
  extractMeetingCode,
  extractGoogleUserId,
  findConferenceRecord,
  listParticipantSessions,
  getActiveConference,
  endActiveConference,
  getOrganizerGoogleUserId,
};
