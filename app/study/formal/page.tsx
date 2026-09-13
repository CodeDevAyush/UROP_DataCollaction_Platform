"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, PrimaryButton, SecondaryButton, ErrorAlert, LoadingState, InfoAlert } from "@/components/ui";
import { ProtectedTextarea } from "@/components/study/ProtectedTextarea";
import { useProtectedTextField } from "@/lib/hooks/useProtectedTextField";
import { useAutosave, fetchDraft } from "@/lib/hooks/useAutosave";

interface FormalTask {
  id: string;
  title: string;
  scenario: string;
  instructions: string;
  minimumCharacters: number;
  maximumCharacters: number | null;
}

type Attestation = "independent" | "assisted";

function FormalTaskForm({ task, onDone, onBack }: { task: FormalTask; onDone: () => void; onBack: () => void }) {
  const field = useProtectedTextField({ allowClipboard: false });
  const [attestation, setAttestation] = useState<Attestation>("independent");
  const [assistedNote, setAssistedNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const step = `formal:${task.id}`;
  useAutosave(step, field.text);

  // Restore an autosaved draft in the background — the form renders
  // immediately either way, so a rare draft (from an interrupted earlier
  // visit) just fades in rather than blocking every task with a network
  // round-trip.
  useEffect(() => {
    fetchDraft(step).then((draft) => {
      if (draft) field.setText(draft);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  const belowMinimum = field.characterCount < task.minimumCharacters;
  const canSubmit = !belowMinimum && (attestation === "independent" || assistedNote.trim().length > 0);

  async function handleSubmit() {
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/formal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          taskId: task.id,
          text: field.text,
          metadata: field.getMetadata(),
          attestation:
            attestation === "independent" ? { type: "independent" } : { type: "assisted", note: assistedNote },
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Could not submit your response.");
      }
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <h2 className="text-xl font-semibold text-slate-900">{task.title}</h2>
      <div className="mt-3 whitespace-pre-wrap rounded-md border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
        {task.scenario}
      </div>
      <InfoAlert>{task.instructions}</InfoAlert>

      <div className="mt-5">
        <ProtectedTextarea
          id="formal-response"
          label="Your response"
          fieldProps={field.fieldProps}
          characterCount={field.characterCount}
          elapsedSeconds={field.elapsedSeconds}
          minimumCharacters={task.minimumCharacters}
          maximumCharacters={task.maximumCharacters ?? undefined}
          rows={14}
        />
      </div>

      <fieldset className="mt-6 space-y-2 rounded-md border border-slate-200 p-4">
        <legend className="px-1 text-sm font-medium text-slate-800">Before you submit</legend>
        <label className="flex items-start gap-3 text-sm text-slate-800">
          <input
            type="radio"
            name="attestation"
            checked={attestation === "independent"}
            onChange={() => setAttestation("independent")}
            className="mt-0.5"
          />
          <span>
            I confirm that I wrote this response myself without using ChatGPT, Gemini, Claude, other generative
            AI, translation tools, or previously prepared text.
          </span>
        </label>
        <label className="flex items-start gap-3 text-sm text-slate-800">
          <input
            type="radio"
            name="attestation"
            checked={attestation === "assisted"}
            onChange={() => setAttestation("assisted")}
            className="mt-0.5"
          />
          <span>I used AI or other assistance for this response (please describe briefly).</span>
        </label>
        {attestation === "assisted" && (
          <textarea
            value={assistedNote}
            onChange={(e) => setAssistedNote(e.target.value)}
            placeholder="What did you use, and how?"
            className="mt-2 w-full rounded-md border border-slate-300 p-2 text-sm"
            rows={2}
          />
        )}
        <p className="pt-1 text-xs text-slate-500">
          Please answer honestly — this does not affect your ability to complete the study. We record it as
          research metadata rather than rejecting the submission.
        </p>
      </fieldset>

      <ErrorAlert message={error} />
      {belowMinimum && (
        <p className="mt-2 text-sm text-amber-700">
          Please write at least {task.minimumCharacters} characters before continuing ({field.characterCount} so
          far).
        </p>
      )}

      <div className="mt-6 flex justify-between">
        <SecondaryButton onClick={onBack}>Back</SecondaryButton>
        <PrimaryButton onClick={handleSubmit} disabled={!canSubmit || submitting}>
          {submitting ? "Submitting…" : "Submit and continue"}
        </PrimaryButton>
      </div>
    </>
  );
}

export default function FormalPage() {
  const router = useRouter();
  const [tasks, setTasks] = useState<FormalTask[] | null>(null);
  const [index, setIndex] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/tasks/formal")
      .then(async (r) => {
        if (!r.ok) throw new Error((await r.json()).error ?? "Could not load the task.");
        return r.json();
      })
      .then((data) => setTasks(data.tasks))
      .catch((err) => setError(err.message));
  }, []);

  if (error) {
    return (
      <Card>
        <ErrorAlert message={error} />
      </Card>
    );
  }
  if (!tasks) {
    return (
      <Card>
        <LoadingState />
      </Card>
    );
  }

  const current = tasks[index];
  if (!current) {
    router.push("/study/casual");
    return (
      <Card>
        <LoadingState />
      </Card>
    );
  }

  return (
    <Card key={current.id}>
      <FormalTaskForm
        task={current}
        onDone={() => {
          if (index + 1 < tasks.length) setIndex(index + 1);
          else router.push("/study/casual");
        }}
        onBack={() => {
          if (index > 0) setIndex(index - 1);
          else router.push("/study/profile");
        }}
      />
    </Card>
  );
}
