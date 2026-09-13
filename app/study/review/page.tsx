"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, PrimaryButton, SecondaryButton, ErrorAlert, LoadingState } from "@/components/ui";

interface SessionStatus {
  started: boolean;
  progress?: {
    profile: boolean;
    formal: { completed: boolean };
    casual: { completedCount: number; totalAssigned: number; complete: boolean };
    ai: { hasPrompt: boolean; hasOutput: boolean; complete: boolean };
  };
  conditionsMandatory?: { formal: boolean; casual: boolean; ai: boolean };
}

function ChecklistRow({ label, done, required }: { label: string; done: boolean; required: boolean }) {
  return (
    <li className="flex items-center justify-between border-b border-slate-100 py-2 text-sm last:border-0">
      <span className="text-slate-800">
        {label} {required && <span className="text-slate-400">(required)</span>}
      </span>
      <span className={done ? "font-medium text-green-700" : "font-medium text-amber-700"}>
        {done ? "Complete" : "Not yet complete"}
      </span>
    </li>
  );
}

export default function ReviewPage() {
  const router = useRouter();
  const [status, setStatus] = useState<SessionStatus | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function load() {
    fetch("/api/session")
      .then((r) => r.json())
      .then(setStatus)
      .catch(() => setError("Could not load your progress."));
  }

  useEffect(load, []);

  async function handleFinish() {
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/complete", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not finish the study.");
      if (typeof window !== "undefined" && data.participantCode) {
        sessionStorage.setItem("urop_participant_code", data.participantCode);
      }
      router.push("/study/completion");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      load();
    } finally {
      setSubmitting(false);
    }
  }

  if (!status) {
    return (
      <Card>
        <LoadingState />
      </Card>
    );
  }

  if (!status.started || !status.progress || !status.conditionsMandatory) {
    return (
      <Card>
        <ErrorAlert message="No active session found. Please start the study from the beginning." />
      </Card>
    );
  }

  const { progress, conditionsMandatory } = status;
  const allRequiredDone =
    (!conditionsMandatory.formal || progress.formal.completed) &&
    (!conditionsMandatory.casual || progress.casual.complete) &&
    (!conditionsMandatory.ai || progress.ai.complete);

  return (
    <Card>
      <h2 className="text-xl font-semibold text-slate-900">Review before finishing</h2>
      <p className="mt-1 text-sm text-slate-600">
        Here is a summary of what you&apos;ve completed. Your actual responses are not shown here — once
        submitted, each task is final.
      </p>

      <ul className="mt-4">
        <ChecklistRow label="Profile questions" done={progress.profile} required={false} />
        <ChecklistRow label="Formal writing task" done={progress.formal.completed} required={conditionsMandatory.formal} />
        <ChecklistRow
          label={`Casual scenarios (${progress.casual.completedCount}/${progress.casual.totalAssigned || "?"})`}
          done={progress.casual.complete}
          required={conditionsMandatory.casual}
        />
        <ChecklistRow label="AI-mediated task" done={progress.ai.complete} required={conditionsMandatory.ai} />
      </ul>

      {!allRequiredDone && (
        <p className="mt-4 text-sm text-amber-700">
          Please go back and complete the required sections above before finishing.
        </p>
      )}

      <ErrorAlert message={error} />

      <div className="mt-8 flex justify-between">
        <SecondaryButton onClick={() => router.push("/study/ai")}>Back</SecondaryButton>
        <PrimaryButton onClick={handleFinish} disabled={!allRequiredDone || submitting}>
          {submitting ? "Finishing…" : "Finish the study"}
        </PrimaryButton>
      </div>
    </Card>
  );
}
