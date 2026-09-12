import "server-only";
import { createSupabaseServiceClient } from "@/lib/supabase/server";

/**
 * Researcher-configurable global settings, stored as key/value rows in
 * study_settings. Falls back to the provided default if the key hasn't
 * been set yet (e.g. on a fresh install before the admin visits Settings).
 */
export async function getSetting<T>(key: string, fallback: T): Promise<T> {
  const supabase = createSupabaseServiceClient();
  const { data } = await supabase
    .from("study_settings")
    .select("value")
    .eq("key", key)
    .maybeSingle()
    .overrideTypes<{ value: T } | null, { merge: false }>();
  if (!data) return fallback;
  return data.value;
}

export async function setSetting(key: string, value: unknown): Promise<void> {
  const supabase = createSupabaseServiceClient();
  const { error } = await supabase
    .from("study_settings")
    .upsert({ key, value, updated_at: new Date().toISOString() } as never);
  if (error) throw error;
}

export const SETTING_KEYS = {
  conditionsMandatory: "conditions_mandatory",
  taskCounts: "task_counts",
  aiToolOptions: "ai_tool_options",
  aiDefaultMode: "ai_default_mode",
  consentVersion: "consent_version",
  consentText: "consent_text",
  studyPhase: "current_study_phase",
  researcherContact: "researcher_contact",
  facultyMentorContact: "faculty_mentor_contact",
  retentionPolicy: "retention_policy",
} as const;

export const DEFAULT_CONDITIONS_MANDATORY = { formal: true, casual: true, ai: true };
export const DEFAULT_TASK_COUNTS = { formal: 1, casual: 5, ai: 1 };
export const DEFAULT_AI_TOOL_OPTIONS = ["ChatGPT", "Gemini", "Claude", "Other"];
