"use client";

import { useCallback, useEffect, useRef } from "react";

/**
 * Debounced autosave to /api/drafts. Saves at most once every `intervalMs`
 * (default 12s, within the spec's 10-15s guidance) plus a final save on
 * unmount/step change, so a refresh or crash loses at most a few seconds
 * of typing rather than the whole response.
 */
export function useAutosave(step: string, text: string, intervalMs = 12000) {
  const lastSavedRef = useRef<string>("");
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const textRef = useRef(text);
  useEffect(() => {
    textRef.current = text;
  }, [text]);

  const save = useCallback(async () => {
    const current = textRef.current;
    if (current === lastSavedRef.current) return;
    lastSavedRef.current = current;
    try {
      await fetch("/api/drafts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ step, text: current, metadata: {} }),
      });
    } catch {
      // Best-effort — a failed autosave should never interrupt the participant.
    }
  }, [step]);

  useEffect(() => {
    timerRef.current = setInterval(save, intervalMs);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      void save();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  return { saveNow: save };
}

export async function fetchDraft(step: string): Promise<string> {
  try {
    const res = await fetch(`/api/drafts?step=${encodeURIComponent(step)}`);
    if (!res.ok) return "";
    const data = await res.json();
    return data.draft?.draft_text ?? "";
  } catch {
    return "";
  }
}
