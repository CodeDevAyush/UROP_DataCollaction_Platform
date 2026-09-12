/**
 * Hand-maintained row types mirroring supabase/migrations/*.sql. Used to
 * annotate Supabase query results (e.g. `.overrideTypes<Task[], { merge:
 * false }>()` or `as Task`) rather than as the client's generic Database
 * type — see the note at the top of lib/supabase/server.ts for why.
 */

export type TaskCondition = "formal" | "casual" | "ai";
export type IntegrityFlag = "green" | "yellow" | "red";
export type SessionStatus = "in_progress" | "completed" | "abandoned";
export type AiMode = "controlled" | "natural";
export type AdminRole = "researcher" | "admin";

export interface Participant {
  id: string;
  participant_code: string;
  consent_version: string | null;
  consent_timestamp: string | null;
  created_at: string;
}

export interface ParticipantProfile {
  id: string;
  participant_id: string;
  academic_year: string | null;
  program: string | null;
  branch: string | null;
  age_group: string | null;
  primary_language: string | null;
  other_languages: string[];
  ai_usage_frequency: string | null;
  ai_tools_used: string[];
  ai_primary_use: string | null;
  created_at: string;
}

export interface ConsentRecord {
  id: string;
  participant_id: string;
  consent_version: string;
  consent_text_hash: string;
  accepted: boolean;
  timestamp: string;
}

export interface StudySession {
  id: string;
  participant_id: string;
  session_code: string;
  study_phase: string;
  status: SessionStatus;
  started_at: string;
  completed_at: string | null;
}

export interface Task {
  id: string;
  task_code: string;
  condition: TaskCondition;
  study_phase: string;
  title: string;
  scenario: string;
  instructions: string;
  minimum_characters: number;
  maximum_characters: number | null;
  minimum_duration_seconds: number | null;
  maximum_duration_seconds: number | null;
  randomization_group: string | null;
  display_order: number;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface TaskAssignment {
  id: string;
  participant_id: string;
  session_id: string;
  task_id: string;
  presentation_order: number;
  created_at: string;
}

export interface WritingSample {
  id: string;
  participant_id: string;
  session_id: string;
  task_id: string;
  condition: "formal";
  text_category: "formal_human";
  study_phase: string;
  raw_text: string;
  word_count: number;
  character_count: number;
  started_at: string | null;
  submitted_at: string;
  duration_seconds: number | null;
  keystroke_count: number;
  backspace_count: number;
  paste_attempts: number;
  cut_attempts: number;
  drop_attempts: number;
  focus_loss_count: number;
  independent_writing_confirmed: boolean;
  independent_writing_note: string | null;
  integrity_flag: IntegrityFlag;
  researcher_note: string | null;
  created_at: string;
}

/** One scenario reply, nested inside CasualResponse.replies. */
export interface CasualReply {
  task_id: string;
  scenario_number: number;
  raw_text: string;
  word_count: number;
  character_count: number;
  started_at: string | null;
  submitted_at: string;
  duration_seconds: number | null;
  keystroke_count: number;
  backspace_count: number;
  paste_attempts: number;
  cut_attempts: number;
  drop_attempts: number;
  focus_loss_count: number;
  independent_writing_confirmed: boolean;
  integrity_flag: IntegrityFlag;
  researcher_note: string | null;
}

/** One row per participant session — all casual scenario replies nested in `replies`. */
export interface CasualResponse {
  id: string;
  participant_id: string;
  session_id: string;
  study_phase: string;
  replies: CasualReply[];
  created_at: string;
  updated_at: string;
}

export interface AiInteraction {
  id: string;
  participant_id: string;
  session_id: string;
  task_id: string;
  study_phase: string;
  ai_tool: string;
  ai_mode: AiMode;
  model_name: string;
  standardized_task: string;
  student_prompt: string;
  complete_prompt: string;
  prompt_word_count: number;
  prompt_started_at: string | null;
  prompt_submitted_at: string | null;
  prompt_duration_seconds: number | null;
  prompt_keystroke_count: number;
  prompt_backspace_count: number;
  prompt_paste_attempts: number;
  ai_output: string | null;
  ai_output_word_count: number | null;
  ai_output_submitted_at: string | null;
  was_edited: boolean;
  edited_output: string | null;
  edited_output_word_count: number | null;
  researcher_note: string | null;
  created_at: string;
}

export interface SessionDraft {
  id: string;
  session_id: string;
  step: string;
  draft_text: string;
  draft_metadata: Record<string, unknown>;
  updated_at: string;
}

export interface StudySetting {
  key: string;
  value: unknown;
  updated_at: string;
}

export interface AdminProfile {
  id: string;
  email: string;
  display_name: string | null;
  role: AdminRole;
  created_at: string;
}

