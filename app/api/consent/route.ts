import { NextResponse } from "next/server";
import { withApiErrorHandling, jsonError } from "@/lib/api/response";
import { consentSchema } from "@/lib/validation";
import { createSupabaseServiceClient } from "@/lib/supabase/server";
import { generateParticipantCode, generateSessionCode } from "@/lib/utils/participant-code";
import { getCurrentSession, setSessionCookie } from "@/lib/auth/participant-session";
import { getSetting, SETTING_KEYS } from "@/lib/study/settings";
import { DEFAULT_CONSENT_TEXT, hashConsentText } from "@/lib/study/consent";

const MAX_CODE_ATTEMPTS = 5;

export const POST = withApiErrorHandling(async (req: Request) => {
  const body = consentSchema.parse(await req.json());
  const supabase = createSupabaseServiceClient();

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
