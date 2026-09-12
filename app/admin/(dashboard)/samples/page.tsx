"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { LoadingState, ErrorAlert } from "@/components/ui";

type Condition = "formal" | "casual" | "ai";

interface SampleRow {
  id: string;
  participant_id: string;
  raw_text?: string;
  student_prompt?: string;
  ai_output?: string;
  integrity_flag?: string;
  word_count?: number;
  created_at: string;
  tasks: { title: string } | null;
  participants: { participant_code: string } | null;
}

const CONDITIONS: { key: Condition; label: string }[] = [
  { key: "formal", label: "Formal" },
  { key: "casual", label: "Casual" },
  { key: "ai", label: "AI-mediated" },
];

export default function SamplesPage() {
  const [condition, setCondition] = useState<Condition>("formal");
  const [integrityFlag, setIntegrityFlag] = useState("");
  const [rows, setRows] = useState<SampleRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams({ condition });
    if (integrityFlag) params.set("integrityFlag", integrityFlag);
    fetch(`/api/admin/samples?${params.toString()}`)
      .then(async (r) => {
        if (!r.ok) throw new Error((await r.json()).error ?? "Failed to load samples.");
        return r.json();
      })
      .then((data) => setRows(data.rows))
      .catch((err) => setError(err.message));
  }, [condition, integrityFlag]);

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold text-slate-900">Samples</h1>

      <div className="flex flex-wrap items-center gap-3">
        <div className="flex rounded-md border border-slate-300 bg-white">
          {CONDITIONS.map((c) => (
            <button
              key={c.key}
              onClick={() => setCondition(c.key)}
              className={`px-4 py-2 text-sm font-medium ${condition === c.key ? "bg-blue-700 text-white" : "text-slate-700 hover:bg-slate-50"}`}
            >
              {c.label}
            </button>
          ))}
        </div>
        {condition !== "ai" && (
          <select value={integrityFlag} onChange={(e) => setIntegrityFlag(e.target.value)} className="rounded-md border border-slate-300 p-2 text-sm">
            <option value="">All integrity flags</option>
            <option value="green">Green</option>
            <option value="yellow">Yellow</option>
            <option value="red">Red</option>
          </select>
        )}
      </div>

      <ErrorAlert message={error} />
      {!rows ? (
        <LoadingState />
      ) : (
        <div className="space-y-3">
          {rows.length === 0 && <p className="text-sm text-slate-400">No samples yet for this filter.</p>}
          {rows.map((r) => (
            <article key={r.id} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <Link href={`/admin/participants/${r.participant_id}`} className="font-mono text-sm text-blue-700 hover:underline">
                  {r.participants?.participant_code}
                </Link>
                <span className="text-xs text-slate-400">{new Date(r.created_at).toLocaleString()}</span>
              </div>
              <p className="mt-1 text-xs font-semibold uppercase text-slate-400">{r.tasks?.title}</p>
              <p className="mt-1 line-clamp-3 whitespace-pre-wrap text-sm text-slate-700">
                {r.raw_text ?? r.student_prompt ?? "(no text)"}
              </p>
              {r.integrity_flag && <p className="mt-1 text-xs text-slate-500">Integrity: {r.integrity_flag}</p>}
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
