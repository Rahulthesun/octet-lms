/**
 * services/examDocuments.service.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Board-exam document collection: the admin creates an exam event, opens the
 * hall-ticket window, later opens the results window, and every targeted
 * student uploads a hall ticket / 12th marksheet (or enters marks manually).
 *
 * Uploads use presigned R2 URLs: the API only signs the request and later
 * verifies the stored object — file bytes go browser -> R2 directly and never
 * pass through this server. Notifications and emails reuse the existing
 * notifications engine (services/notifications.service.js); there is no
 * separate sender here.
 * ─────────────────────────────────────────────────────────────────────────────
 */

const { v4: uuidv4 } = require("uuid");
const { PutObjectCommand, GetObjectCommand, HeadObjectCommand, DeleteObjectCommand } = require("@aws-sdk/client-s3");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");
const supabase = require("../config/supabase");
const r2 = require("../config/r2");
const notificationsService = require("./notifications.service");
const audienceService = require("./audience.service");
const { todayInTz, hasGraduated } = require("../utils/graduation");

const BUCKET = process.env.R2_BUCKET_NAME;

const KINDS = { "hall-ticket": "HALL_TICKET", marksheet: "MARKSHEET" };
const MAX_FILE_BYTES = 10 * 1024 * 1024; // 10 MB
const UPLOAD_URL_TTL_SECONDS = 10 * 60;
// How long the marksheet window stays open after the admin opens results.
const RESULTS_WINDOW_DAYS = 30;
const ALLOWED_TYPES = {
  "image/jpeg": ["jpg", "jpeg"],
  "image/png": ["png"],
  "application/pdf": ["pdf"],
};

function badRequest(message) {
  return Object.assign(new Error(message), { status: 400 });
}
function forbidden(message) {
  return Object.assign(new Error(message), { status: 403 });
}
function notFound(message) {
  return Object.assign(new Error(message), { status: 404 });
}

function parseKind(kindParam) {
  const kind = KINDS[String(kindParam || "").toLowerCase()] || (Object.values(KINDS).includes(kindParam) ? kindParam : null);
  if (!kind) throw badRequest("kind must be 'hall-ticket' or 'marksheet'");
  return kind;
}

function kindSlug(kind) {
  return kind === "HALL_TICKET" ? "hall-ticket" : "marksheet";
}

/** Last local date (inclusive) on which `kind` can still be submitted, or null if never opened. */
function closesOn(event, kind) {
  if (kind === "HALL_TICKET") return event.hall_ticket_opened_at ? event.exam_date : null;
  if (!event.results_opened_at) return null;
  const opened = new Date(event.results_opened_at);
  return todayInTz(new Date(opened.getTime() + RESULTS_WINDOW_DAYS * 24 * 60 * 60 * 1000));
}

/**
 * "not_open" until the admin opens the window, "open" while students can
 * submit/replace/delete, "closed" afterwards: the hall ticket closes once the
 * exam date has passed, the marksheet RESULTS_WINDOW_DAYS after results open.
 */
function windowState(event, kind, today = todayInTz()) {
  const opened = kind === "HALL_TICKET" ? event.hall_ticket_opened_at : event.results_opened_at;
  if (!opened) return "not_open";
  return today > closesOn(event, kind) ? "closed" : "open";
}

function mapEvent(e) {
  return {
    id: e.id,
    name: e.name,
    examDate: e.exam_date,
    audience: e.audience,
    batchIds: e.batch_ids || [],
    hallTicketOpenedAt: e.hall_ticket_opened_at,
    resultsOpenedAt: e.results_opened_at,
    hallTicketClosesOn: closesOn(e, "HALL_TICKET"),
    resultsClosesOn: closesOn(e, "MARKSHEET"),
    createdAt: e.created_at,
  };
}

// ─── Targeting ───────────────────────────────────────────────────────────────

/** Active students an exam event applies to (All Students resolved live, batches de-duplicated). */
async function getTargetStudents(event, select = "id, name, email, admission_number, auth_user_id, preferred_batch") {
  return audienceService.resolveStudents({ audience: event.audience, batchIds: event.batch_ids || [] }, select);
}

async function getEventOrThrow(eventId) {
  const { data, error } = await supabase.from("exam_events").select("*").eq("id", eventId).maybeSingle();
  if (error) throw error;
  if (!data) throw notFound("Exam event not found");
  return data;
}

async function getStudentByAuthId(authUserId) {
  const { data, error } = await supabase
    .from("students")
    .select("id, name, auth_user_id, status, is_alumni, graduation_date")
    .eq("auth_user_id", authUserId)
    .maybeSingle();
  if (error) throw error;
  if (!data) throw forbidden("No student profile found for this account");
  if (hasGraduated(data)) throw forbidden("Your access has been revoked because you graduated.");
  return data;
}

async function isStudentTargeted(event, studentId) {
  if (event.audience === "ALL") return true;
  const batchIds = event.batch_ids || [];
  if (batchIds.length === 0) return false;
  const { data, error } = await supabase
    .from("batch_enrollments")
    .select("student_id")
    .eq("student_id", studentId)
    .in("batch_id", batchIds)
    .limit(1);
  if (error) throw error;
  return (data || []).length > 0;
}


// ─── Admin: events ───────────────────────────────────────────────────────────

async function assertBatchesExist(batchIds) {
  const { data, error } = await supabase.from("batches").select("id").in("id", batchIds);
  if (error) throw error;
  if ((data || []).length !== batchIds.length) throw badRequest("One or more batches do not exist");
}

async function createEvent({ name, examDate, allStudents, batchIds, audience }, createdBy) {
  if (!name?.trim()) throw badRequest("Exam name is required");
  if (!examDate || !/^\d{4}-\d{2}-\d{2}$/.test(examDate)) throw badRequest("A valid exam date (YYYY-MM-DD) is required");
  if (examDate < todayInTz()) throw badRequest("The exam date cannot be in the past");

  const target = audienceService.normalizeAudience({ audience, allStudents, batchIds });
  if (target.audience === "BATCH") {
    if (target.batchIds.length === 0) throw badRequest("Choose All Students or at least one batch");
    await assertBatchesExist(target.batchIds);
  }

  const { data, error } = await supabase
    .from("exam_events")
    .insert({
      name: name.trim(),
      exam_date: examDate,
      audience: target.audience,
      batch_ids: target.batchIds,
      created_by: createdBy || null,
    })
    .select()
    .single();
  if (error) throw error;
  return mapEvent(data);
}

async function updateEvent(eventId, { name, examDate, allStudents, batchIds, audience }) {
  const event = await getEventOrThrow(eventId);
  const patch = { updated_at: new Date().toISOString() };
  if (name !== undefined) {
    if (!name.trim()) throw badRequest("Exam name is required");
    patch.name = name.trim();
  }
  if (examDate !== undefined && examDate !== event.exam_date) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(examDate)) throw badRequest("A valid exam date (YYYY-MM-DD) is required");
    // Once results are open the exam has happened, so the date may only be
    // corrected to another past date; before that it can't move into the past.
    if (event.results_opened_at) {
      if (examDate >= todayInTz()) throw badRequest("The results window is already open, so the exam date must stay in the past");
    } else if (examDate < todayInTz()) {
      throw badRequest("The exam date cannot be moved into the past");
    }
    patch.exam_date = examDate;
  }
  if (allStudents !== undefined || batchIds !== undefined || audience !== undefined) {
    const target = audienceService.normalizeAudience({ audience, allStudents, batchIds });
    if (target.audience === "BATCH") {
      if (target.batchIds.length === 0) throw badRequest("Choose All Students or at least one batch");
      await assertBatchesExist(target.batchIds);
    }
    patch.audience = target.audience;
    patch.batch_ids = target.batchIds;
  }
  const { data, error } = await supabase.from("exam_events").update(patch).eq("id", event.id).select().single();
  if (error) throw error;
  return mapEvent(data);
}

/** Deletes an exam event together with every submission and uploaded file for it. */
async function deleteEvent(eventId) {
  const event = await getEventOrThrow(eventId);
  const { data: subs, error: subErr } = await supabase
    .from("exam_submissions")
    .select("file_key")
    .eq("exam_event_id", event.id);
  if (subErr) throw subErr;

  const { error } = await supabase.from("exam_events").delete().eq("id", event.id);
  if (error) throw error;

  await Promise.all((subs || []).map((s) => deleteObjectQuietly(s.file_key)));
  return { deleted: true, submissionsRemoved: (subs || []).length };
}

async function listEvents() {
  const { data: events, error } = await supabase.from("exam_events").select("*").order("exam_date", { ascending: false });
  if (error) throw error;
  if (!events || events.length === 0) return [];

  const { data: subs, error: subErr } = await supabase
    .from("exam_submissions")
    .select("exam_event_id, kind")
    .in("exam_event_id", events.map((e) => e.id));
  if (subErr) throw subErr;

  const counts = {};
  for (const s of subs || []) {
    counts[s.exam_event_id] = counts[s.exam_event_id] || { HALL_TICKET: 0, MARKSHEET: 0 };
    counts[s.exam_event_id][s.kind] += 1;
  }

  const result = [];
  for (const e of events) {
    const targets = await getTargetStudents(e, "id");
    result.push({
      ...mapEvent(e),
      targetedCount: targets.length,
      hallTicketSubmitted: counts[e.id]?.HALL_TICKET || 0,
      marksheetSubmitted: counts[e.id]?.MARKSHEET || 0,
    });
  }
  return result;
}

// ─── Admin: open windows (this is what triggers the prompts) ─────────────────

async function notifyTargets(event, kind) {
  const isHall = kind === "HALL_TICKET";
  const dateLabel = new Date(`${event.exam_date}T00:00:00`).toLocaleDateString("en-IN", {
    day: "2-digit", month: "short", year: "numeric",
  });
  const input = {
    type: isHall ? "exam_hall_ticket" : "exam_marksheet",
    title: isHall ? `Upload your hall ticket: ${event.name}` : `Submit your result: ${event.name}`,
    body: isHall
      ? `Your ${event.name} exam is on ${dateLabel}. Please upload a photo or PDF of your hall ticket now.`
      : `Results for ${event.name} (held on ${dateLabel}) are out. Please upload your 12th marksheet or enter your marks manually.`,
    link: `/student/exam-documents/${event.id}?kind=${kindSlug(kind)}`,
    data: { examEventId: event.id, kind },
  };
  // Resolved live: All Students reaches every active student, batches are de-duplicated, alumni are excluded.
  if (event.audience === "ALL") input.allStudents = true;
  else input.batchIds = event.batch_ids || [];
  return notificationsService.createNotification(input);
}

async function openHallTicketWindow(eventId) {
  const event = await getEventOrThrow(eventId);
  if (event.hall_ticket_opened_at) throw badRequest("The hall ticket window is already open");
  if (event.exam_date < todayInTz()) throw badRequest("The exam date has already passed");

  const { data, error } = await supabase
    .from("exam_events")
    .update({ hall_ticket_opened_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq("id", eventId)
    .select()
    .single();
  if (error) throw error;

  const notified = await notifyTargets(data, "HALL_TICKET");
  return { event: mapEvent(data), notified: notified.notificationCount, emailed: notified.emailCount };
}

async function openResultsWindow(eventId) {
  const event = await getEventOrThrow(eventId);
  if (event.results_opened_at) throw badRequest("The results window is already open");
  if (event.exam_date >= todayInTz()) throw badRequest("The results window can only be opened after the exam date has passed");

  const { data, error } = await supabase
    .from("exam_events")
    .update({ results_opened_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq("id", eventId)
    .select()
    .single();
  if (error) throw error;

  const notified = await notifyTargets(data, "MARKSHEET");
  return { event: mapEvent(data), notified: notified.notificationCount, emailed: notified.emailCount };
}

// ─── Admin: tracking table ───────────────────────────────────────────────────

async function signedGetUrl(key, fileName) {
  if (!key) return null;
  return getSignedUrl(
    r2,
    new GetObjectCommand({
      Bucket: BUCKET,
      Key: key,
      ResponseContentDisposition: fileName ? `inline; filename="${String(fileName).replace(/"/g, "")}"` : undefined,
    }),
    { expiresIn: 3600 }
  );
}

async function mapSubmission(s, { withUrl = true } = {}) {
  if (!s) return { status: "pending" };
  return {
    status: "submitted",
    entryMode: s.entry_mode,
    fileName: s.file_name,
    contentType: s.content_type,
    sizeBytes: s.size_bytes,
    marksObtained: s.marks_obtained,
    maxMarks: s.max_marks,
    grade: s.grade,
    remarks: s.remarks,
    submittedAt: s.submitted_at,
    fileUrl: withUrl && s.file_key ? await signedGetUrl(s.file_key, s.file_name) : null,
  };
}

/**
 * One row per targeted student: submitted or pending for both the hall ticket
 * and the marksheet. pendingOnly narrows to students who still owe `kind`
 * (or either document when no kind is given) — the follow-up list.
 */
async function getTracking(eventId, { kind, pendingOnly } = {}) {
  const event = await getEventOrThrow(eventId);
  const kindValue = kind ? parseKind(kind) : null;

  const targets = await getTargetStudents(event);
  const { data: subs, error } = await supabase.from("exam_submissions").select("*").eq("exam_event_id", eventId);
  if (error) throw error;

  const byStudent = new Map();
  for (const s of subs || []) {
    if (!byStudent.has(s.student_id)) byStudent.set(s.student_id, {});
    byStudent.get(s.student_id)[s.kind] = s;
  }

  // A student who has already submitted but later left the target set
  // (e.g. moved to Alumni) keeps their row visible so the record is never lost.
  const targetIds = new Set(targets.map((t) => t.id));
  const extraIds = [...byStudent.keys()].filter((id) => !targetIds.has(id));
  let extras = [];
  if (extraIds.length > 0) {
    const { data, error: exErr } = await supabase
      .from("students")
      .select("id, name, email, admission_number, auth_user_id, preferred_batch")
      .in("id", extraIds);
    if (exErr) throw exErr;
    extras = data || [];
  }

  const rows = [];
  for (const st of [...targets, ...extras]) {
    const mine = byStudent.get(st.id) || {};
    const hall = await mapSubmission(mine.HALL_TICKET);
    const marks = await mapSubmission(mine.MARKSHEET);
    const pending =
      kindValue === "HALL_TICKET" ? hall.status === "pending"
      : kindValue === "MARKSHEET" ? marks.status === "pending"
      : hall.status === "pending" || marks.status === "pending";
    if (pendingOnly && !pending) continue;
    rows.push({
      studentId: st.id,
      name: st.name,
      email: st.email,
      admissionNumber: st.admission_number,
      batch: st.preferred_batch,
      hallTicket: hall,
      marksheet: marks,
      inactive: !targetIds.has(st.id),
    });
  }
  rows.sort((a, b) => a.name.localeCompare(b.name));

  return {
    event: mapEvent(event),
    summary: {
      targeted: targets.length,
      hallTicketSubmitted: rows.filter((r) => r.hallTicket.status === "submitted").length,
      marksheetSubmitted: rows.filter((r) => r.marksheet.status === "submitted").length,
    },
    rows,
  };
}

// ─── Student: what is asked of me ────────────────────────────────────────────

/**
 * Events (with a window that has been opened) that apply to this student,
 * with their submission state. Batch membership is read once up front, and
 * signed file links are only generated when `withUrls` is set (the detail
 * page) — the list and dashboard banner never need them.
 */
async function listMyEvents(authUserId, { eventId = null, withUrls = false } = {}) {
  const student = await getStudentByAuthId(authUserId);
  let query = supabase
    .from("exam_events")
    .select("*")
    .or("hall_ticket_opened_at.not.is.null,results_opened_at.not.is.null")
    .order("exam_date", { ascending: false });
  if (eventId) query = query.eq("id", eventId);
  const { data: events, error } = await query;
  if (error) throw error;
  if (!events || events.length === 0) return [];

  const [{ data: enrollments, error: enrErr }, { data: subs, error: subErr }] = await Promise.all([
    supabase.from("batch_enrollments").select("batch_id").eq("student_id", student.id),
    supabase.from("exam_submissions").select("*").eq("student_id", student.id).in("exam_event_id", events.map((e) => e.id)),
  ]);
  if (enrErr) throw enrErr;
  if (subErr) throw subErr;
  const myBatches = new Set((enrollments || []).map((r) => r.batch_id));
  const subKey = new Map((subs || []).map((s) => [`${s.exam_event_id}:${s.kind}`, s]));
  const today = todayInTz();

  const targeted = events.filter((e) => e.audience === "ALL" || (e.batch_ids || []).some((id) => myBatches.has(id)));
  return Promise.all(targeted.map(async (e) => {
    const hallState = windowState(e, "HALL_TICKET", today);
    const marksState = windowState(e, "MARKSHEET", today);
    return {
      ...mapEvent(e),
      hallTicket: {
        open: hallState === "open",
        closed: hallState === "closed",
        ...(await mapSubmission(subKey.get(`${e.id}:HALL_TICKET`), { withUrl: withUrls })),
      },
      marksheet: {
        open: marksState === "open",
        closed: marksState === "closed",
        ...(await mapSubmission(subKey.get(`${e.id}:MARKSHEET`), { withUrl: withUrls })),
      },
    };
  }));
}

/** Outstanding prompts for the dashboard banner (one entry per missing document). */
async function listMyPending(authUserId) {
  try {
    const events = await listMyEvents(authUserId);
    const pending = [];
    for (const e of events) {
      if (e.hallTicket.open && e.hallTicket.status === "pending") {
        pending.push({ eventId: e.id, examName: e.name, examDate: e.examDate, kind: "HALL_TICKET", link: `/student/exam-documents/${e.id}?kind=hall-ticket` });
      }
      if (e.marksheet.open && e.marksheet.status === "pending") {
        pending.push({ eventId: e.id, examName: e.name, examDate: e.examDate, kind: "MARKSHEET", link: `/student/exam-documents/${e.id}?kind=marksheet` });
      }
    }
    return pending;
  } catch (err) {
    if (err.status === 403) return [];
    throw err;
  }
}

async function getMyEvent(authUserId, eventId) {
  if (!/^[0-9a-f-]{36}$/i.test(String(eventId))) throw notFound("Exam event not found");
  const events = await listMyEvents(authUserId, { eventId, withUrls: true });
  const found = events[0];
  if (!found) throw notFound("Exam event not found");
  return found;
}

// ─── Student: presigned upload ───────────────────────────────────────────────

function extensionFor(fileName, contentType) {
  const ext = (String(fileName || "").split(".").pop() || "").toLowerCase();
  const allowed = ALLOWED_TYPES[contentType];
  if (!allowed) return null;
  return allowed.includes(ext) ? ext : allowed[0];
}

async function assertCanSubmit(authUserId, eventId, kind) {
  const student = await getStudentByAuthId(authUserId);
  const event = await getEventOrThrow(eventId);
  if (!(await isStudentTargeted(event, student.id))) throw forbidden("This exam is not assigned to you");
  const state = windowState(event, kind);
  const label = kind === "HALL_TICKET" ? "hall ticket" : "results";
  if (state === "not_open") throw forbidden(`The ${label} window is not open yet`);
  if (state === "closed") throw forbidden(`The ${label} window has closed`);
  return { student, event };
}

/** Step 1: validate the file's declared type/size and hand back a short-lived presigned PUT URL. */
async function createUploadUrl(authUserId, eventId, kindParam, { fileName, contentType, sizeBytes }) {
  const kind = parseKind(kindParam);
  const { student } = await assertCanSubmit(authUserId, eventId, kind);

  if (!ALLOWED_TYPES[contentType]) throw badRequest("Only JPG, PNG or PDF files are accepted");
  const size = Number(sizeBytes);
  if (!Number.isFinite(size) || size <= 0) throw badRequest("The file appears to be empty");
  if (size > MAX_FILE_BYTES) throw badRequest(`The file is too large. The maximum size is ${MAX_FILE_BYTES / (1024 * 1024)} MB`);

  const ext = extensionFor(fileName, contentType);
  const key = `exam-documents/${eventId}/${student.id}/${kindSlug(kind)}/${uuidv4()}.${ext}`;

  const uploadUrl = await getSignedUrl(
    r2,
    new PutObjectCommand({ Bucket: BUCKET, Key: key, ContentType: contentType, ContentLength: size }),
    { expiresIn: UPLOAD_URL_TTL_SECONDS }
  );

  return {
    uploadUrl,
    key,
    method: "PUT",
    headers: { "Content-Type": contentType },
    maxBytes: MAX_FILE_BYTES,
    expiresInSeconds: UPLOAD_URL_TTL_SECONDS,
  };
}

async function deleteObjectQuietly(key) {
  if (!key) return;
  try {
    await r2.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: key }));
  } catch {
    // best-effort cleanup
  }
}

/** Step 2: after the browser PUT, verify the stored object really exists and matches the rules, then record it. */
async function confirmUpload(authUserId, eventId, kindParam, { key, fileName }) {
  const kind = parseKind(kindParam);
  const { student } = await assertCanSubmit(authUserId, eventId, kind);

  const expectedPrefix = `exam-documents/${eventId}/${student.id}/${kindSlug(kind)}/`;
  if (typeof key !== "string" || !key.startsWith(expectedPrefix) || key.includes("..")) {
    throw badRequest("Invalid upload reference");
  }

  let head;
  try {
    head = await r2.send(new HeadObjectCommand({ Bucket: BUCKET, Key: key }));
  } catch {
    throw badRequest("The upload did not reach storage. Please try again.");
  }

  const size = Number(head.ContentLength || 0);
  const contentType = head.ContentType;
  if (!ALLOWED_TYPES[contentType]) {
    await deleteObjectQuietly(key);
    throw badRequest("Only JPG, PNG or PDF files are accepted");
  }
  if (size <= 0 || size > MAX_FILE_BYTES) {
    await deleteObjectQuietly(key);
    throw badRequest(`The file is too large. The maximum size is ${MAX_FILE_BYTES / (1024 * 1024)} MB`);
  }

  const { data: previous } = await supabase
    .from("exam_submissions")
    .select("file_key")
    .eq("exam_event_id", eventId)
    .eq("student_id", student.id)
    .eq("kind", kind)
    .maybeSingle();

  const { data, error } = await supabase
    .from("exam_submissions")
    .upsert(
      {
        exam_event_id: eventId,
        student_id: student.id,
        kind,
        entry_mode: "UPLOAD",
        file_key: key,
        file_name: String(fileName || "document").slice(0, 200),
        content_type: contentType,
        size_bytes: size,
        marks_obtained: null,
        max_marks: null,
        grade: null,
        remarks: null,
        submitted_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      { onConflict: "exam_event_id,student_id,kind" }
    )
    .select()
    .single();
  if (error) {
    await deleteObjectQuietly(key);
    throw error;
  }

  if (previous?.file_key && previous.file_key !== key) await deleteObjectQuietly(previous.file_key);
  return mapSubmission(data);
}

/** Lets a student withdraw a wrong submission (while the window is open) so they can submit the right one. */
async function deleteMySubmission(authUserId, eventId, kindParam) {
  const kind = parseKind(kindParam);
  const { student } = await assertCanSubmit(authUserId, eventId, kind);

  const { data: existing, error: findErr } = await supabase
    .from("exam_submissions")
    .select("id, file_key")
    .eq("exam_event_id", eventId)
    .eq("student_id", student.id)
    .eq("kind", kind)
    .maybeSingle();
  if (findErr) throw findErr;
  if (!existing) throw notFound("There is no submission to remove");

  const { error } = await supabase.from("exam_submissions").delete().eq("id", existing.id);
  if (error) throw error;
  await deleteObjectQuietly(existing.file_key);
  return { status: "pending" };
}

/** Marksheet alternative: the student types their marks instead of uploading a file. */
async function submitManualMarks(authUserId, eventId, { marksObtained, maxMarks, grade, remarks }) {
  const { student } = await assertCanSubmit(authUserId, eventId, "MARKSHEET");

  const obtained = Number(marksObtained);
  const max = Number(maxMarks);
  if (!Number.isFinite(obtained) || obtained < 0) throw badRequest("Marks obtained must be a valid number");
  if (!Number.isFinite(max) || max <= 0) throw badRequest("Maximum marks must be greater than zero");
  if (obtained > max) throw badRequest("Marks obtained cannot exceed maximum marks");

  const { data: previous } = await supabase
    .from("exam_submissions")
    .select("file_key")
    .eq("exam_event_id", eventId)
    .eq("student_id", student.id)
    .eq("kind", "MARKSHEET")
    .maybeSingle();

  const { data, error } = await supabase
    .from("exam_submissions")
    .upsert(
      {
        exam_event_id: eventId,
        student_id: student.id,
        kind: "MARKSHEET",
        entry_mode: "MANUAL",
        file_key: null,
        file_name: null,
        content_type: null,
        size_bytes: null,
        marks_obtained: obtained,
        max_marks: max,
        grade: grade?.toString().trim().slice(0, 20) || null,
        remarks: remarks?.toString().trim().slice(0, 500) || null,
        submitted_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      { onConflict: "exam_event_id,student_id,kind" }
    )
    .select()
    .single();
  if (error) throw error;

  if (previous?.file_key) await deleteObjectQuietly(previous.file_key);
  return mapSubmission(data);
}

module.exports = {
  MAX_FILE_BYTES,
  windowState,
  ALLOWED_TYPES,
  createEvent,
  updateEvent,
  deleteEvent,
  deleteMySubmission,
  listEvents,
  openHallTicketWindow,
  openResultsWindow,
  getTracking,
  listMyEvents,
  listMyPending,
  getMyEvent,
  createUploadUrl,
  confirmUpload,
  submitManualMarks,
  signedGetUrl,
};
