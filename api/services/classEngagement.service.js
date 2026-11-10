/**
 * services/classEngagement.service.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Instagram-style likes (hearts) and comments under each online class.
 * Schema: sql/feedback_engagement.sql (online_class_likes / _comments).
 *
 *  - Students can like a class and comment on it, but only on classes they
 *    can see (their batch, All Students classes, or individual additions).
 *  - Admins can comment (shown with a "Teacher" badge), see like counts and
 *    who liked, and delete any comment. Students can delete their own.
 * ─────────────────────────────────────────────────────────────────────────────
 */

const supabase = require("../config/supabase");
const { hasGraduated } = require("../utils/graduation");

const ADMIN_ROLES = ["admin", "both"];
const MAX_COMMENT = 1000;

function err(status, message) {
  return Object.assign(new Error(message), { status });
}

function isAdmin(user) {
  return ADMIN_ROLES.includes(user?.app_metadata?.role);
}

async function getStudent(authUserId) {
  const { data, error } = await supabase
    .from("students")
    .select("id, name, status, is_alumni, graduation_date")
    .eq("auth_user_id", authUserId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

/** Throws 404/403 unless `user` may see this class. Returns the class row. */
async function assertCanSee(user, classId) {
  const { data: cls, error } = await supabase
    .from("online_classes")
    .select("id, batch_id, audience, status")
    .eq("id", classId)
    .maybeSingle();
  if (error) throw error;
  if (!cls || cls.status === "pending") throw err(404, "Class not found");
  if (isAdmin(user)) return cls;

  const student = await getStudent(user.id);
  if (!student || hasGraduated(student)) throw err(403, "You cannot access this class");
  if (cls.audience === "ALL") return cls;

  const [{ data: enr }, { data: extra }] = await Promise.all([
    supabase.from("batch_enrollments").select("batch_id").eq("student_id", student.id).eq("batch_id", cls.batch_id),
    supabase.from("online_class_attendees").select("id").eq("student_id", student.id).eq("online_class_id", classId),
  ]);
  if ((enr || []).length === 0 && (extra || []).length === 0) throw err(403, "You cannot access this class");
  return cls;
}

/** Adds likeCount / commentCount / likedByMe to already-mapped class objects. */
async function attachEngagement(classes, authUserId) {
  const ids = classes.map((c) => c.id);
  if (ids.length === 0) return classes;

  const [likesRes, commentsRes] = await Promise.all([
    supabase.from("online_class_likes").select("online_class_id, user_id").in("online_class_id", ids),
    supabase.from("online_class_comments").select("online_class_id").in("online_class_id", ids),
  ]);
  // Tables not created yet → keep the class list working with zero counts.
  if (likesRes.error || commentsRes.error) {
    console.warn("[engagement] counts unavailable:", (likesRes.error || commentsRes.error).message);
    return classes.map((c) => ({ ...c, likeCount: 0, commentCount: 0, likedByMe: false }));
  }

  const likeCount = new Map();
  const mine = new Set();
  for (const l of likesRes.data || []) {
    likeCount.set(l.online_class_id, (likeCount.get(l.online_class_id) || 0) + 1);
    if (l.user_id === authUserId) mine.add(l.online_class_id);
  }
  const commentCount = new Map();
  for (const c of commentsRes.data || []) {
    commentCount.set(c.online_class_id, (commentCount.get(c.online_class_id) || 0) + 1);
  }

  return classes.map((c) => ({
    ...c,
    likeCount: likeCount.get(c.id) || 0,
    commentCount: commentCount.get(c.id) || 0,
    likedByMe: mine.has(c.id),
  }));
}

function mapComment(row, user) {
  return {
    id: row.id,
    authorName: row.author_name,
    authorRole: row.author_role,
    body: row.body,
    createdAt: row.created_at,
    mine: row.user_id === user.id,
    canDelete: row.user_id === user.id || isAdmin(user),
  };
}

/** Likes + comments for one class (comments oldest → newest, like a thread). */
async function getEngagement(user, classId) {
  await assertCanSee(user, classId);

  const [likesRes, commentsRes] = await Promise.all([
    supabase.from("online_class_likes").select("user_id, created_at").eq("online_class_id", classId).order("created_at", { ascending: false }),
    supabase.from("online_class_comments").select("*").eq("online_class_id", classId).order("created_at", { ascending: true }).limit(500),
  ]);
  if (likesRes.error) throw likesRes.error;
  if (commentsRes.error) throw commentsRes.error;

  const likes = likesRes.data || [];
  const result = {
    likeCount: likes.length,
    likedByMe: likes.some((l) => l.user_id === user.id),
    comments: (commentsRes.data || []).map((r) => mapComment(r, user)),
  };

  // Admins also see who liked the class.
  if (isAdmin(user) && likes.length > 0) {
    const { data: students } = await supabase
      .from("students")
      .select("auth_user_id, name, preferred_batch")
      .in("auth_user_id", likes.map((l) => l.user_id));
    const byId = new Map((students || []).map((s) => [s.auth_user_id, s]));
    result.likers = likes.map((l) => ({
      name: byId.get(l.user_id)?.name || "Admin",
      batch: byId.get(l.user_id)?.preferred_batch || null,
      likedAt: l.created_at,
    }));
  }
  return result;
}

async function toggleLike(user, classId) {
  await assertCanSee(user, classId);

  const { data: existing, error } = await supabase
    .from("online_class_likes")
    .select("id")
    .eq("online_class_id", classId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (error) throw error;

  if (existing) {
    const { error: delErr } = await supabase.from("online_class_likes").delete().eq("id", existing.id);
    if (delErr) throw delErr;
  } else {
    const { error: insErr } = await supabase
      .from("online_class_likes")
      .upsert({ online_class_id: classId, user_id: user.id }, { onConflict: "online_class_id,user_id", ignoreDuplicates: true });
    if (insErr) throw insErr;
  }

  const { count, error: cntErr } = await supabase
    .from("online_class_likes")
    .select("id", { count: "exact", head: true })
    .eq("online_class_id", classId);
  if (cntErr) throw cntErr;
  return { liked: !existing, likeCount: count || 0 };
}

async function addComment(user, classId, rawBody) {
  await assertCanSee(user, classId);
  const body = typeof rawBody === "string" ? rawBody.trim() : "";
  if (!body) throw err(400, "Comment cannot be empty");
  if (body.length > MAX_COMMENT) throw err(400, `Comment must be under ${MAX_COMMENT} characters`);

  const admin = isAdmin(user);
  let authorName;
  if (admin) {
    authorName = user.user_metadata?.full_name || user.user_metadata?.name || "Teacher";
  } else {
    const student = await getStudent(user.id);
    authorName = student?.name || user.user_metadata?.full_name || "Student";
  }

  const { data, error } = await supabase
    .from("online_class_comments")
    .insert({
      online_class_id: classId,
      user_id: user.id,
      author_name: authorName,
      author_role: admin ? "admin" : "student",
      body,
    })
    .select("*")
    .single();
  if (error) throw error;
  return mapComment(data, user);
}

async function deleteComment(user, classId, commentId) {
  const { data: row, error } = await supabase
    .from("online_class_comments")
    .select("id, user_id, online_class_id")
    .eq("id", commentId)
    .maybeSingle();
  if (error) throw error;
  if (!row || row.online_class_id !== classId) throw err(404, "Comment not found");
  if (row.user_id !== user.id && !isAdmin(user)) throw err(403, "You can only delete your own comments");

  const { error: delErr } = await supabase.from("online_class_comments").delete().eq("id", commentId);
  if (delErr) throw delErr;
  return { deleted: true };
}

module.exports = { attachEngagement, getEngagement, toggleLike, addComment, deleteComment };
