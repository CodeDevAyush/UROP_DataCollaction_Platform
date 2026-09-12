"use client";

import { use, useEffect, useState } from "react";
import { LoadingState, ErrorAlert } from "@/components/ui";

interface DetailData {
  participant: { participant_code: string; consent_version: string | null; created_at: string };
  profile: Record<string, unknown> | null;
  sessions: { id: string; session_code: string; status: string; started_at: string; completed_at: string | null }[];
  formal: Array<Record<string, unknown> & { id: string; tasks: { title: string } | null }>;
  casual: Array<Record<string, unknown> & { id: string; tasks: { title: string } | null }>;
  ai: Array<Record<string, unknown> & { id: string; tasks: { title: string } | null }>;
  consent: Array<{ consent_version: string; accepted: boolean; timestamp: string }>;
}

const FLAG_COLORS: Record<string, string> = {
  green: "bg-green-100 text-green-800",
  yellow: "bg-amber-100 text-amber-800",
  red: "bg-red-100 text-red-800",
};

function FlagBadge({ flag }: { flag: string }) {
  return <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${FLAG_COLORS[flag] ?? "bg-slate-100"}`}>{flag}</span>;
}

function NoteEditor({ table, id, initial }: { table: string; id: string; initial: string | null }) {
  const [note, setNote] = useState(initial ?? "");
  const [saved, setSaved] = useState(true);
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    await fetch("/api/admin/notes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ table, id, note }),
    });
    setSaving(false);
    setSaved(true);
  }

  return (
    <div className="mt-2">
      <textarea
        value={note}
        onChange={(e) => {
          setNote(e.target.value);
          setSaved(false);
        }}
        placeholder="Researcher note (never shown to the participant)"
        rows={2}
        className="w-full rounded-md border border-slate-200 bg-slate-50 p-2 text-xs"
      />
      {!saved && (
        <button onClick={save} disabled={saving} className="mt-1 text-xs font-medium text-blue-700 hover:underline">
          {saving ? "Saving…" : "Save note"}
        </button>
      )}
    </div>
  );
}

export default function ParticipantDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [data, setData] = useState<DetailData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/admin/participants/${id}`)
      .then(async (r) => {
        if (!r.ok) throw new Error((await r.json()).error ?? "Failed to load participant.");
        return r.json();
      })
      .then(setData)
      .catch((err) => setError(err.message));
  }, [id]);

  if (error) return <ErrorAlert message={error} />;
  if (!data) return <LoadingState />;

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Participant</p>
        <h1 className="font-mono text-2xl font-semibold text-slate-900">{data.participant.participant_code}</h1>
        <p className="text-sm text-slate-500">
          Consent version {data.participant.consent_version ?? "—"} · Joined {new Date(data.participant.created_at).toLocaleString()}
        </p>
      </div>

      {data.profile && (
        <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-800">Profile</h2>
          <dl className="mt-2 grid grid-cols-2 gap-2 text-sm sm:grid-cols-3">
            {Object.entries(data.profile)
              .filter(([k]) => !["id", "participant_id", "created_at"].includes(k))
              .map(([k, v]) => (
                <div key={k}>
                  <dt className="text-xs uppercase text-slate-400">{k.replace(/_/g, " ")}</dt>
                  <dd className="text-slate-800">{Array.isArray(v) ? v.join(", ") || "—" : String(v ?? "—")}</dd>
                </div>
              ))}
          </dl>
        </section>
      )}

      <section>
        <h2 className="text-sm font-semibold text-slate-800">Formal writing samples</h2>
        <div className="mt-2 space-y-3">
          {data.formal.length === 0 && <p className="text-sm text-slate-400">None submitted yet.</p>}
          {data.formal.map((s) => (
            <article key={s.id} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-medium text-slate-800">{s.tasks?.title}</p>
                <FlagBadge flag={String(s.integrity_flag)} />
              </div>
              <p className="mt-2 whitespace-pre-wrap text-sm text-slate-700">{String(s.raw_text)}</p>
              <p className="mt-2 text-xs text-slate-500">
                {String(s.word_count)} words · {String(s.duration_seconds)}s · paste attempts: {String(s.paste_attempts)} ·
                cut: {String(s.cut_attempts)} · drop: {String(s.drop_attempts)} · focus loss: {String(s.focus_loss_count)} ·
                independent: {s.independent_writing_confirmed ? "yes" : "no"}
              </p>
              <NoteEditor table="writing_samples" id={s.id} initial={(s.researcher_note as string) ?? null} />
            </article>
          ))}
        </div>
      </section>

      <section>
        <h2 className="text-sm font-semibold text-slate-800">Casual responses</h2>
        <div className="mt-2 space-y-3">
          {data.casual.length === 0 && <p className="text-sm text-slate-400">None submitted yet.</p>}
          {data.casual.map((s) => (
            <article key={s.id} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-medium text-slate-800">{s.tasks?.title}</p>
                <FlagBadge flag={String(s.integrity_flag)} />
              </div>
              <p className="mt-2 whitespace-pre-wrap text-sm text-slate-700">{String(s.raw_text)}</p>
              <p className="mt-2 text-xs text-slate-500">
                {String(s.word_count)} words · paste attempts: {String(s.paste_attempts)} · independent:{" "}
                {s.independent_writing_confirmed ? "yes" : "no"}
              </p>
              <NoteEditor table="casual_responses" id={s.id} initial={(s.researcher_note as string) ?? null} />
            </article>
          ))}
        </div>
      </section>

      <section>
        <h2 className="text-sm font-semibold text-slate-800">AI interactions</h2>
        <div className="mt-2 space-y-3">
          {data.ai.length === 0 && <p className="text-sm text-slate-400">None submitted yet.</p>}
          {data.ai.map((s) => (
            <article key={s.id} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-sm font-medium text-slate-800">{s.tasks?.title}</p>
              <p className="mt-2 text-xs font-semibold uppercase text-slate-400">Student prompt</p>
              <p className="whitespace-pre-wrap text-sm text-slate-700">{String(s.student_prompt)}</p>
              <p className="mt-2 text-xs font-semibold uppercase text-slate-400">AI output ({String(s.ai_tool)} · {String(s.ai_mode)})</p>
              <p className="whitespace-pre-wrap text-sm text-slate-700">{String(s.ai_output ?? "(not yet submitted)")}</p>
              {Boolean(s.was_edited) && (
                <>
                  <p className="mt-2 text-xs font-semibold uppercase text-slate-400">Participant-edited version</p>
                  <p className="whitespace-pre-wrap text-sm text-slate-700">{String(s.edited_output)}</p>
                </>
              )}
              <NoteEditor table="ai_interactions" id={s.id} initial={(s.researcher_note as string) ?? null} />
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
