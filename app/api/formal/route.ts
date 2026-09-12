import { NextResponse } from "next/server";
import { withApiErrorHandling, jsonError } from "@/lib/api/response";
import { formalSubmissionSchema } from "@/lib/validation";
import { requireCurrentSession } from "@/lib/auth/participant-session";
import { createSupabaseServiceClient } from "@/lib/supabase/server";
import { computeTextMetrics } from "@/lib/utils/text-metrics";
import { computeIntegrityFlag } from "@/lib/utils/integrity";
import type { Task } from "@/types/database";

export const POST = withApiErrorHandling(async (req: Request) => {
  const body = formalSubmissionSchema.parse(await req.json());
  const session = await requireCurrentSession();
  const supabase = createSupabaseServiceClient();

  const { data: task } = await supabase.from("tasks").select("*").eq("id", body.taskId).single<Task>();
  if (!task || task.condition !== "formal") {
    return jsonError("Unknown formal task.", 400);
  }

  // Never trust client-supplied counts for validation — recompute server-side.
  // Word count is still computed and stored below for future linguistic
  // analysis, but character count is what's shown to participants and gates
  // submission.
  const metrics = computeTextMetrics(body.text);
  if (metrics.characterCount < task.minimum_characters) {
    return jsonError(
      `Response must be at least ${task.minimum_characters} characters (currently ${metrics.characterCount}).`,
      422
    );
  }

  const integrityFlag = computeIntegrityFlag({
    pasteAttempts: body.metadata.pasteAttempts,
    cutAttempts: body.metadata.cutAttempts,
    dropAttempts: body.metadata.dropAttempts,
  });

  const { error } = await supabase.from("writing_samples").insert({
    participant_id: session.participant_id,
    session_id: session.id,
    task_id: task.id,
    study_phase: session.study_phase,
    raw_text: body.text,
    word_count: metrics.wordCount,
    character_count: metrics.characterCount,
    started_at: body.metadata.startedAt,
    duration_seconds: body.metadata.durationSeconds,
    keystroke_count: body.metadata.keystrokeCount,
    backspace_count: body.metadata.backspaceCount,
    paste_attempts: body.metadata.pasteAttempts,
    cut_attempts: body.metadata.cutAttempts,
    drop_attempts: body.metadata.dropAttempts,
    focus_loss_count: body.metadata.focusLossCount,
    independent_writing_confirmed: body.attestation.type === "independent",
    independent_writing_note: body.attestation.type === "assisted" ? body.attestation.note : null,
    integrity_flag: integrityFlag,
  } as never);

  if (error) {
    if (error.code === "23505") {
      return jsonError("A response for this task has already been submitted.", 409);
    }
    return jsonError("Could not save your response.", 500);
  }

  await supabase.from("session_drafts").delete().eq("session_id", session.id).eq("step", `formal:${task.id}`);

  return NextResponse.json({ ok: true });
});
