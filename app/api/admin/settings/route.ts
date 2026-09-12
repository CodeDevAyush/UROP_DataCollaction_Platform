import { NextResponse } from "next/server";
import { z } from "zod";
import { withApiErrorHandling } from "@/lib/api/response";
import { requireAdmin } from "@/lib/auth/admin-auth";
import { getSetting, setSetting, SETTING_KEYS, DEFAULT_CONDITIONS_MANDATORY, DEFAULT_AI_TOOL_OPTIONS, DEFAULT_TASK_COUNTS } from "@/lib/study/settings";
import { DEFAULT_CONSENT_TEXT, DEFAULT_CONSENT_VERSION } from "@/lib/study/consent";

export const GET = withApiErrorHandling(async () => {
  await requireAdmin();

  const [
    consentText,
    consentVersion,
    conditionsMandatory,
    taskCounts,
    aiToolOptions,
    aiDefaultMode,
    currentStudyPhase,
    researcherContact,
    facultyMentorContact,
    retentionPolicy,
  ] = await Promise.all([
    getSetting(SETTING_KEYS.consentText, DEFAULT_CONSENT_TEXT),
    getSetting(SETTING_KEYS.consentVersion, DEFAULT_CONSENT_VERSION),
    getSetting(SETTING_KEYS.conditionsMandatory, DEFAULT_CONDITIONS_MANDATORY),
    getSetting(SETTING_KEYS.taskCounts, DEFAULT_TASK_COUNTS),
    getSetting(SETTING_KEYS.aiToolOptions, DEFAULT_AI_TOOL_OPTIONS),
    getSetting(SETTING_KEYS.aiDefaultMode, "natural"),
    getSetting(SETTING_KEYS.studyPhase, "baseline"),
    getSetting(SETTING_KEYS.researcherContact, ""),
    getSetting(SETTING_KEYS.facultyMentorContact, ""),
    getSetting(SETTING_KEYS.retentionPolicy, ""),
  ]);

  return NextResponse.json({
    consentText,
    consentVersion,
    conditionsMandatory,
    taskCounts,
    aiToolOptions,
    aiDefaultMode,
    currentStudyPhase,
    researcherContact,
    facultyMentorContact,
    retentionPolicy,
  });
});

const settingsSchema = z.object({
  consentText: z.string().min(1).optional(),
  consentVersion: z.string().min(1).optional(),
  conditionsMandatory: z.object({ formal: z.boolean(), casual: z.boolean(), ai: z.boolean() }).optional(),
  taskCounts: z.object({ formal: z.number().int().min(0), casual: z.number().int().min(0), ai: z.number().int().min(0) }).optional(),
  aiToolOptions: z.array(z.string().min(1)).min(1).optional(),
  aiDefaultMode: z.enum(["controlled", "natural"]).optional(),
  currentStudyPhase: z.string().min(1).optional(),
  researcherContact: z.string().max(300).optional(),
  facultyMentorContact: z.string().max(300).optional(),
  retentionPolicy: z.string().max(2000).optional(),
});

const KEY_MAP: Record<string, string> = {
  consentText: SETTING_KEYS.consentText,
  consentVersion: SETTING_KEYS.consentVersion,
  conditionsMandatory: SETTING_KEYS.conditionsMandatory,
  taskCounts: SETTING_KEYS.taskCounts,
  aiToolOptions: SETTING_KEYS.aiToolOptions,
  aiDefaultMode: SETTING_KEYS.aiDefaultMode,
  currentStudyPhase: SETTING_KEYS.studyPhase,
  researcherContact: SETTING_KEYS.researcherContact,
  facultyMentorContact: SETTING_KEYS.facultyMentorContact,
  retentionPolicy: SETTING_KEYS.retentionPolicy,
};

export const PATCH = withApiErrorHandling(async (req: Request) => {
  await requireAdmin();
  const body = settingsSchema.parse(await req.json());

  await Promise.all(
    Object.entries(body).map(([key, value]) => (value !== undefined ? setSetting(KEY_MAP[key], value) : null))
  );

  return NextResponse.json({ ok: true });
});
