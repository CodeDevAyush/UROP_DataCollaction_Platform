import "server-only";
import { cookies } from "next/headers";
import { createSupabaseServiceClient } from "@/lib/supabase/server";
import type { StudySession } from "@/types/database";

const SESSION_COOKIE = "urop_session_id";

export async function setSessionCookie(sessionId: string) {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, sessionId, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 7, // 7 days — enough to resume an interrupted session
  });
}

export async function clearSessionCookie() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
}

/**
 * Resolves the current participant session from the httpOnly cookie.
 * Returns null if there is no cookie, or the cookie no longer matches a
 * real session (e.g. stale/tampered) — callers should treat that as
 * "not started yet" rather than an error.
 */
export async function getCurrentSession(): Promise<StudySession | null> {
  const cookieStore = await cookies();
  const sessionId = cookieStore.get(SESSION_COOKIE)?.value;
  if (!sessionId) return null;

  const supabase = createSupabaseServiceClient();
  const { data, error } = await supabase.from("study_sessions").select("*").eq("id", sessionId).maybeSingle();
  if (error || !data) return null;
  return data as StudySession;
}

export async function requireCurrentSession(): Promise<StudySession> {
  const session = await getCurrentSession();
  if (!session) {
    throw new SessionNotFoundError();
  }
  return session;
}

export class SessionNotFoundError extends Error {
  constructor() {
    super("No active study session. Please start from the beginning.");
    this.name = "SessionNotFoundError";
  }
}
