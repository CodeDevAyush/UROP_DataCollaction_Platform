import { NextResponse } from "next/server";
import { withApiErrorHandling } from "@/lib/api/response";
import { getCurrentSession } from "@/lib/auth/participant-session";
import { createSupabaseServiceClient } from "@/lib/supabase/server";
import { getSetting, SETTING_KEYS, DEFAULT_CONDITIONS_MANDATORY } from "@/lib/study/settings";

export const GET = withApiErrorHandling(async () => {
  const session = await getCurrentSession();
  if (!session) {
    return NextResponse.json({ started: false });
  }

  const supabase = createSupabaseServiceClient();

  const [{ data: participant }, { data: profile }, { count: formalCount }, { data: casualAssignments }, { count: casualCount }, { data: aiInteractions }] =
    await Promise.all([
      supabase
        .from("participants")
        .select("participant_code")
        .eq("id", session.participant_id)
        .single<{ participant_code: string }>(),
      supabase.from("participant_profiles").select("id").eq("participant_id", session.participant_id).maybeSingle(),
      supabase
        .from("writing_samples")
        .select("id", { count: "exact", head: true })
        .eq("session_id", session.id),
      supabase
        .from("task_assignments")
        .select("task_id, tasks!inner(condition)")
        .eq("session_id", session.id)
        .eq("tasks.condition", "casual"),
      supabase.from("casual_responses").select("id", { count: "exact", head: true }).eq("session_id", session.id),
      supabase
        .from("ai_interactions")
        .select("id, ai_output, was_edited")
        .eq("session_id", session.id)
        .overrideTypes<{ id: string; ai_output: string | null; was_edited: boolean }[], { merge: false }>(),
    ]);

  const conditionsMandatory = await getSetting(SETTING_KEYS.conditionsMandatory, DEFAULT_CONDITIONS_MANDATORY);

  const casualTotalAssigned = casualAssignments?.length ?? 0;
  const aiInteraction = aiInteractions?.[0] ?? null;

  return NextResponse.json({
    started: true,
    sessionId: session.id,
    studyPhase: session.study_phase,
    status: session.status,
    participantCode: participant?.participant_code ?? null,
    conditionsMandatory,
    progress: {
      consent: true,
      profile: Boolean(profile),
      formal: { completed: (formalCount ?? 0) > 0 },
      casual: {
        completedCount: casualCount ?? 0,
        totalAssigned: casualTotalAssigned,
        complete: casualTotalAssigned > 0 && (casualCount ?? 0) >= casualTotalAssigned,
      },
      ai: {
        hasPrompt: Boolean(aiInteraction),
        hasOutput: Boolean(aiInteraction?.ai_output),
        complete: Boolean(aiInteraction?.ai_output),
      },
    },
  });
});
