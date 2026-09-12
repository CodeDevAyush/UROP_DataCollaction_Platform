import { NextResponse } from "next/server";
import { withApiErrorHandling, jsonError } from "@/lib/api/response";
import { requireAdmin } from "@/lib/auth/admin-auth";
import { createSupabaseServiceClient } from "@/lib/supabase/server";
import { toCsv } from "@/lib/utils/csv";
import { getTaskTitleLookup } from "@/lib/study/casual-responses";
import type { CasualResponse } from "@/types/database";

type Dataset = "participants" | "profiles" | "formal" | "casual" | "ai";
const VALID_DATASETS: Dataset[] = ["participants", "profiles", "formal", "casual", "ai"];

type Embedded<T> = T | T[] | null;
function unwrap<T>(value: Embedded<T>): T | undefined {
  if (!value) return undefined;
  return Array.isArray(value) ? value[0] : value;
}

interface ParticipantRef {
  participant_code: string;
  consent_version?: string | null;
}
interface TaskRef {
  task_code: string;
  title: string;
}

async function buildRows(dataset: Dataset): Promise<Record<string, unknown>[]> {
  const supabase = createSupabaseServiceClient();

  if (dataset === "participants") {
    interface Row {
      session_code: string;
      study_phase: string;
      status: string;
      started_at: string;
      completed_at: string | null;
      participants: Embedded<ParticipantRef>;
    }
    const { data } = await supabase
      .from("study_sessions")
      .select("session_code, study_phase, status, started_at, completed_at, participants(participant_code, consent_version)")
      .order("started_at")
      .overrideTypes<Row[], { merge: false }>();
    return (data ?? []).map((s) => {
      const p = unwrap(s.participants);
      return {
        participant_code: p?.participant_code,
        session_code: s.session_code,
        study_phase: s.study_phase,
        status: s.status,
        consent_version: p?.consent_version,
        started_at: s.started_at,
        completed_at: s.completed_at,
      };
    });
  }

  if (dataset === "profiles") {
    interface Row {
      academic_year: string | null;
      program: string | null;
      branch: string | null;
      age_group: string | null;
      primary_language: string | null;
      other_languages: string[];
      ai_usage_frequency: string | null;
      ai_tools_used: string[];
      ai_primary_use: string | null;
      participants: Embedded<ParticipantRef>;
    }
    const { data } = await supabase
      .from("participant_profiles")
      .select(
        "academic_year, program, branch, age_group, primary_language, other_languages, ai_usage_frequency, ai_tools_used, ai_primary_use, participants(participant_code)"
      )
      .overrideTypes<Row[], { merge: false }>();
    return (data ?? []).map((row) => {
      const p = unwrap(row.participants);
      const { participants: _unused, ...rest } = row;
      return { participant_code: p?.participant_code, ...rest };
    });
  }

  if (dataset === "formal") {
    interface Row {
      study_phase: string;
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
      integrity_flag: string;
      submitted_at: string;
      participants: Embedded<ParticipantRef>;
      tasks: Embedded<TaskRef>;
    }
    const { data } = await supabase
      .from("writing_samples")
      .select(
        "study_phase, raw_text, word_count, character_count, duration_seconds, keystroke_count, backspace_count, paste_attempts, cut_attempts, drop_attempts, focus_loss_count, independent_writing_confirmed, integrity_flag, submitted_at, participants(participant_code), tasks(task_code, title)"
      )
      .overrideTypes<Row[], { merge: false }>();
    return (data ?? []).map((row) => {
      const p = unwrap(row.participants);
      const t = unwrap(row.tasks);
      const { participants: _p, tasks: _t, ...rest } = row;
      return { participant_code: p?.participant_code, task_code: t?.task_code, task_title: t?.title, ...rest };
    });
  }

  if (dataset === "casual") {
    interface Row {
      participant_id: string;
      study_phase: string;
      replies: CasualResponse["replies"];
      participants: Embedded<ParticipantRef>;
    }
    const [{ data }, taskById] = await Promise.all([
      supabase
        .from("casual_responses")
        .select("participant_id, study_phase, replies, participants(participant_code)")
        .overrideTypes<Row[], { merge: false }>(),
      getTaskTitleLookup(),
    ]);
    // One row per scenario reply in the export, even though storage nests
    // them together under one participant — researchers analyzing
    // individual replies shouldn't need to know about the nesting.
    return (data ?? []).flatMap((row) => {
      const p = unwrap(row.participants);
      return row.replies.map((reply) => {
        const t = taskById.get(reply.task_id);
        return {
          participant_code: p?.participant_code,
          task_code: t?.task_code,
          task_title: t?.title,
          study_phase: row.study_phase,
          scenario_number: reply.scenario_number,
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
          submitted_at: reply.submitted_at,
        };
      });
    });
  }

  // ai
  interface Row {
    study_phase: string;
    ai_tool: string;
    ai_mode: string;
    model_name: string;
    standardized_task: string;
    student_prompt: string;
    complete_prompt: string;
    prompt_word_count: number;
    ai_output: string | null;
    ai_output_word_count: number | null;
    was_edited: boolean;
    edited_output: string | null;
    edited_output_word_count: number | null;
    created_at: string;
    participants: Embedded<ParticipantRef>;
    tasks: Embedded<TaskRef>;
  }
  const { data } = await supabase
    .from("ai_interactions")
    .select(
      "study_phase, ai_tool, ai_mode, model_name, standardized_task, student_prompt, complete_prompt, prompt_word_count, ai_output, ai_output_word_count, was_edited, edited_output, edited_output_word_count, created_at, participants(participant_code), tasks(task_code, title)"
    )
    .overrideTypes<Row[], { merge: false }>();
  return (data ?? []).map((row) => {
    const p = unwrap(row.participants);
    const t = unwrap(row.tasks);
    const { participants: _p, tasks: _t, ...rest } = row;
    return { participant_code: p?.participant_code, task_code: t?.task_code, task_title: t?.title, ...rest };
  });
}

export const GET = withApiErrorHandling(async (req: Request) => {
  await requireAdmin();
  const url = new URL(req.url);
  const dataset = url.searchParams.get("dataset") as Dataset | null;
  const format = url.searchParams.get("format") === "json" ? "json" : "csv";

  if (!dataset || !VALID_DATASETS.includes(dataset)) {
    return jsonError(`dataset must be one of: ${VALID_DATASETS.join(", ")}`, 400);
  }

  const rows = await buildRows(dataset);

  if (format === "json") {
    return NextResponse.json({ dataset, rows });
  }

  const csv = toCsv(rows);
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${dataset}.csv"`,
    },
  });
});
