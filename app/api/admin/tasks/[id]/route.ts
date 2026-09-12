import { NextResponse } from "next/server";
import { z } from "zod";
import { withApiErrorHandling, jsonError } from "@/lib/api/response";
import { requireAdmin } from "@/lib/auth/admin-auth";
import { createSupabaseServiceClient } from "@/lib/supabase/server";
import type { Task } from "@/types/database";

const updateSchema = z.object({
  title: z.string().min(1).max(300).optional(),
  scenario: z.string().min(1).max(10000).optional(),
  instructions: z.string().max(5000).optional(),
  minimumCharacters: z.number().int().min(0).optional(),
  maximumCharacters: z.number().int().min(0).nullable().optional(),
  minimumDurationSeconds: z.number().int().min(0).nullable().optional(),
  maximumDurationSeconds: z.number().int().min(0).nullable().optional(),
  randomizationGroup: z.string().max(100).nullable().optional(),
  displayOrder: z.number().int().optional(),
  active: z.boolean().optional(),
  studyPhase: z.string().min(1).max(100).optional(),
});

export const PATCH = withApiErrorHandling(async (req: Request, ctx: { params: Promise<{ id: string }> }) => {
  await requireAdmin();
  const { id } = await ctx.params;
  const body = updateSchema.parse(await req.json());
  const supabase = createSupabaseServiceClient();

  const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (body.title !== undefined) update.title = body.title;
  if (body.scenario !== undefined) update.scenario = body.scenario;
  if (body.instructions !== undefined) update.instructions = body.instructions;
  if (body.minimumCharacters !== undefined) update.minimum_characters = body.minimumCharacters;
  if (body.maximumCharacters !== undefined) update.maximum_characters = body.maximumCharacters;
  if (body.minimumDurationSeconds !== undefined) update.minimum_duration_seconds = body.minimumDurationSeconds;
  if (body.maximumDurationSeconds !== undefined) update.maximum_duration_seconds = body.maximumDurationSeconds;
  if (body.randomizationGroup !== undefined) update.randomization_group = body.randomizationGroup;
  if (body.displayOrder !== undefined) update.display_order = body.displayOrder;
  if (body.active !== undefined) update.active = body.active;
  if (body.studyPhase !== undefined) update.study_phase = body.studyPhase;

  const { data, error } = await supabase
    .from("tasks")
    .update(update as never)
    .eq("id", id)
    .select()
    .single()
    .overrideTypes<Task, { merge: false }>();
  if (error) return jsonError("Could not update task.", 500);
  return NextResponse.json({ task: data });
});

export const DELETE = withApiErrorHandling(async (_req: Request, ctx: { params: Promise<{ id: string }> }) => {
  await requireAdmin();
  const { id } = await ctx.params;
  const supabase = createSupabaseServiceClient();

  // Never hard-delete a task that already has submitted data — deactivate instead.
  const [{ count: formalCount }, { count: casualCount }, { count: aiCount }] = await Promise.all([
    supabase.from("writing_samples").select("id", { count: "exact", head: true }).eq("task_id", id),
    supabase.from("casual_responses").select("id", { count: "exact", head: true }).eq("task_id", id),
    supabase.from("ai_interactions").select("id", { count: "exact", head: true }).eq("task_id", id),
  ]);

  if ((formalCount ?? 0) + (casualCount ?? 0) + (aiCount ?? 0) > 0) {
    return jsonError("This task already has submitted data and cannot be deleted. Deactivate it instead.", 409);
  }

  const { error } = await supabase.from("tasks").delete().eq("id", id);
  if (error) return jsonError("Could not delete task.", 500);
  return NextResponse.json({ ok: true });
});
