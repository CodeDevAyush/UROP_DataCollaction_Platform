"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { LoadingState, ErrorAlert } from "@/components/ui";

interface SessionRow {
  sessionId: string;
  sessionCode: string;
  studyPhase: string;
  status: string;
  startedAt: string;
  completedAt: string | null;
  participantId: string;
  participantCode: string;
  academicYear: string | null;
  program: string | null;
  aiUsageFrequency: string | null;
}

export default function ParticipantsPage() {
  const [rows, setRows] = useState<SessionRow[] | null>(null);
  const [status, setStatus] = useState("");
  const [error, setError] = useState<string | null>(null);

  function load() {
    const params = new URLSearchParams();
    if (status) params.set("status", status);
    fetch(`/api/admin/participants?${params.toString()}`)
      .then(async (r) => {
        if (!r.ok) throw new Error((await r.json()).error ?? "Failed to load participants.");
        return r.json();
      })
      .then((data) => setRows(data.sessions))
      .catch((err) => setError(err.message));
  }

  useEffect(load, [status]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-slate-900">Participants</h1>
        <select value={status} onChange={(e) => setStatus(e.target.value)} className="rounded-md border border-slate-300 p-2 text-sm">
          <option value="">All statuses</option>
          <option value="in_progress">In progress</option>
          <option value="completed">Completed</option>
          <option value="abandoned">Abandoned</option>
        </select>
      </div>

      <ErrorAlert message={error} />
      {!rows ? (
        <LoadingState />
      ) : (
        <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-sm">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50 text-left text-xs font-semibold uppercase text-slate-500">
              <tr>
                <th className="px-4 py-2">Participant</th>
                <th className="px-4 py-2">Status</th>
                <th className="px-4 py-2">Academic year</th>
                <th className="px-4 py-2">AI usage</th>
                <th className="px-4 py-2">Started</th>
                <th className="px-4 py-2">Completed</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((r) => (
                <tr key={r.sessionId} className="hover:bg-slate-50">
                  <td className="px-4 py-2 font-mono">
                    <Link href={`/admin/participants/${r.participantId}`} className="text-blue-700 hover:underline">
                      {r.participantCode}
                    </Link>
                  </td>
                  <td className="px-4 py-2 capitalize">{r.status.replace("_", " ")}</td>
                  <td className="px-4 py-2">{r.academicYear ?? "—"}</td>
                  <td className="px-4 py-2">{r.aiUsageFrequency ?? "—"}</td>
                  <td className="px-4 py-2">{new Date(r.startedAt).toLocaleString()}</td>
                  <td className="px-4 py-2">{r.completedAt ? new Date(r.completedAt).toLocaleString() : "—"}</td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                    No participants match this filter yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
