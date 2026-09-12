import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { createClient } from "@supabase/supabase-js";
import { env, getServiceRoleKey } from "@/lib/env";

// NOTE on manual typing throughout the API routes: the installed
// @supabase/postgrest-js has a type-inference bug where a generic
// Database type makes `.select()` resolve to `never` for almost any
// select string other than a bare "*" on a single table with no joins,
// and makes `.insert()`/`.update()` resolve to `never` as soon as the
// Insert/Update type has an optional field (i.e. almost always). See
// docs/DATABASE_SCHEMA.md "Known limitation" for a minimal repro.
//
// Workaround used throughout app/api: clients are left untyped, reads use
// `.overrideTypes<T, { merge: false }>()` (official escape hatch, see
// postgrest-js docs) against the hand-written interfaces in
// types/database.ts, and writes cast their payload `as never`.

/**
 * Cookie-aware Supabase client for use in Server Components/Route Handlers
 * that need to know the CURRENT ADMIN'S auth session (e.g. to read
 * `auth.uid()` or check `admin_profiles`). Uses the anon key + RLS, so it
 * can only see what the signed-in admin's policies allow (their own profile).
 */
export async function createSupabaseServerClient() {
  const cookieStore = await cookies();

  return createServerClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Called from a Server Component with no response to write to.
          // Safe to ignore — middleware refreshes the session cookie instead.
        }
      },
    },
  });
}

let adminClientSingleton: ReturnType<typeof createClient> | null = null;

/**
 * Privileged Supabase client using the SERVICE ROLE KEY. Bypasses RLS.
 * SERVER-SIDE ONLY — never import this file from a Client Component or
 * anything bundled for the browser. All participant-facing data reads and
 * writes go through this client from within API route handlers only, after
 * the route itself has done any necessary authorization checks.
 */
export function createSupabaseServiceClient() {
  if (adminClientSingleton) return adminClientSingleton;
  adminClientSingleton = createClient(env.NEXT_PUBLIC_SUPABASE_URL, getServiceRoleKey(), {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  return adminClientSingleton;
}
