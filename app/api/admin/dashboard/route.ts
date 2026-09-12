import { NextResponse } from "next/server";
import { withApiErrorHandling } from "@/lib/api/response";
import { requireAdmin } from "@/lib/auth/admin-auth";
import { createSupabaseServiceClient } from "@/lib/supabase/server";

export const GET = withApiErrorHandling(async () => {
  await requireAdmin();
  const supabase = createSupabaseServiceClient();

  const [
    { count: totalParticipants },
    { count: completedSessions },
    { count: inProgressSessions },
    { count: formalSamples },
    { count: casualSamples },
    { count: aiInteractions },
    { count: aiEditedSamples },
    { data: profiles },
  ] = await Promise.all([
    supabase.from("participants").select("id", { count: "exact", head: true }),
    supabase.from("study_sessions").select("id", { count: "exact", head: true }).eq("status", "completed"),
    supabase.from("study_sessions").select("id", { count: "exact", head: true }).eq("status", "in_progress"),
    supabase.from("writing_samples").select("id", { count: "exact", head: true }),
    supabase.from("casual_responses").select("id", { count: "exact", head: true }),
    supabase.from("ai_interactions").select("id", { count: "exact", head: true }).not("ai_output", "is", null),
    supabase.from("ai_interactions").select("id", { count: "exact", head: true }).eq("was_edited", true),
    supabase
      .from("participant_profiles")
      .select("academic_year, ai_usage_frequency")
      .overrideTypes<{ academic_year: string | null; ai_usage_frequency: string | null }[], { merge: false }>(),
  ]);

  const byAcademicYear: Record<string, number> = {};
  const byAiUsage: Record<string, number> = {};
  for (const p of profiles ?? []) {
    const year = p.academic_year || "Not specified";
    const usage = p.ai_usage_frequency || "Not specified";
    byAcademicYear[year] = (byAcademicYear[year] ?? 0) + 1;
    byAiUsage[usage] = (byAiUsage[usage] ?? 0) + 1;
  }

  return NextResponse.json({
    totalParticipants: totalParticipants ?? 0,
    completedSessions: completedSessions ?? 0,
    inProgressSessions: inProgressSessions ?? 0,
    formalSamples: formalSamples ?? 0,
    casualSamples: casualSamples ?? 0,
    aiInteractions: aiInteractions ?? 0,
    aiEditedSamples: aiEditedSamples ?? 0,
    byAcademicYear: Object.entries(byAcademicYear).map(([name, value]) => ({ name, value })),
    byAiUsage: Object.entries(byAiUsage).map(([name, value]) => ({ name, value })),
  });
});
