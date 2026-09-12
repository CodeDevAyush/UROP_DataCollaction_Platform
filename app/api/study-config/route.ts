import { NextResponse } from "next/server";
import { withApiErrorHandling } from "@/lib/api/response";
import { getSetting, SETTING_KEYS, DEFAULT_CONDITIONS_MANDATORY, DEFAULT_AI_TOOL_OPTIONS } from "@/lib/study/settings";
import { DEFAULT_CONSENT_TEXT, DEFAULT_CONSENT_VERSION } from "@/lib/study/consent";

/**
 * Public, read-only study configuration used to render the consent,
 * instructions, and AI-task pages. Contains no participant data.
 */
export const GET = withApiErrorHandling(async () => {
  const [consentText, consentVersion, conditionsMandatory, aiToolOptions, aiDefaultMode, researcherContact, facultyMentorContact, retentionPolicy] =
    await Promise.all([
      getSetting(SETTING_KEYS.consentText, DEFAULT_CONSENT_TEXT),
      getSetting(SETTING_KEYS.consentVersion, DEFAULT_CONSENT_VERSION),
      getSetting(SETTING_KEYS.conditionsMandatory, DEFAULT_CONDITIONS_MANDATORY),
      getSetting(SETTING_KEYS.aiToolOptions, DEFAULT_AI_TOOL_OPTIONS),
      getSetting(SETTING_KEYS.aiDefaultMode, "natural"),
      getSetting(SETTING_KEYS.researcherContact, ""),
      getSetting(SETTING_KEYS.facultyMentorContact, ""),
      getSetting(SETTING_KEYS.retentionPolicy, ""),
    ]);

  return NextResponse.json({
    consentText,
    consentVersion,
    conditionsMandatory,
    aiToolOptions,
    aiDefaultMode,
    researcherContact,
    facultyMentorContact,
    retentionPolicy,
  });
});
