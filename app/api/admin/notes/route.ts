import { NextResponse } from "next/server";
import { z } from "zod";
import { withApiErrorHandling, jsonError } from "@/lib/api/response";
import { requireAdmin } from "@/lib/auth/admin-auth";
import { createSupabaseServiceClient } from "@/lib/supabase/server";

const ALLOWED_TABLES = ["writing_samples", "casual_responses", "ai_interactions"] as const;

const bodySchema = z.object({
  table: z.enum(ALLOWED_TABLES),
  id: z.string().uuid(),
  note: z.string().max(4000),
});

// Researcher-only notes, never visible to participants.
export const POST = withApiErrorHandling(async (req: Request) => {
  await requireAdmin();
  const body = bodySchema.parse(await req.json());
  const supabase = createSupabaseServiceClient();

  const { error } = await supabase
    .from(body.table)
    .update({ researcher_note: body.note } as never)
    .eq("id", body.id);
  if (error) return jsonError("Could not save note.", 500);

  return NextResponse.json({ ok: true });
});
