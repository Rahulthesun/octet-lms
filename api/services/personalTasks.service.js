/**
 * services/personalTasks.service.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Personal to-do / reminder list on the dashboards. Every function is scoped
 * to a single user_id (the caller's own, from their verified JWT) — this is
 * a private list, never a management tool, so nothing here ever reads or
 * writes another user's rows. Same table, same functions, for both the
 * admin dashboard and the student dashboard.
 * ─────────────────────────────────────────────────────────────────────────────
 */

const supabase = require("../config/supabase");

function notFound() {
  return Object.assign(new Error("Task not found"), { status: 404 });
}

async function listTasks(userId) {
  const { data, error } = await supabase
    .from("personal_tasks")
    .select("*")
    .eq("user_id", userId)
    .order("completed", { ascending: true })
    .order("due_at", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return data;
}

async function createTask(userId, { content, dueAt }) {
  const trimmed = (content || "").trim();
  if (!trimmed) throw Object.assign(new Error("Task content is required"), { status: 400 });

  const { data, error } = await supabase
    .from("personal_tasks")
    .insert({
      user_id: userId,
      content: trimmed,
      due_at: dueAt || null,
    })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
}

async function updateTask(userId, taskId, updates) {
  const allowed = {};
  if (updates.content !== undefined) {
    const trimmed = String(updates.content).trim();
    if (!trimmed) throw Object.assign(new Error("Task content cannot be empty"), { status: 400 });
    allowed.content = trimmed;
  }
  if (updates.completed !== undefined) allowed.completed = !!updates.completed;
  if (updates.dueAt !== undefined) allowed.due_at = updates.dueAt || null;
  allowed.updated_at = new Date().toISOString();

  const { data, error } = await supabase
    .from("personal_tasks")
    .update(allowed)
    .eq("id", taskId)
    .eq("user_id", userId) // never allow touching another user's task
    .select()
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) throw notFound();
  return data;
}

async function deleteTask(userId, taskId) {
  const { data, error } = await supabase
    .from("personal_tasks")
    .delete()
    .eq("id", taskId)
    .eq("user_id", userId) // never allow deleting another user's task
    .select("id")
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) throw notFound();
  return { id: data.id };
}

module.exports = { listTasks, createTask, updateTask, deleteTask };
