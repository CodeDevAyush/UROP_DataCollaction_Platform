"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, PrimaryButton, SecondaryButton, ErrorAlert } from "@/components/ui";
import { useAutosave, fetchDraft } from "@/lib/hooks/useAutosave";

const ACADEMIC_YEARS = ["1st year", "2nd year", "3rd year", "4th year", "Postgraduate", "Other"];
const AGE_GROUPS = ["17–19", "20–22", "23–25", "26+"];
const AI_FREQUENCIES = ["Daily", "A few times a week", "A few times a month", "Rarely", "Never"];
const AI_TOOLS = ["ChatGPT", "Gemini", "Claude", "Copilot", "Other"];

interface ProfileFormState {
  academicYear: string;
  program: string;
  branch: string;
  ageGroup: string;
  primaryLanguage: string;
  otherLanguages: string;
  aiUsageFrequency: string;
  aiToolsUsed: string[];
  aiPrimaryUse: string;
}

const INITIAL_STATE: ProfileFormState = {
  academicYear: ACADEMIC_YEARS[0],
  program: "",
  branch: "",
  ageGroup: AGE_GROUPS[0],
  primaryLanguage: "",
  otherLanguages: "",
  aiUsageFrequency: AI_FREQUENCIES[0],
  aiToolsUsed: [],
  aiPrimaryUse: "",
};

const DRAFT_STEP = "profile";

function TextField({
  label,
  value,
  onChange,
  placeholder,
  missing,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  missing?: boolean;
}) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-slate-800">
        {label} <span className="text-red-600">*</span>
      </span>
      <input
        type="text"
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className={`mt-1 w-full rounded-md border p-2 text-slate-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-slate-400 ${
          missing ? "border-red-400 bg-red-50" : "border-slate-300 focus:border-slate-500"
        }`}
      />
    </label>
  );
}

function SelectField({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: string[];
}) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-slate-800">
        {label} <span className="text-red-600">*</span>
      </span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full rounded-md border border-slate-300 bg-white p-2 text-slate-900 shadow-sm focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-400"
      >
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    </label>
  );
}

function CheckboxGroup({
  label,
  options,
  selected,
  onChange,
  missing,
}: {
  label: string;
  options: string[];
  selected: string[];
  onChange: (v: string[]) => void;
  missing?: boolean;
}) {
  return (
    <fieldset>
      <legend className="text-sm font-medium text-slate-800">
        {label} <span className="text-red-600">*</span>
      </legend>
      <div className={`mt-1 flex flex-wrap gap-x-4 gap-y-2 rounded-md p-2 ${missing ? "bg-red-50" : ""}`}>
        {options.map((o) => (
          <label key={o} className="flex items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={selected.includes(o)}
              onChange={(e) =>
                onChange(e.target.checked ? [...selected, o] : selected.filter((s) => s !== o))
              }
              className="h-4 w-4 rounded border-slate-300 text-blue-700 focus:ring-blue-700"
            />
            {o}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

/** Fields that can actually be left blank in the UI (the selects always
 * carry a default value, so there's nothing to validate there). */
function findMissingFields(state: ProfileFormState): { key: string; label: string }[] {
  const checks: { key: string; label: string; filled: boolean }[] = [
    { key: "program", label: "Program", filled: state.program.trim() !== "" },
    { key: "branch", label: "Branch / department", filled: state.branch.trim() !== "" },
    { key: "primaryLanguage", label: "Primary / native language", filled: state.primaryLanguage.trim() !== "" },
    { key: "otherLanguages", label: "Other languages you use regularly", filled: state.otherLanguages.trim() !== "" },
    { key: "aiToolsUsed", label: "AI tools you typically use", filled: state.aiToolsUsed.length > 0 },
    { key: "aiPrimaryUse", label: "What you mainly use AI tools for", filled: state.aiPrimaryUse.trim() !== "" },
  ];
  return checks.filter((c) => !c.filled).map(({ key, label }) => ({ key, label }));
}

export default function ProfilePage() {
  const router = useRouter();
  const [form, setForm] = useState<ProfileFormState>(INITIAL_STATE);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [missingKeys, setMissingKeys] = useState<Set<string>>(new Set());
  const draftLoadedRef = useRef(false);

  const draftText = JSON.stringify(form);
  useAutosave(DRAFT_STEP, draftText);

  // Restore an in-progress profile if the participant left and came back
  // before finishing — saved automatically as they type (see useAutosave
  // above), not just on submit.
  useEffect(() => {
    fetchDraft(DRAFT_STEP).then((draft) => {
      if (draft) {
        try {
          const parsed = JSON.parse(draft) as Partial<ProfileFormState>;
          setForm((prev) => ({ ...prev, ...parsed }));
        } catch {
          // Ignore a malformed/older draft shape and start fresh.
        }
      }
      draftLoadedRef.current = true;
    });
  }, []);

  function update<K extends keyof ProfileFormState>(key: K, value: ProfileFormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
    setMissingKeys((prev) => {
      if (!prev.has(key)) return prev;
      const next = new Set(prev);
      next.delete(key);
      return next;
    });
  }

  async function handleSubmit() {
    const missing = findMissingFields(form);
    if (missing.length > 0) {
      setMissingKeys(new Set(missing.map((m) => m.key)));
      setError(`Please fill in the following before continuing: ${missing.map((m) => m.label).join(", ")}.`);
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          academicYear: form.academicYear,
          program: form.program,
          branch: form.branch,
          ageGroup: form.ageGroup,
          primaryLanguage: form.primaryLanguage,
          otherLanguages: form.otherLanguages
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean),
          aiUsageFrequency: form.aiUsageFrequency,
          aiToolsUsed: form.aiToolsUsed,
          aiPrimaryUse: form.aiPrimaryUse,
        }),
      });
      if (!res.ok) throw new Error("Could not save your profile. Please try again.");
      router.push("/study/formal");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Card>
      <h2 className="text-xl font-semibold text-slate-900">A few questions about you</h2>
      <p className="mt-1 text-sm text-slate-600">
        Please answer every question below — no personally identifying information is required. Your answers are
        saved automatically as you go.
      </p>

      <div className="mt-6 grid gap-5 sm:grid-cols-2">
        <SelectField label="Academic year" value={form.academicYear} onChange={(v) => update("academicYear", v)} options={ACADEMIC_YEARS} />
        <TextField
          label="Program"
          value={form.program}
          onChange={(v) => update("program", v)}
          placeholder="e.g. BTech"
          missing={missingKeys.has("program")}
        />
        <TextField
          label="Branch / department"
          value={form.branch}
          onChange={(v) => update("branch", v)}
          placeholder="e.g. CSE"
          missing={missingKeys.has("branch")}
        />
        <SelectField label="Age group" value={form.ageGroup} onChange={(v) => update("ageGroup", v)} options={AGE_GROUPS} />
        <TextField
          label="Primary / native language"
          value={form.primaryLanguage}
          onChange={(v) => update("primaryLanguage", v)}
          placeholder="e.g. Hindi"
          missing={missingKeys.has("primaryLanguage")}
        />
        <TextField
          label="Other languages you use regularly"
          value={form.otherLanguages}
          onChange={(v) => update("otherLanguages", v)}
          placeholder="Comma-separated, e.g. English, Tamil"
          missing={missingKeys.has("otherLanguages")}
        />
        <SelectField
          label="How often do you use generative-AI tools?"
          value={form.aiUsageFrequency}
          onChange={(v) => update("aiUsageFrequency", v)}
          options={AI_FREQUENCIES}
        />
      </div>

      <div className="mt-5">
        <CheckboxGroup
          label="Which AI tools do you typically use?"
          options={AI_TOOLS}
          selected={form.aiToolsUsed}
          onChange={(v) => update("aiToolsUsed", v)}
          missing={missingKeys.has("aiToolsUsed")}
        />
      </div>

      <div className="mt-5">
        <TextField
          label="What do you mainly use AI tools for?"
          value={form.aiPrimaryUse}
          onChange={(v) => update("aiPrimaryUse", v)}
          placeholder="e.g. assignments, coding help, brainstorming"
          missing={missingKeys.has("aiPrimaryUse")}
        />
      </div>

      <ErrorAlert message={error} />

      <div className="mt-8 flex justify-between">
        <SecondaryButton onClick={() => router.push("/study/consent")}>Back</SecondaryButton>
        <PrimaryButton onClick={handleSubmit} disabled={submitting}>
          {submitting ? "Saving…" : "Continue"}
        </PrimaryButton>
      </div>
    </Card>
  );
}
