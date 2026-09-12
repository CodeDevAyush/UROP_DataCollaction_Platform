import { NextResponse } from "next/server";
import { withApiErrorHandling } from "@/lib/api/response";
import { requireAdmin } from "@/lib/auth/admin-auth";
import { createSupabaseServiceClient } from "@/lib/supabase/server";

export const GET = withApiErrorHandling(async (req: Request) => {
  await requireAdmin();
  const supabase = createSupabaseServiceClient();
  const url = new URL(req.url);

  const status = url.searchParams.get("status"); // in_progress | completed | abandoned
  const academicYear = url.searchParams.get("academicYear");
  const aiUsageFrequency = url.searchParams.get("aiUsageFrequency");
  const dateFrom = url.searchParams.get("dateFrom");
  const dateTo = url.searchParams.get("dateTo");
  const page = Math.max(1, Number(url.searchParams.get("page") ?? "1"));
  const pageSize = Math.min(100, Math.max(1, Number(url.searchParams.get("pageSize") ?? "25")));

  let query = supabase
    .from("study_sessions")
    .select(
      "id, session_code, study_phase, status, started_at, completed_at, participants!inner(id, participant_code, created_at, participant_profiles(academic_year, program, ai_usage_frequency))",
      { count: "exact" }
    )
    .order("started_at", { ascending: false });

  if (status) query = query.eq("status", status);
  if (dateFrom) query = query.gte("started_at", dateFrom);
  if (dateTo) query = query.lte("started_at", dateTo);
  if (academicYear) query = query.eq("participants.participant_profiles.academic_year", academicYear);
  if (aiUsageFrequency) query = query.eq("participants.participant_profiles.ai_usage_frequency", aiUsageFrequency);

  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  interface ProfileRef {
    academic_year: string | null;
    program: string | null;
    ai_usage_frequency: string | null;
  }
  interface ParticipantRef {
    id: string;
    participant_code: string;
    created_at: string;
    participant_profiles: ProfileRef | ProfileRef[] | null;
  }
  interface Row {
    id: string;
    session_code: string;
    study_phase: string;
    status: string;
    started_at: string;
    completed_at: string | null;
    participants: ParticipantRef | ParticipantRef[] | null;
  }

  const { data, error, count } = await query.range(from, to).overrideTypes<Row[], { merge: false }>();
  if (error) throw error;

  return NextResponse.json({
    total: count ?? 0,
    page,
    pageSize,
    sessions: (data ?? []).map((s) => {
      const participant = Array.isArray(s.participants) ? s.participants[0] : s.participants;
      const profile = Array.isArray(participant?.participant_profiles)
        ? participant?.participant_profiles[0]
        : participant?.participant_profiles;
      return {
        sessionId: s.id,
        sessionCode: s.session_code,
        studyPhase: s.study_phase,
        status: s.status,
        startedAt: s.started_at,
        completedAt: s.completed_at,
        participantId: participant?.id,
        participantCode: participant?.participant_code,
        academicYear: profile?.academic_year ?? null,
        program: profile?.program ?? null,
        aiUsageFrequency: profile?.ai_usage_frequency ?? null,
      };
    }),
  });
});
