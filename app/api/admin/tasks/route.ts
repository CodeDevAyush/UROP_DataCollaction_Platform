import { NextResponse } from "next/server";
import { z } from "zod";
import { withApiErrorHandling, jsonError } from "@/lib/api/response";
import { requireAdmin } from "@/lib/auth/admin-auth";
import { createSupabaseServiceClient } from "@/lib/supabase/server";
import type { Task } from "@/types/database";

const taskSchema = z.object({
  taskCode: z.string().min(1).max(100),
  condition: z.enum(["formal", "casual", "ai"]),
  studyPhase: z.string().min(1).max(100).default("baseline"),
  title: z.string().min(1).max(300),
  scenario: z.string().min(1).max(10000),
  instructions: z.string().max(5000).default(""),
  minimumCharacters: z.number().int().min(0).default(0),
  maximumCharacters: z.number().int().min(0).nullable().optional(),
  minimumDurationSeconds: z.number().int().min(0).nullable().optional(),
  maximumDurationSeconds: z.number().int().min(0).nullable().optional(),
  randomizationGroup: z.string().max(100).nullable().optional(),
  displayOrder: z.number().int().default(0),
  active: z.boolean().default(true),
});

export const GET = withApiErrorHandling(async (req: Request) => {
  await requireAdmin();
  const url = new URL(req.url);
  const condition = url.searchParams.get("condition");
  const supabase = createSupabaseServiceClient();

  let query = supabase.from("tasks").select("*").order("condition").order("display_order");
  if (condition) query = query.eq("condition", condition);

  const { data, error } = await query.overrideTypes<Task[], { merge: false }>();
  if (error) throw error;
  return NextResponse.json({ tasks: data ?? [] });
});

export const POST = withApiErrorHandling(async (req: Request) => {
  await requireAdmin();
  const body = taskSchema.parse(await req.json());
  const supabase = createSupabaseServiceClient();

  const { data, error } = await supabase
    .from("tasks")
    .insert({
      task_code: body.taskCode,
      condition: body.condition,
      study_phase: body.studyPhase,
      title: body.title,
      scenario: body.scenario,
      instructions: body.instructions,
      minimum_characters: body.minimumCharacters,
      maximum_characters: body.maximumCharacters ?? null,
      minimum_duration_seconds: body.minimumDurationSeconds ?? null,
      maximum_duration_seconds: body.maximumDurationSeconds ?? null,
      randomization_group: body.randomizationGroup ?? null,
      display_order: body.displayOrder,
      active: body.active,
    } as never)
    .select()
    .single()
    .overrideTypes<Task, { merge: false }>();

  if (error) {
    if (error.code === "23505") return jsonError("A task with this code already exists.", 409);
    return jsonError("Could not create task.", 500);
  }
  return NextResponse.json({ task: data });
});
