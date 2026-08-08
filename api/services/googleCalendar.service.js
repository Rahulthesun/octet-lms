/**
 * services/googleCalendar.service.js
 * ─────────────────────────────────────────────────────────────────────────────
 * All actual Google Calendar API calls. The Calendar API's
 * conferenceData/createRequest flow is what creates the Google Meet — there
 * is deliberately no separate call to a Meet-specific API, since Calendar
 * already handles the full "create event + attach Meet" flow in one request.
 * ─────────────────────────────────────────────────────────────────────────────
 */

const { google } = require("googleapis");
const { getAuthorizedClient } = require("./googleAuth.service");

function extractMeetUrl(event) {
  return (
    event.hangoutLink ||
    event.conferenceData?.entryPoints?.find((e) => e.entryPointType === "video")?.uri ||
    null
  );
}

/** Normalizes googleapis' thrown errors into typed, admin-facing errors. */
function normalizeGoogleError(err) {
  const status = err?.response?.status || err?.code;

  if (status === 401) {
    return Object.assign(
      new Error("Google authorization expired — please reconnect your Google account"),
      { status: 424, code: "GOOGLE_REAUTH_REQUIRED" }
    );
  }
  if (status === 403) {
    return Object.assign(
      new Error("Google Calendar permission was denied, or the API quota has been exceeded"),
      { status: 429, code: "GOOGLE_FORBIDDEN" }
    );
  }
  if (status === 400) {
    return Object.assign(
      new Error(err?.response?.data?.error?.message || "Google Calendar rejected the request — check the class details"),
      { status: 400, code: "GOOGLE_BAD_REQUEST" }
    );
  }
  if (status === 404 || status === 410) {
    return Object.assign(new Error("The Google Calendar event no longer exists"), {
      status: 404,
      code: "GOOGLE_EVENT_GONE",
    });
  }

  return Object.assign(new Error(err?.message || "Google Calendar API is unavailable right now"), {
    status: 502,
    code: "GOOGLE_UNAVAILABLE",
  });
}

/**
 * Creates a Calendar event with a Google Meet conference attached and
 * (optionally) attendees invited. `requestId` doubles as the Meet
 * conference's idempotency key on Google's side.
 */
async function createEventWithMeet(adminUserId, { summary, description, startISO, endISO, timezone, attendeeEmails, requestId }) {
  const auth = await getAuthorizedClient(adminUserId);
  const calendar = google.calendar({ version: "v3", auth });

  try {
    const { data } = await calendar.events.insert({
      calendarId: "primary",
      conferenceDataVersion: 1,
      sendUpdates: attendeeEmails.length > 0 ? "all" : "none",
      requestBody: {
        summary,
        description,
        start: { dateTime: startISO, timeZone: timezone },
        end: { dateTime: endISO, timeZone: timezone },
        attendees: attendeeEmails.map((email) => ({ email })),
        conferenceData: {
          createRequest: {
            requestId,
            conferenceSolutionKey: { type: "hangoutsMeet" },
          },
        },
      },
    });

    const meetUrl = extractMeetUrl(data);
    if (!meetUrl) {
      throw Object.assign(new Error("Google Calendar created the event but did not return a Meet link"), {
        status: 502,
        code: "GOOGLE_MEET_MISSING",
      });
    }

    return { eventId: data.id, meetUrl, htmlLink: data.htmlLink };
  } catch (err) {
    if (err.code === "GOOGLE_MEET_MISSING") throw err;
    throw normalizeGoogleError(err);
  }
}

/**
 * Patches an existing event's time/title/description/attendees. Omitting
 * conferenceData here is what preserves the original Meet link instead of
 * minting a new one.
 */
async function updateEvent(adminUserId, eventId, { summary, description, startISO, endISO, timezone, attendeeEmails }) {
  const auth = await getAuthorizedClient(adminUserId);
  const calendar = google.calendar({ version: "v3", auth });

  const requestBody = {};
  if (summary !== undefined) requestBody.summary = summary;
  if (description !== undefined) requestBody.description = description;
  if (startISO) requestBody.start = { dateTime: startISO, timeZone: timezone };
  if (endISO) requestBody.end = { dateTime: endISO, timeZone: timezone };
  if (attendeeEmails) requestBody.attendees = attendeeEmails.map((email) => ({ email }));

  try {
    const { data } = await calendar.events.patch({
      calendarId: "primary",
      eventId,
      sendUpdates: "all",
      requestBody,
    });
    return { eventId: data.id, meetUrl: extractMeetUrl(data) };
  } catch (err) {
    throw normalizeGoogleError(err);
  }
}

/** Deletes (cancels) the event and notifies attendees. A 404/410 is treated as already-cancelled, not an error. */
async function cancelEvent(adminUserId, eventId) {
  const auth = await getAuthorizedClient(adminUserId);
  const calendar = google.calendar({ version: "v3", auth });

  try {
    await calendar.events.delete({ calendarId: "primary", eventId, sendUpdates: "all" });
  } catch (err) {
    const status = err?.response?.status;
    if (status === 404 || status === 410) return;
    throw normalizeGoogleError(err);
  }
}

module.exports = { createEventWithMeet, updateEvent, cancelEvent };
