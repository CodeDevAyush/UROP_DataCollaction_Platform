"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, PrimaryButton, ErrorAlert, LoadingState } from "@/components/ui";

interface StudyConfig {
  consentText: string;
  consentVersion: string;
  researcherContact: string;
  facultyMentorContact: string;
}

const CHECKBOXES = [
  { key: "readUnderstood", label: "I have read and understood the information above." },
  { key: "voluntaryAgree", label: "I voluntarily agree to participate." },
  { key: "understandAnalysis", label: "I understand that my writing samples will be analyzed for research." },
  { key: "understandAiTasks", label: "I understand that some tasks involve generative AI." },
] as const;

type CheckKey = (typeof CHECKBOXES)[number]["key"];

export default function ConsentPage() {
  const router = useRouter();
  const [config, setConfig] = useState<StudyConfig | null>(null);
  const [checks, setChecks] = useState<Record<CheckKey, boolean>>({
    readUnderstood: false,
    voluntaryAgree: false,
    understandAnalysis: false,
    understandAiTasks: false,
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/study-config")
      .then((r) => r.json())
      .then(setConfig)
      .catch(() => setError("Could not load consent information. Please refresh the page."));
  }, []);

  const allChecked = CHECKBOXES.every((c) => checks[c.key]);

  async function handleSubmit() {
    if (!allChecked || !config) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/consent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...checks, consentVersion: config.consentVersion }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Could not record consent.");
      }
      router.push("/study/profile");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  }

  if (!config) {
    return (
      <Card>
        <LoadingState />
        <ErrorAlert message={error} />
      </Card>
    );
  }

  return (
    <Card>
      <h2 className="text-xl font-semibold text-slate-900">Informed consent</h2>
      <div className="mt-4 max-h-96 overflow-y-auto whitespace-pre-wrap rounded-md border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
        {config.consentText}
      </div>

      {(config.researcherContact || config.facultyMentorContact) && (
        <p className="mt-3 text-xs text-slate-500">
          {config.researcherContact && <>Researcher contact: {config.researcherContact}. </>}
          {config.facultyMentorContact && <>Faculty mentor: {config.facultyMentorContact}.</>}
        </p>
      )}

      <fieldset className="mt-6 space-y-3">
        <legend className="sr-only">Consent confirmations</legend>
        {CHECKBOXES.map((c) => (
          <label key={c.key} className="flex items-start gap-3 text-sm text-slate-800">
            <input
              type="checkbox"
              checked={checks[c.key]}
              onChange={(e) => setChecks((prev) => ({ ...prev, [c.key]: e.target.checked }))}
              className="mt-0.5 h-4 w-4 rounded border-slate-300 text-blue-700 focus:ring-blue-700"
            />
            <span>{c.label}</span>
          </label>
        ))}
      </fieldset>

      <ErrorAlert message={error} />

      <div className="mt-8 flex justify-end">
        <PrimaryButton onClick={handleSubmit} disabled={!allChecked || submitting}>
          {submitting ? "Submitting…" : "I agree — continue"}
        </PrimaryButton>
      </div>
    </Card>
  );
}
