"use client";

import { useEffect, useState } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { LoadingState, ErrorAlert } from "@/components/ui";

interface DashboardData {
  totalParticipants: number;
  completedSessions: number;
  inProgressSessions: number;
  formalSamples: number;
  casualSamples: number;
  aiInteractions: number;
  aiEditedSamples: number;
  byAcademicYear: { name: string; value: number }[];
  byAiUsage: { name: string; value: number }[];
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-slate-900">{value}</p>
    </div>
  );
}

function MiniBarChart({ title, data }: { title: string; data: { name: string; value: number }[] }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-sm font-semibold text-slate-800">{title}</p>
      <div className="mt-3 h-56">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical" margin={{ left: 16 }}>
            <CartesianGrid strokeDasharray="3 3" horizontal={false} />
            <XAxis type="number" allowDecimals={false} />
            <YAxis type="category" dataKey="name" width={110} tick={{ fontSize: 12 }} />
            <Tooltip />
            <Bar dataKey="value" fill="#1d4ed8" radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export default function AdminDashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/admin/dashboard")
      .then(async (r) => {
        if (!r.ok) throw new Error((await r.json()).error ?? "Failed to load dashboard.");
        return r.json();
      })
      .then(setData)
      .catch((err) => setError(err.message));
  }, []);

  if (error) return <ErrorAlert message={error} />;
  if (!data) return <LoadingState />;

  const completionRate = data.totalParticipants > 0 ? Math.round((data.completedSessions / data.totalParticipants) * 100) : 0;

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold text-slate-900">Dashboard</h1>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        <StatCard label="Total participants" value={data.totalParticipants} />
        <StatCard label="Completed sessions" value={data.completedSessions} />
        <StatCard label="Incomplete sessions" value={data.inProgressSessions} />
        <StatCard label="Completion rate" value={completionRate} />
        <StatCard label="Formal samples" value={data.formalSamples} />
        <StatCard label="Casual samples" value={data.casualSamples} />
        <StatCard label="AI interactions" value={data.aiInteractions} />
        <StatCard label="AI-edited samples" value={data.aiEditedSamples} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <MiniBarChart title="Participants by academic year" data={data.byAcademicYear} />
        <MiniBarChart title="AI usage frequency" data={data.byAiUsage} />
      </div>

      <p className="text-xs text-slate-400">
        These figures describe data collection progress only. No linguistic conclusions are drawn here — that
        requires a separate NLP analysis step outside this application.
      </p>
    </div>
  );
}
