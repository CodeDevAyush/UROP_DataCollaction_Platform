import { NextResponse } from "next/server";
import { withApiErrorHandling, jsonError } from "@/lib/api/response";
import { aiOutputSubmissionSchema } from "@/lib/validation";
import { requireCurrentSession } from "@/lib/auth/participant-session";
import { createSupabaseServiceClient } from "@/lib/supabase/server";
import { computeTextMetrics } from "@/lib/utils/text-metrics";

export const POST = withApiErrorHandling(async (req: Request) => {
  const body = aiOutputSubmissionSchema.parse(await req.json());
  const session = await requireCurrentSession();
  const supabase = createSupabaseServiceClient();

  const { data: interaction } = await supabase
    .from("ai_interactions")
    .select("id, session_id")
    .eq("id", body.interactionId)
    .single()
    .overrideTypes<{ id: string; session_id: string }, { merge: false }>();

  if (!interaction || interaction.session_id !== session.id) {
    return jsonError("AI interaction not found for this session.", 404);
  }

  if (body.wasEdited && !body.editedOutput?.trim()) {
    return jsonError("Please paste your edited version, or select \"No\" if you did not edit it.", 422);
  }

  const outputMetrics = computeTextMetrics(body.aiOutput);
  const editedMetrics = body.wasEdited && body.editedOutput ? computeTextMetrics(body.editedOutput) : null;

  const { error } = await supabase
    .from("ai_interactions")
    .update({
      ai_output: body.aiOutput,
      ai_output_word_count: outputMetrics.wordCount,
      ai_output_submitted_at: new Date().toISOString(),
      was_edited: body.wasEdited,
      edited_output: body.wasEdited ? body.editedOutput : null,
      edited_output_word_count: editedMetrics?.wordCount ?? null,
      model_name: body.modelName?.trim() || "unknown",
    } as never)
    .eq("id", interaction.id);

  if (error) return jsonError("Could not save the AI output.", 500);

  return NextResponse.json({ ok: true });
});
