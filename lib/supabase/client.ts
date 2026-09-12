"use client";

import { createBrowserClient } from "@supabase/ssr";

/**
 * Browser Supabase client, used ONLY for Supabase Auth (admin login/logout).
 * It uses the public anon key, which has no table access under our RLS
 * policies (see supabase/migrations). Never query research data tables
 * with this client — use the server API routes instead.
 */
export function createSupabaseBrowserClient() {
  return createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
}
