"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, PrimaryButton, ErrorAlert } from "@/components/ui";

const ACADEMIC_YEARS = ["1st year", "2nd year", "3rd year", "4th year", "Postgraduate", "Other"];
const AGE_GROUPS = ["17–19", "20–22", "23–25", "26+"];
const AI_FREQUENCIES = ["Daily", "A few times a week", "A few times a month", "Rarely", "Never"];
const AI_TOOLS = ["ChatGPT", "Gemini", "Claude", "Copilot", "Other"];

function TextField({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-slate-800">{label}</span>
      <input
        type="text"
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full rounded-md border border-slate-300 p-2 text-slate-900 shadow-sm focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-400"
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
      <span className="text-sm font-medium text-slate-800">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full rounded-md border border-slate-300 bg-white p-2 text-slate-900 shadow-sm focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-400"
      >
        <option value="">Prefer not to say</option>
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
}: {
  label: string;
  options: string[];
  selected: string[];
  onChange: (v: string[]) => void;
}) {
  return (
    <fieldset>
      <legend className="text-sm font-medium text-slate-800">{label}</legend>
      <div className="mt-1 flex flex-wrap gap-x-4 gap-y-2">
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

export default function ProfilePage() {
  const router = useRouter();
  const [academicYear, setAcademicYear] = useState("");
  const [program, setProgram] = useState("");
  const [branch, setBranch] = useState("");
  const [ageGroup, setAgeGroup] = useState("");
  const [primaryLanguage, setPrimaryLanguage] = useState("");
  const [otherLanguages, setOtherLanguages] = useState("");
  const [aiUsageFrequency, setAiUsageFrequency] = useState("");
  const [aiToolsUsed, setAiToolsUsed] = useState<string[]>([]);
  const [aiPrimaryUse, setAiPrimaryUse] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit() {
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          academicYear,
          program,
          branch,
          ageGroup,
          primaryLanguage,
          otherLanguages: otherLanguages
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean),
          aiUsageFrequency,
          aiToolsUsed,
          aiPrimaryUse,
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
        This helps us understand our participant group. All fields are optional and no personally identifying
        information is required.
      </p>

      <div className="mt-6 grid gap-5 sm:grid-cols-2">
        <SelectField label="Academic year" value={academicYear} onChange={setAcademicYear} options={ACADEMIC_YEARS} />
        <TextField label="Program" value={program} onChange={setProgram} placeholder="e.g. B.Tech CSE" />
        <TextField label="Branch / department" value={branch} onChange={setBranch} placeholder="e.g. Computer Science" />
        <SelectField label="Age group" value={ageGroup} onChange={setAgeGroup} options={AGE_GROUPS} />
        <TextField label="Primary / native language" value={primaryLanguage} onChange={setPrimaryLanguage} placeholder="e.g. Tamil" />
        <TextField
          label="Other languages you use regularly"
          value={otherLanguages}
          onChange={setOtherLanguages}
          placeholder="Comma-separated, e.g. English, Hindi"
        />
        <SelectField label="How often do you use generative-AI tools?" value={aiUsageFrequency} onChange={setAiUsageFrequency} options={AI_FREQUENCIES} />
      </div>

      <div className="mt-5">
        <CheckboxGroup label="Which AI tools do you typically use?" options={AI_TOOLS} selected={aiToolsUsed} onChange={setAiToolsUsed} />
      </div>

      <div className="mt-5">
        <TextField
          label="What do you mainly use AI tools for?"
          value={aiPrimaryUse}
          onChange={setAiPrimaryUse}
          placeholder="e.g. assignments, coding help, brainstorming"
        />
      </div>

      <ErrorAlert message={error} />

      <div className="mt-8 flex justify-end">
        <PrimaryButton onClick={handleSubmit} disabled={submitting}>
          {submitting ? "Saving…" : "Continue"}
        </PrimaryButton>
      </div>
    </Card>
  );
}
