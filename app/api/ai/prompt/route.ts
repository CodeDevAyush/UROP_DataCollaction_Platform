import { NextResponse } from "next/server";
import { withApiErrorHandling, jsonError } from "@/lib/api/response";
import { aiPromptSubmissionSchema } from "@/lib/validation";
import { requireCurrentSession } from "@/lib/auth/participant-session";
import { createSupabaseServiceClient } from "@/lib/supabase/server";
import { computeTextMetrics } from "@/lib/utils/text-metrics";
import type { Task } from "@/types/database";

function buildStandardizedTask(task: Task): string {
  return [task.scenario, task.instructions].filter(Boolean).join("\n\n");
}

export const POST = withApiErrorHandling(async (req: Request) => {
  const body = aiPromptSubmissionSchema.parse(await req.json());
  const session = await requireCurrentSession();
  const supabase = createSupabaseServiceClient();

  const { data: task } = await supabase.from("tasks").select("*").eq("id", body.taskId).single<Task>();
  if (!task || task.condition !== "ai") {
    return jsonError("Unknown AI task.", 400);
  }

  const metrics = computeTextMetrics(body.studentPrompt);
  if (metrics.characterCount < task.minimum_characters) {
    return jsonError(
      `Your instructions must be at least ${task.minimum_characters} characters (currently ${metrics.characterCount}).`,
      422
    );
  }

  const standardizedTask = buildStandardizedTask(task);
  const completePrompt = `${standardizedTask}\n\n---\n\n${body.studentPrompt}`;

  // Idempotent: if this session already has a prompt for this task, update it
  // rather than creating a duplicate (e.g. participant edits before locking in).
  const { data: existing } = await supabase
    .from("ai_interactions")
    .select("id, ai_output")
    .eq("session_id", session.id)
    .eq("task_id", task.id)
    .maybeSingle<{ id: string; ai_output: string | null }>();

  if (existing?.ai_output) {
    return jsonError("This AI task has already been completed.", 409);
  }

  const row = {
    participant_id: session.participant_id,
    session_id: session.id,
    task_id: task.id,
    study_phase: session.study_phase,
    ai_tool: body.aiTool,
    ai_mode: body.aiMode,
    standardized_task: standardizedTask,
    student_prompt: body.studentPrompt,
    complete_prompt: completePrompt,
    prompt_word_count: metrics.wordCount,
    prompt_started_at: body.metadata.startedAt,
    prompt_submitted_at: new Date().toISOString(),
    prompt_duration_seconds: body.metadata.durationSeconds,
    prompt_keystroke_count: body.metadata.keystrokeCount,
    prompt_backspace_count: body.metadata.backspaceCount,
    prompt_paste_attempts: body.metadata.pasteAttempts,
  };

  const { data: saved, error } = existing
    ? await supabase
        .from("ai_interactions")
        .update(row as never)
        .eq("id", existing.id)
        .select()
        .single<{ id: string; student_prompt: string; complete_prompt: string }>()
    : await supabase
        .from("ai_interactions")
        .insert(row as never)
        .select()
        .single<{ id: string; student_prompt: string; complete_prompt: string }>();

  if (error || !saved) return jsonError("Could not save your prompt.", 500);

  await supabase.from("session_drafts").delete().eq("session_id", session.id).eq("step", `ai_prompt:${task.id}`);

  return NextResponse.json({
    ok: true,
    interactionId: saved.id,
    studentPrompt: saved.student_prompt,
    completePrompt: saved.complete_prompt,
  });
});
