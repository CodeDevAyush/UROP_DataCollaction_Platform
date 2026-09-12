import { NextResponse } from "next/server";
import { withApiErrorHandling, jsonError } from "@/lib/api/response";
import { requireCurrentSession } from "@/lib/auth/participant-session";
import { createSupabaseServiceClient } from "@/lib/supabase/server";
import { getSetting, SETTING_KEYS, DEFAULT_CONDITIONS_MANDATORY } from "@/lib/study/settings";
import { getCasualResponseRow } from "@/lib/study/casual-responses";

export const POST = withApiErrorHandling(async () => {
  const session = await requireCurrentSession();
  const supabase = createSupabaseServiceClient();
  const conditionsMandatory = await getSetting(SETTING_KEYS.conditionsMandatory, DEFAULT_CONDITIONS_MANDATORY);

  const [{ count: formalCount }, { data: casualAssignments }, casualRow, { data: aiInteractions }] = await Promise.all([
    supabase.from("writing_samples").select("id", { count: "exact", head: true }).eq("session_id", session.id),
    supabase
      .from("task_assignments")
      .select("task_id, tasks!inner(condition)")
      .eq("session_id", session.id)
      .eq("tasks.condition", "casual"),
    getCasualResponseRow(session.id),
    supabase
      .from("ai_interactions")
      .select("id, ai_output")
      .eq("session_id", session.id)
      .overrideTypes<{ id: string; ai_output: string | null }[], { merge: false }>(),
  ]);

  const missing: string[] = [];
  if (conditionsMandatory.formal && (formalCount ?? 0) === 0) missing.push("the formal writing task");
  const casualTotal = casualAssignments?.length ?? 0;
  const casualCount = casualRow?.replies.length ?? 0;
  if (conditionsMandatory.casual && (casualTotal === 0 || casualCount < casualTotal)) {
    missing.push("all casual scenarios");
  }
  if (conditionsMandatory.ai && !aiInteractions?.[0]?.ai_output) missing.push("the AI-mediated task");

  if (missing.length > 0) {
    return jsonError(`Please complete ${missing.join(", ")} before finishing the study.`, 422);
  }

  const { data: participant } = await supabase
    .from("participants")
    .select("participant_code")
    .eq("id", session.participant_id)
    .single<{ participant_code: string }>();

  await supabase
    .from("study_sessions")
    .update({ status: "completed", completed_at: new Date().toISOString() } as never)
    .eq("id", session.id);

  return NextResponse.json({ ok: true, participantCode: participant?.participant_code ?? null });
});
