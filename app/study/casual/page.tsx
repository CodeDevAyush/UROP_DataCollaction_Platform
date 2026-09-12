"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, PrimaryButton, ErrorAlert, LoadingState } from "@/components/ui";
import { useProtectedTextField } from "@/lib/hooks/useProtectedTextField";
import { useAutosave, fetchDraft } from "@/lib/hooks/useAutosave";

interface CasualTask {
  id: string;
  title: string;
  scenario: string;
}

function CasualScenarioForm({
  task,
  index,
  total,
  onDone,
}: {
  task: CasualTask;
  index: number;
  total: number;
  onDone: () => void;
}) {
  const field = useProtectedTextField({ allowClipboard: false });
  const [independent, setIndependent] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [draftLoaded, setDraftLoaded] = useState(false);

  const step = `casual:${task.id}`;
  useAutosave(step, field.text);

  useEffect(() => {
    fetchDraft(step).then((draft) => {
      if (draft) field.setText(draft);
      setDraftLoaded(true);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  async function handleSubmit() {
    if (!field.text.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/casual", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          taskId: task.id,
          scenarioNumber: index + 1,
          text: field.text,
          metadata: field.getMetadata(),
          attestation: independent ? { type: "independent" } : { type: "assisted", note: "Not specified" },
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Could not submit your reply.");
      }
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  }

  if (!draftLoaded) return <LoadingState />;

  return (
    <>
      <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
        Situation {index + 1} of {total}
      </p>
      <h2 className="mt-1 text-lg font-semibold text-slate-900">{task.title}</h2>

      <div className="mx-auto mt-4 max-w-md">
        <div className="rounded-2xl rounded-bl-sm bg-slate-200 px-4 py-3 text-sm text-slate-800">{task.scenario}</div>
      </div>

      <div className="mx-auto mt-4 max-w-md">
        <label htmlFor="casual-reply" className="mb-1 block text-sm font-medium text-slate-800">
          Your reply
        </label>
        <textarea
          id="casual-reply"
          rows={4}
          placeholder="Type your natural reply..."
          className="w-full rounded-2xl rounded-br-sm border border-slate-300 bg-blue-50 p-3 text-slate-900 shadow-sm focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-400"
          {...field.fieldProps}
        />
        <div className="mt-1 flex justify-between text-xs text-slate-500">
          <span>Words: {field.wordCount}</span>
          <span>Paste disabled — type your natural reply.</span>
        </div>
      </div>

      <label className="mx-auto mt-4 flex max-w-md items-start gap-2 text-xs text-slate-600">
        <input
          type="checkbox"
          checked={independent}
          onChange={(e) => setIndependent(e.target.checked)}
          className="mt-0.5 h-4 w-4 rounded border-slate-300 text-blue-700 focus:ring-blue-700"
        />
        I wrote this reply myself, without AI or translation tools.
      </label>

      <ErrorAlert message={error} />

      <div className="mt-6 flex justify-end">
        <PrimaryButton onClick={handleSubmit} disabled={!field.text.trim() || submitting}>
          {submitting ? "Saving…" : index + 1 < total ? "Next situation" : "Submit and continue"}
        </PrimaryButton>
      </div>
    </>
  );
}

export default function CasualPage() {
  const router = useRouter();
  const [tasks, setTasks] = useState<CasualTask[] | null>(null);
  const [index, setIndex] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/tasks/casual")
      .then(async (r) => {
        if (!r.ok) throw new Error((await r.json()).error ?? "Could not load the scenarios.");
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
    router.push("/study/ai");
    return (
      <Card>
        <LoadingState />
      </Card>
    );
  }

  return (
    <Card key={current.id}>
      <CasualScenarioForm
        task={current}
        index={index}
        total={tasks.length}
        onDone={() => {
          if (index + 1 < tasks.length) setIndex(index + 1);
          else router.push("/study/ai");
        }}
      />
    </Card>
  );
}
