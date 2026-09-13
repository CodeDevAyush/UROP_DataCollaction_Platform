import { NextResponse } from "next/server";
import { withApiErrorHandling, jsonError } from "@/lib/api/response";
import { consentSchema } from "@/lib/validation";
import { createSupabaseServiceClient } from "@/lib/supabase/server";
import { generateParticipantCode, generateSessionCode } from "@/lib/utils/participant-code";
import { getCurrentSession, setSessionCookie } from "@/lib/auth/participant-session";
import { getSetting, SETTING_KEYS } from "@/lib/study/settings";
import { DEFAULT_CONSENT_TEXT, hashConsentText } from "@/lib/study/consent";
import { checkRateLimit, getClientIp } from "@/lib/api/rate-limit";

const MAX_CODE_ATTEMPTS = 5;

// This is the one unauthenticated endpoint that can create new database
// rows (a new participant + session), so it's the main spam/abuse surface
// on the participant side. See lib/api/rate-limit.ts for the limitation of
// this approach on serverless hosting.
//
// Sized for real classroom usage rather than generic internet traffic:
// many participants on the same campus WiFi/NAT can share one public IP,
// so the limit has to comfortably exceed "everyone in one room starts at
// once" (expected cohort: 100-150 participants, up to ~50 concurrent) while
// still catching an actual scripted-submission flood.
const NEW_PARTICIPANT_LIMIT = 200;
const NEW_PARTICIPANT_WINDOW_MS = 15 * 60 * 1000;

export const POST = withApiErrorHandling(async (req: Request) => {
  const body = consentSchema.parse(await req.json());
  const supabase = createSupabaseServiceClient();

  const rateLimit = checkRateLimit(`consent:${getClientIp(req)}`, NEW_PARTICIPANT_LIMIT, NEW_PARTICIPANT_WINDOW_MS);
  if (!rateLimit.allowed) {
    return jsonError("Too many requests. Please wait a few minutes and try again.", 429);
  }

  // Resume an in-progress session (e.g. participant refreshed the consent
  // page) instead of minting a duplicate participant record.
  const existing = await getCurrentSession();

  let participantId: string;
  let sessionId: string;
  let participantCode: string;

  if (existing && existing.status === "in_progress") {
    participantId = existing.participant_id;
    sessionId = existing.id;
    const { data: participant } = await supabase
      .from("participants")
      .select("participant_code")
      .eq("id", participantId)
      .single<{ participant_code: string }>();
    participantCode = participant?.participant_code ?? "";
  } else {
    let inserted: { id: string; participant_code: string } | null = null;
    for (let attempt = 0; attempt < MAX_CODE_ATTEMPTS && !inserted; attempt++) {
      const code = generateParticipantCode();
      const { data, error } = await supabase
        .from("participants")
        .insert({ participant_code: code } as never)
        .select()
        .single<{ id: string; participant_code: string }>();
      if (!error) {
        inserted = data;
      } else if (error.code !== "23505") {
        return jsonError("Could not create participant record.", 500);
      }
    }
    if (!inserted) {
      return jsonError("Could not generate a unique participant code. Please try again.", 500);
    }
    participantId = inserted.id;
    participantCode = inserted.participant_code;

    const studyPhase = await getSetting(SETTING_KEYS.studyPhase, "baseline");
    const { data: session, error: sessionError } = await supabase
      .from("study_sessions")
      .insert({
        participant_id: participantId,
        session_code: generateSessionCode(),
        study_phase: studyPhase,
        status: "in_progress",
      } as never)
      .select()
      .single<{ id: string }>();
    if (sessionError || !session) {
      return jsonError("Could not create a study session.", 500);
    }
    sessionId = session.id;
  }

  const consentText = await getSetting(SETTING_KEYS.consentText, DEFAULT_CONSENT_TEXT);

  await supabase.from("consent_records").insert({
    participant_id: participantId,
    consent_version: body.consentVersion,
    consent_text_hash: hashConsentText(consentText),
    accepted: true,
  } as never);

  await supabase
    .from("participants")
    .update({ consent_version: body.consentVersion, consent_timestamp: new Date().toISOString() } as never)
    .eq("id", participantId);

  await setSessionCookie(sessionId);

  return NextResponse.json({ ok: true, participantCode });
});
