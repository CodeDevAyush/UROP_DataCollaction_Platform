"use client";

const DATASETS: { key: string; label: string; description: string }[] = [
  { key: "participants", label: "Participants & sessions", description: "One row per session: participant code, phase, status, timestamps." },
  { key: "profiles", label: "Participant profiles", description: "Demographic/context fields per participant." },
  { key: "formal", label: "Formal writing samples", description: "Raw text, word/character counts, and integrity metadata." },
  { key: "casual", label: "Casual responses", description: "Raw text per scenario, with integrity metadata." },
  { key: "ai", label: "AI interactions", description: "Student prompts, AI output, and edited output — kept distinct." },
];

export default function ExportPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold text-slate-900">Export research data</h1>
      <p className="text-sm text-slate-600">
        No participant names or emails are collected, so every export below is already keyed only by the
        anonymous participant code. Downloads use your signed-in admin session.
      </p>

      <div className="grid gap-4 sm:grid-cols-2">
        {DATASETS.map((d) => (
          <div key={d.key} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-sm font-semibold text-slate-800">{d.label}</p>
            <p className="mt-1 text-xs text-slate-500">{d.description}</p>
            <div className="mt-3 flex gap-2">
              <a
                href={`/api/admin/export?dataset=${d.key}&format=csv`}
                className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
              >
                Download CSV
              </a>
              <a
                href={`/api/admin/export?dataset=${d.key}&format=json`}
                className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
              >
                View JSON
              </a>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
