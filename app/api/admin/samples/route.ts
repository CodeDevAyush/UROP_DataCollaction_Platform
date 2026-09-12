import { NextResponse } from "next/server";
import { withApiErrorHandling, jsonError } from "@/lib/api/response";
import { requireAdmin } from "@/lib/auth/admin-auth";
import { createSupabaseServiceClient } from "@/lib/supabase/server";

const TABLE_BY_CONDITION = {
  formal: "writing_samples",
  casual: "casual_responses",
  ai: "ai_interactions",
} as const;

export const GET = withApiErrorHandling(async (req: Request) => {
  await requireAdmin();
  const url = new URL(req.url);
  const condition = (url.searchParams.get("condition") ?? "formal") as keyof typeof TABLE_BY_CONDITION;
  if (!TABLE_BY_CONDITION[condition]) return jsonError("Unknown condition.", 400);

  const integrityFlag = url.searchParams.get("integrityFlag");
  const taskId = url.searchParams.get("taskId");
  const dateFrom = url.searchParams.get("dateFrom");
  const dateTo = url.searchParams.get("dateTo");
  const page = Math.max(1, Number(url.searchParams.get("page") ?? "1"));
  const pageSize = Math.min(100, Math.max(1, Number(url.searchParams.get("pageSize") ?? "25")));

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
