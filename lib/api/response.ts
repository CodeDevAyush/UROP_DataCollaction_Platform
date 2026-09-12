import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { SessionNotFoundError } from "@/lib/auth/participant-session";
import { UnauthorizedError } from "@/lib/auth/admin-auth";

export function jsonError(message: string, status: number, details?: unknown) {
  return NextResponse.json({ error: message, details }, { status });
}

/**
 * Wraps a route handler so common failure modes (bad input, missing
 * session) become the right HTTP status instead of a raw 500 + stack trace
 * leaking to the client.
 */
export function withApiErrorHandling<Args extends unknown[]>(
  handler: (...args: Args) => Promise<Response>
) {
  return async (...args: Args): Promise<Response> => {
    try {
      return await handler(...args);
    } catch (err) {
      if (err instanceof SessionNotFoundError) {
        return jsonError(err.message, 401);
      }
      if (err instanceof UnauthorizedError) {
        return jsonError(err.message, 401);
      }
      if (err instanceof ZodError) {
        return jsonError("Invalid request data.", 400, err.flatten());
      }
      console.error("API error:", err);
      return jsonError("An unexpected error occurred. Please try again.", 500);
    }
  };
}
