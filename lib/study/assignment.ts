import "server-only";
import { createSupabaseServiceClient } from "@/lib/supabase/server";
import type { Task, TaskCondition } from "@/types/database";
import { getSetting } from "@/lib/study/settings";

function shuffle<T>(items: T[]): T[] {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/**
 * Returns the tasks assigned to this session for a condition, creating the
 * assignment (a random selection + presentation order) on first call so
 * that re-fetching (e.g. after a page refresh) is idempotent and stable.
 */
export async function getOrAssignTasks(
  sessionId: string,
  participantId: string,
  studyPhase: string,
  condition: TaskCondition
): Promise<Task[]> {
  const supabase = createSupabaseServiceClient();

  const { data: existingAssignments } = await supabase
    .from("task_assignments")
    .select("task_id, presentation_order, tasks!inner(condition)")
    .eq("session_id", sessionId)
    .eq("tasks.condition", condition)
    .order("presentation_order", { ascending: true })
    .overrideTypes<{ task_id: string; presentation_order: number }[], { merge: false }>();

  if (existingAssignments && existingAssignments.length > 0) {
    const taskIds = existingAssignments.map((a) => a.task_id);
    const { data: tasks } = await supabase
      .from("tasks")
      .select("*")
      .in("id", taskIds)
      .overrideTypes<Task[], { merge: false }>();
    const byId = new Map((tasks ?? []).map((t) => [t.id, t]));
    return taskIds.map((id) => byId.get(id)).filter((t): t is Task => Boolean(t));
  }

  const { data: pool } = await supabase
    .from("tasks")
    .select("*")
    .eq("condition", condition)
    .eq("study_phase", studyPhase)
    .eq("active", true)
    .order("display_order", { ascending: true })
    .overrideTypes<Task[], { merge: false }>();

  if (!pool || pool.length === 0) {
    return [];
  }

  const taskCounts = await getSetting<Record<string, number>>("task_counts", {
    formal: 1,
    casual: 5,
    ai: 1,
  });
  const count = Math.min(taskCounts[condition] ?? 1, pool.length);

  const selected = shuffle(pool).slice(0, count);

  const rows = selected.map((task, index) => ({
    participant_id: participantId,
    session_id: sessionId,
    task_id: task.id,
    presentation_order: index + 1,
  }));

  const { error: insertError } = await supabase.from("task_assignments").insert(rows as never);
  if (insertError && insertError.code !== "23505") {
    // 23505 = unique violation — a concurrent request already assigned tasks.
    throw insertError;
  }

  // Re-read to get the authoritative, persisted order (handles the race above).
  const { data: finalAssignments } = await supabase
    .from("task_assignments")
    .select("task_id, presentation_order")
    .eq("session_id", sessionId)
    .in(
      "task_id",
      selected.map((t) => t.id)
    )
    .order("presentation_order", { ascending: true })
    .overrideTypes<{ task_id: string; presentation_order: number }[], { merge: false }>();

  const byId = new Map(selected.map((t) => [t.id, t]));
  return (finalAssignments ?? []).map((a) => byId.get(a.task_id)).filter((t): t is Task => Boolean(t));
}
