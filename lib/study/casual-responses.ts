import "server-only";
import { createSupabaseServiceClient } from "@/lib/supabase/server";
import type { CasualReply, CasualResponse, IntegrityFlag } from "@/types/database";

/** The one (or zero) casual_responses row for a session, replies nested inside. */
export async function getCasualResponseRow(sessionId: string): Promise<CasualResponse | null> {
  const supabase = createSupabaseServiceClient();
  const { data } = await supabase
    .from("casual_responses")
    .select("*")
    .eq("session_id", sessionId)
    .maybeSingle<CasualResponse>();
  return data ?? null;
}

export class ScenarioAlreadySubmittedError extends Error {
  constructor() {
    super("A reply for this scenario has already been submitted.");
    this.name = "ScenarioAlreadySubmittedError";
  }
}

/**
 * Appends one scenario reply into the session's single casual_responses row,
 * creating that row on the first reply. Rejects a duplicate submission for
 * the same task_id (mirrors the unique-constraint behavior the old
 * one-row-per-scenario schema got for free).
 */
export async function appendCasualReply(params: {
  participantId: string;
  sessionId: string;
  studyPhase: string;
  reply: CasualReply;
}): Promise<void> {
  const supabase = createSupabaseServiceClient();
  const existing = await getCasualResponseRow(params.sessionId);

  if (existing?.replies.some((r) => r.task_id === params.reply.task_id)) {
    throw new ScenarioAlreadySubmittedError();
  }

  if (existing) {
    const replies = [...existing.replies, params.reply].sort((a, b) => a.scenario_number - b.scenario_number);
    const { error } = await supabase
      .from("casual_responses")
      .update({ replies, updated_at: new Date().toISOString() } as never)
      .eq("id", existing.id);
    if (error) throw error;
    return;
  }

  const { error } = await supabase.from("casual_responses").insert({
    participant_id: params.participantId,
    session_id: params.sessionId,
    study_phase: params.studyPhase,
    replies: [params.reply],
  } as never);
  if (error) throw error;
}

/** A single scenario reply "unrolled" back into its own row shape, for admin views/exports. */
export interface FlattenedCasualReply {
  id: string; // `${casual_responses.id}:${task_id}` — a stable compound key, not a real row id
  participant_id: string;
  raw_text: string;
  word_count: number;
  character_count: number;
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
  created_at: string;
  scenario_number: number;
  task_id: string;
  tasks: { title: string; task_code: string } | null;
}

export function flattenCasualRow(
  row: Pick<CasualResponse, "id" | "participant_id" | "replies">,
  taskById: Map<string, { title: string; task_code: string }>
): FlattenedCasualReply[] {
  return row.replies.map((reply) => ({
    id: `${row.id}:${reply.task_id}`,
    participant_id: row.participant_id,
    raw_text: reply.raw_text,
    word_count: reply.word_count,
    character_count: reply.character_count,
    duration_seconds: reply.duration_seconds,
    keystroke_count: reply.keystroke_count,
    backspace_count: reply.backspace_count,
    paste_attempts: reply.paste_attempts,
    cut_attempts: reply.cut_attempts,
    drop_attempts: reply.drop_attempts,
    focus_loss_count: reply.focus_loss_count,
    independent_writing_confirmed: reply.independent_writing_confirmed,
    integrity_flag: reply.integrity_flag,
    researcher_note: reply.researcher_note,
    created_at: reply.submitted_at,
    scenario_number: reply.scenario_number,
    task_id: reply.task_id,
    tasks: taskById.get(reply.task_id) ?? null,
  }));
}

export async function getTaskTitleLookup(): Promise<Map<string, { title: string; task_code: string }>> {
  const supabase = createSupabaseServiceClient();
  const { data } = await supabase
    .from("tasks")
    .select("id, title, task_code")
    .overrideTypes<{ id: string; title: string; task_code: string }[], { merge: false }>();
  return new Map((data ?? []).map((t) => [t.id, { title: t.title, task_code: t.task_code }]));
}

/** Parses the compound id produced by flattenCasualRow back into its parts. */
export function parseFlattenedCasualId(compoundId: string): { rowId: string; taskId: string } | null {
  const separatorIndex = compoundId.indexOf(":");
  if (separatorIndex === -1) return null;
  return { rowId: compoundId.slice(0, separatorIndex), taskId: compoundId.slice(separatorIndex + 1) };
}

/** Updates the researcher_note on one specific reply inside a casual_responses row. */
export async function setCasualReplyResearcherNote(compoundId: string, note: string): Promise<boolean> {
  const parsed = parseFlattenedCasualId(compoundId);
  if (!parsed) return false;

  const supabase = createSupabaseServiceClient();
  const { data: row } = await supabase
    .from("casual_responses")
    .select("*")
    .eq("id", parsed.rowId)
    .maybeSingle<CasualResponse>();
  if (!row) return false;

  const replyIndex = row.replies.findIndex((r) => r.task_id === parsed.taskId);
  if (replyIndex === -1) return false;

  const replies = [...row.replies];
  replies[replyIndex] = { ...replies[replyIndex], researcher_note: note };

  const { error } = await supabase
    .from("casual_responses")
    .update({ replies, updated_at: new Date().toISOString() } as never)
    .eq("id", row.id);
  return !error;
}
