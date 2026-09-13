import { NextResponse } from "next/server";
import { withApiErrorHandling, jsonError } from "@/lib/api/response";
import { profileSchema } from "@/lib/validation";
import { requireCurrentSession } from "@/lib/auth/participant-session";
import { createSupabaseServiceClient } from "@/lib/supabase/server";

export const POST = withApiErrorHandling(async (req: Request) => {
  const body = profileSchema.parse(await req.json());
  const session = await requireCurrentSession();
  const supabase = createSupabaseServiceClient();

  const { error } = await supabase.from("participant_profiles").upsert(
    {
      participant_id: session.participant_id,
      academic_year: body.academicYear || null,
      program: body.program || null,
      branch: body.branch || null,
      age_group: body.ageGroup || null,
      primary_language: body.primaryLanguage || null,
      other_languages: body.otherLanguages,
      ai_usage_frequency: body.aiUsageFrequency || null,
      ai_tools_used: body.aiToolsUsed,
      ai_primary_use: body.aiPrimaryUse || null,
    } as never,
    { onConflict: "participant_id" }
  );

  if (error) return jsonError("Could not save profile.", 500);

  await supabase.from("session_drafts").delete().eq("session_id", session.id).eq("step", "profile");

  return NextResponse.json({ ok: true });
});
