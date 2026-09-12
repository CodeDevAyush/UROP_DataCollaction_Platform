import "server-only";
import { createSupabaseServerClient, createSupabaseServiceClient } from "@/lib/supabase/server";
import type { AdminProfile } from "@/types/database";

export class UnauthorizedError extends Error {
  constructor(message = "Sign-in required.") {
    super(message);
    this.name = "UnauthorizedError";
  }
}

/**
 * Verifies the request is from a signed-in Supabase Auth user AND that
 * user has an admin_profiles row. Use at the top of every admin API route
 * — middleware only guards page navigation, not API routes directly.
 */
export async function requireAdmin(): Promise<AdminProfile> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new UnauthorizedError();

  const service = createSupabaseServiceClient();
  const { data: profile } = await service.from("admin_profiles").select("*").eq("id", user.id).maybeSingle();
  if (!profile) throw new UnauthorizedError("No admin profile found for this account.");

  return profile as AdminProfile;
}
