"use client";

import { useEffect, useState } from "react";
import { LoadingState, ErrorAlert, PrimaryButton, SecondaryButton } from "@/components/ui";

interface TaskRow {
  id: string;
  task_code: string;
  condition: "formal" | "casual" | "ai";
  study_phase: string;
  title: string;
  scenario: string;
  instructions: string;
  minimum_words: number;
  maximum_words: number | null;
  display_order: number;
  active: boolean;
}

const EMPTY_FORM = {
  taskCode: "",
  condition: "formal" as TaskRow["condition"],
  studyPhase: "baseline",
  title: "",
  scenario: "",
  instructions: "",
  minimumWords: 150,
  maximumWords: 300 as number | null,
  displayOrder: 0,
};

export default function QuestionsPage() {
  const [tasks, setTasks] = useState<TaskRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);

  function load() {
    fetch("/api/admin/tasks")
      .then(async (r) => {
        if (!r.ok) throw new Error((await r.json()).error ?? "Failed to load question bank.");
        return r.json();
      })
      .then((data) => setTasks(data.tasks))
      .catch((err) => setError(err.message));
  }

  useEffect(load, []);

  async function toggleActive(task: TaskRow) {
    await fetch(`/api/admin/tasks/${task.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: !task.active }),
    });
    load();
  }

  async function createTask() {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Could not create task.");
      setForm(EMPTY_FORM);
      setShowForm(false);
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-slate-900">Question bank</h1>
        <SecondaryButton onClick={() => setShowForm((v) => !v)}>{showForm ? "Cancel" : "Add task"}</SecondaryButton>
      </div>

      <ErrorAlert message={error} />

      {showForm && (
        <div className="space-y-3 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-sm">
              Task code
              <input
                value={form.taskCode}
                onChange={(e) => setForm({ ...form, taskCode: e.target.value })}
                className="mt-1 w-full rounded-md border border-slate-300 p-2"
                placeholder="e.g. formal-new-topic"
              />
            </label>
            <label className="text-sm">
              Condition
              <select
                value={form.condition}
                onChange={(e) => setForm({ ...form, condition: e.target.value as TaskRow["condition"] })}
                className="mt-1 w-full rounded-md border border-slate-300 bg-white p-2"
              >
                <option value="formal">Formal</option>
                <option value="casual">Casual</option>
                <option value="ai">AI</option>
              </select>
            </label>
            <label className="text-sm sm:col-span-2">
              Title
              <input
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                className="mt-1 w-full rounded-md border border-slate-300 p-2"
              />
            </label>
            <label className="text-sm sm:col-span-2">
              Scenario
              <textarea
                value={form.scenario}
                onChange={(e) => setForm({ ...form, scenario: e.target.value })}
                rows={5}
                className="mt-1 w-full rounded-md border border-slate-300 p-2"
              />
            </label>
            <label className="text-sm sm:col-span-2">
              Instructions shown to participant
              <textarea
                value={form.instructions}
                onChange={(e) => setForm({ ...form, instructions: e.target.value })}
                rows={2}
                className="mt-1 w-full rounded-md border border-slate-300 p-2"
              />
            </label>
            <label className="text-sm">
              Minimum words
              <input
                type="number"
                value={form.minimumWords}
                onChange={(e) => setForm({ ...form, minimumWords: Number(e.target.value) })}
                className="mt-1 w-full rounded-md border border-slate-300 p-2"
              />
            </label>
            <label className="text-sm">
              Maximum words (optional)
              <input
                type="number"
                value={form.maximumWords ?? ""}
                onChange={(e) => setForm({ ...form, maximumWords: e.target.value ? Number(e.target.value) : null })}
                className="mt-1 w-full rounded-md border border-slate-300 p-2"
              />
            </label>
          </div>
          <PrimaryButton onClick={createTask} disabled={saving || !form.taskCode || !form.title || !form.scenario}>
            {saving ? "Saving…" : "Create task"}
          </PrimaryButton>
        </div>
      )}

      {!tasks ? (
        <LoadingState />
      ) : (
        <div className="space-y-3">
          {(["formal", "casual", "ai"] as const).map((cond) => (
            <div key={cond}>
              <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">{cond}</h2>
              <div className="mt-2 space-y-2">
                {tasks
                  .filter((t) => t.condition === cond)
                  .map((t) => (
                    <div key={t.id} className="flex items-start justify-between gap-4 rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
                      <div>
                        <p className="text-sm font-medium text-slate-800">
                          {t.title} <span className="font-mono text-xs text-slate-400">({t.task_code})</span>
                        </p>
                        <p className="text-xs text-slate-500">
                          Phase: {t.study_phase} · min words: {t.minimum_words}
                          {t.maximum_words ? ` · max: ${t.maximum_words}` : ""}
                        </p>
                      </div>
                      <button
                        onClick={() => toggleActive(t)}
                        className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium ${
                          t.active ? "bg-green-100 text-green-800" : "bg-slate-100 text-slate-500"
                        }`}
                      >
                        {t.active ? "Active" : "Inactive"}
                      </button>
                    </div>
                  ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
