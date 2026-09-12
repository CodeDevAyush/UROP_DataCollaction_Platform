import { NextResponse } from "next/server";
import { withApiErrorHandling, jsonError } from "@/lib/api/response";
import { casualSubmissionSchema } from "@/lib/validation";
import { requireCurrentSession } from "@/lib/auth/participant-session";
import { createSupabaseServiceClient } from "@/lib/supabase/server";
import { computeTextMetrics } from "@/lib/utils/text-metrics";
import { computeIntegrityFlag } from "@/lib/utils/integrity";
import { appendCasualReply, ScenarioAlreadySubmittedError } from "@/lib/study/casual-responses";
import type { Task } from "@/types/database";

export const POST = withApiErrorHandling(async (req: Request) => {
  const body = casualSubmissionSchema.parse(await req.json());
  const session = await requireCurrentSession();
  const supabase = createSupabaseServiceClient();

  const { data: task } = await supabase.from("tasks").select("*").eq("id", body.taskId).single<Task>();
  if (!task || task.condition !== "casual") {
    return jsonError("Unknown casual task.", 400);
  }

  const metrics = computeTextMetrics(body.text);
  if (metrics.characterCount < task.minimum_characters) {
    return jsonError(
      `Reply must be at least ${task.minimum_characters} characters (currently ${metrics.characterCount}).`,
      422
    );
  }

  const integrityFlag = computeIntegrityFlag({
    pasteAttempts: body.metadata.pasteAttempts,
    cutAttempts: body.metadata.cutAttempts,
    dropAttempts: body.metadata.dropAttempts,
  });

  try {
    await appendCasualReply({
      participantId: session.participant_id,
      sessionId: session.id,
      studyPhase: session.study_phase,
      reply: {
        task_id: task.id,
        scenario_number: body.scenarioNumber,
        raw_text: body.text,
        word_count: metrics.wordCount,
        character_count: metrics.characterCount,
        started_at: body.metadata.startedAt,
        submitted_at: new Date().toISOString(),
        duration_seconds: body.metadata.durationSeconds,
        keystroke_count: body.metadata.keystrokeCount,
        backspace_count: body.metadata.backspaceCount,
        paste_attempts: body.metadata.pasteAttempts,
        cut_attempts: body.metadata.cutAttempts,
        drop_attempts: body.metadata.dropAttempts,
        focus_loss_count: body.metadata.focusLossCount,
        independent_writing_confirmed: body.attestation.type === "independent",
        integrity_flag: integrityFlag,
        researcher_note: null,
      },
    });
  } catch (err) {
    if (err instanceof ScenarioAlreadySubmittedError) {
      return jsonError(err.message, 409);
    }
    return jsonError("Could not save your reply.", 500);
  }

  await supabase.from("session_drafts").delete().eq("session_id", session.id).eq("step", `casual:${task.id}`);

  return NextResponse.json({ ok: true });
});
