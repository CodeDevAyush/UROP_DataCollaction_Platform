import { NextResponse } from "next/server";
import { withApiErrorHandling, jsonError } from "@/lib/api/response";
import { requireAdmin } from "@/lib/auth/admin-auth";
import { createSupabaseServiceClient } from "@/lib/supabase/server";
import { flattenCasualRow, getTaskTitleLookup } from "@/lib/study/casual-responses";
import type { CasualResponse } from "@/types/database";

const TABLE_BY_CONDITION = {
  formal: "writing_samples",
  ai: "ai_interactions",
} as const;

interface CasualParticipantRef {
  participant_code: string;
}

async function getCasualSamples(params: {
  integrityFlag: string | null;
  taskId: string | null;
  dateFrom: string | null;
  dateTo: string | null;
  page: number;
  pageSize: number;
}) {
  const supabase = createSupabaseServiceClient();

  const [{ data: rows }, taskById] = await Promise.all([
    supabase
      .from("casual_responses")
      .select("id, participant_id, replies, participants(participant_code)")
      .overrideTypes<(CasualResponse & { participants: CasualParticipantRef | CasualParticipantRef[] | null })[], { merge: false }>(),
    getTaskTitleLookup(),
  ]);

  const flattened = (rows ?? []).flatMap((row) => {
    const participant = Array.isArray(row.participants) ? row.participants[0] : row.participants;
    return flattenCasualRow(row, taskById).map((item) => ({ ...item, participants: participant ?? null }));
  });

  const filtered = flattened.filter((row) => {
    if (params.integrityFlag && row.integrity_flag !== params.integrityFlag) return false;
    if (params.taskId && row.task_id !== params.taskId) return false;
    if (params.dateFrom && row.created_at < params.dateFrom) return false;
    if (params.dateTo && row.created_at > params.dateTo) return false;
    return true;
  });

  filtered.sort((a, b) => (a.created_at < b.created_at ? 1 : -1));

  const from = (params.page - 1) * params.pageSize;
  const page = filtered.slice(from, from + params.pageSize);

  return { total: filtered.length, rows: page };
}

export const GET = withApiErrorHandling(async (req: Request) => {
  await requireAdmin();
  const url = new URL(req.url);
  const condition = url.searchParams.get("condition") ?? "formal";
  if (condition !== "formal" && condition !== "casual" && condition !== "ai") {
    return jsonError("Unknown condition.", 400);
  }

  const integrityFlag = url.searchParams.get("integrityFlag");
  const taskId = url.searchParams.get("taskId");
  const dateFrom = url.searchParams.get("dateFrom");
  const dateTo = url.searchParams.get("dateTo");
  const page = Math.max(1, Number(url.searchParams.get("page") ?? "1"));
  const pageSize = Math.min(100, Math.max(1, Number(url.searchParams.get("pageSize") ?? "25")));

  if (condition === "casual") {
    // casual_responses nests all of a participant's replies in one row, so
    // filtering/pagination happens after flattening rather than in SQL.
    const { total, rows } = await getCasualSamples({ integrityFlag, taskId, dateFrom, dateTo, page, pageSize });
    return NextResponse.json({ total, page, pageSize, condition, rows });
  }

  const supabase = createSupabaseServiceClient();
  const table = TABLE_BY_CONDITION[condition];

  let query = supabase
    .from(table)
    .select("*, tasks(title, task_code), participants(participant_code)", { count: "exact" })
    .order("created_at", { ascending: false });

  if (integrityFlag && condition !== "ai") query = query.eq("integrity_flag", integrityFlag);
  if (taskId) query = query.eq("task_id", taskId);
  if (dateFrom) query = query.gte("created_at", dateFrom);
  if (dateTo) query = query.lte("created_at", dateTo);

  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  query = query.range(from, to);

  const { data, error, count } = await query;
  if (error) throw error;

  return NextResponse.json({ total: count ?? 0, page, pageSize, condition, rows: data ?? [] });
});
