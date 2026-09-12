import { NextResponse } from "next/server";
import { withApiErrorHandling, jsonError } from "@/lib/api/response";
import { requireAdmin } from "@/lib/auth/admin-auth";
import { createSupabaseServiceClient } from "@/lib/supabase/server";

export const GET = withApiErrorHandling(async (_req: Request, ctx: { params: Promise<{ id: string }> }) => {
  await requireAdmin();
  const { id } = await ctx.params;
  const supabase = createSupabaseServiceClient();

  const { data: participant, error } = await supabase.from("participants").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  if (!participant) return jsonError("Participant not found.", 404);

  const [{ data: profile }, { data: sessions }, { data: formal }, { data: casual }, { data: ai }, { data: consent }] =
    await Promise.all([
      supabase.from("participant_profiles").select("*").eq("participant_id", id).maybeSingle(),
      supabase.from("study_sessions").select("*").eq("participant_id", id).order("started_at", { ascending: false }),
      supabase
        .from("writing_samples")
        .select("*, tasks(title, task_code)")
        .eq("participant_id", id)
        .order("created_at", { ascending: false }),
      supabase
        .from("casual_responses")
        .select("*, tasks(title, task_code)")
        .eq("participant_id", id)
        .order("created_at", { ascending: false }),
      supabase
        .from("ai_interactions")
        .select("*, tasks(title, task_code)")
        .eq("participant_id", id)
        .order("created_at", { ascending: false }),
      supabase.from("consent_records").select("*").eq("participant_id", id).order("timestamp", { ascending: false }),
    ]);

  return NextResponse.json({ participant, profile, sessions, formal, casual, ai, consent });
});
