import { NextResponse } from "next/server";
import { withApiErrorHandling, jsonError } from "@/lib/api/response";
import { draftSaveSchema } from "@/lib/validation";
import { requireCurrentSession } from "@/lib/auth/participant-session";
import { createSupabaseServiceClient } from "@/lib/supabase/server";

// Autosave stores only the CURRENT draft state per step (upsert), not a
// growing log of every keystroke — see session_drafts in the schema.
export const POST = withApiErrorHandling(async (req: Request) => {
  const body = draftSaveSchema.parse(await req.json());
  const session = await requireCurrentSession();
  const supabase = createSupabaseServiceClient();

  const { error } = await supabase.from("session_drafts").upsert(
    {
      session_id: session.id,
      step: body.step,
      draft_text: body.text,
      draft_metadata: body.metadata,
      updated_at: new Date().toISOString(),
    } as never,
    { onConflict: "session_id,step" }
  );

  if (error) return jsonError("Could not autosave draft.", 500);
  return NextResponse.json({ ok: true });
});

export const GET = withApiErrorHandling(async (req: Request) => {
  const url = new URL(req.url);
  const step = url.searchParams.get("step");
  if (!step) return jsonError("Missing step parameter.", 400);

  const session = await requireCurrentSession();
  const supabase = createSupabaseServiceClient();

  const { data } = await supabase
    .from("session_drafts")
    .select("draft_text, draft_metadata, updated_at")
    .eq("session_id", session.id)
    .eq("step", step)
    .maybeSingle();

  return NextResponse.json({ draft: data ?? null });
});
