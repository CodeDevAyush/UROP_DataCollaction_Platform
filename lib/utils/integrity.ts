import type { IntegrityFlag } from "@/types/database";

/**
 * Automatic integrity flag for a human-writing submission.
 *
 * IMPORTANT: this is a triage signal for researchers to manually review,
 * not proof of misconduct and not an "AI detector". See
 * docs/ETHICS_DATA_HANDLING.md. Never auto-delete or auto-reject data
 * based on this flag.
 *
 *   GREEN  — no paste/cut/drop events detected.
 *   YELLOW — a single paste/cut/drop event detected.
 *   RED    — multiple (3+) paste/cut/drop events detected.
 */
export interface IntegritySignals {
  pasteAttempts: number;
  cutAttempts: number;
  dropAttempts: number;
}

export function computeIntegrityFlag(signals: IntegritySignals): IntegrityFlag {
  const total = signals.pasteAttempts + signals.cutAttempts + signals.dropAttempts;
  if (total === 0) return "green";
  if (total <= 2) return "yellow";
  return "red";
}
