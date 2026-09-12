"use client";

import { useEffect, useState } from "react";
import { LoadingState, ErrorAlert, PrimaryButton } from "@/components/ui";

interface Settings {
  consentText: string;
  consentVersion: string;
  conditionsMandatory: { formal: boolean; casual: boolean; ai: boolean };
  taskCounts: { formal: number; casual: number; ai: number };
  aiToolOptions: string[];
  aiDefaultMode: "controlled" | "natural";
  currentStudyPhase: string;
  researcherContact: string;
  facultyMentorContact: string;
  retentionPolicy: string;
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/admin/settings")
      .then(async (r) => {
        if (!r.ok) throw new Error((await r.json()).error ?? "Failed to load settings.");
        return r.json();
      })
      .then(setSettings)
      .catch((err) => setError(err.message));
  }, []);

  async function save() {
    if (!settings) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Could not save settings.");
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setSaving(false);
    }
  }

  if (error && !settings) return <ErrorAlert message={error} />;
  if (!settings) return <LoadingState />;

  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="text-xl font-semibold text-slate-900">Study settings</h1>

      <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="text-sm font-semibold text-slate-800">Mandatory conditions</h2>
        <div className="mt-2 flex gap-4 text-sm">
          {(["formal", "casual", "ai"] as const).map((c) => (
            <label key={c} className="flex items-center gap-2 capitalize">
              <input
                type="checkbox"
                checked={settings.conditionsMandatory[c]}
                onChange={(e) =>
                  setSettings({ ...settings, conditionsMandatory: { ...settings.conditionsMandatory, [c]: e.target.checked } })
                }
              />
              {c}
            </label>
          ))}
        </div>
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="text-sm font-semibold text-slate-800">Task counts per participant</h2>
        <div className="mt-2 grid grid-cols-3 gap-3 text-sm">
          {(["formal", "casual", "ai"] as const).map((c) => (
            <label key={c} className="capitalize">
              {c}
              <input
                type="number"
                min={0}
                value={settings.taskCounts[c]}
                onChange={(e) => setSettings({ ...settings, taskCounts: { ...settings.taskCounts, [c]: Number(e.target.value) } })}
                className="mt-1 w-full rounded-md border border-slate-300 p-2"
              />
            </label>
          ))}
        </div>
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="text-sm font-semibold text-slate-800">AI condition</h2>
        <label className="mt-2 block text-sm">
          AI tool options (comma-separated)
          <input
            value={settings.aiToolOptions.join(", ")}
            onChange={(e) => setSettings({ ...settings, aiToolOptions: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) })}
            className="mt-1 w-full rounded-md border border-slate-300 p-2"
          />
        </label>
        <label className="mt-3 block text-sm">
          Default AI mode
          <select
            value={settings.aiDefaultMode}
            onChange={(e) => setSettings({ ...settings, aiDefaultMode: e.target.value as "controlled" | "natural" })}
            className="mt-1 w-full rounded-md border border-slate-300 bg-white p-2"
          >
            <option value="natural">Natural (participant&apos;s normal AI environment)</option>
            <option value="controlled">Controlled (fresh/new chat)</option>
          </select>
        </label>
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="text-sm font-semibold text-slate-800">Study phase & contacts</h2>
        <label className="mt-2 block text-sm">
          Current study phase (e.g. baseline, post_exposure, followup)
          <input
            value={settings.currentStudyPhase}
            onChange={(e) => setSettings({ ...settings, currentStudyPhase: e.target.value })}
            className="mt-1 w-full rounded-md border border-slate-300 p-2"
          />
        </label>
        <label className="mt-3 block text-sm">
          Researcher contact
          <input
            value={settings.researcherContact}
            onChange={(e) => setSettings({ ...settings, researcherContact: e.target.value })}
            className="mt-1 w-full rounded-md border border-slate-300 p-2"
          />
        </label>
        <label className="mt-3 block text-sm">
          Faculty mentor contact
          <input
            value={settings.facultyMentorContact}
            onChange={(e) => setSettings({ ...settings, facultyMentorContact: e.target.value })}
            className="mt-1 w-full rounded-md border border-slate-300 p-2"
          />
        </label>
        <label className="mt-3 block text-sm">
          Data retention policy (shown to researchers, not participants)
          <textarea
            value={settings.retentionPolicy}
            onChange={(e) => setSettings({ ...settings, retentionPolicy: e.target.value })}
            rows={2}
            className="mt-1 w-full rounded-md border border-slate-300 p-2"
          />
        </label>
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="text-sm font-semibold text-slate-800">Consent</h2>
        <label className="mt-2 block text-sm">
          Consent version
          <input
            value={settings.consentVersion}
            onChange={(e) => setSettings({ ...settings, consentVersion: e.target.value })}
            className="mt-1 w-full rounded-md border border-slate-300 p-2"
          />
        </label>
        <label className="mt-3 block text-sm">
          Consent text shown to participants
          <textarea
            value={settings.consentText}
            onChange={(e) => setSettings({ ...settings, consentText: e.target.value })}
            rows={10}
            className="mt-1 w-full rounded-md border border-slate-300 p-2 font-mono text-xs"
          />
        </label>
        <p className="mt-1 text-xs text-amber-700">
          Changing this text does not retroactively re-consent existing participants. Bump the consent version
          when you make a substantive change.
        </p>
      </section>

      <ErrorAlert message={error} />
      <div className="flex items-center gap-3">
        <PrimaryButton onClick={save} disabled={saving}>
          {saving ? "Saving…" : "Save settings"}
        </PrimaryButton>
        {saved && <span className="text-sm text-green-700">Saved.</span>}
      </div>
    </div>
  );
}
