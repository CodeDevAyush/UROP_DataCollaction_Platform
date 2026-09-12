"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, PrimaryButton, SecondaryButton, ErrorAlert, LoadingState, InfoAlert } from "@/components/ui";
import { ProtectedTextarea } from "@/components/study/ProtectedTextarea";
import { useProtectedTextField } from "@/lib/hooks/useProtectedTextField";
import { useAutosave, fetchDraft } from "@/lib/hooks/useAutosave";

interface AiTask {
  id: string;
  title: string;
  scenario: string;
  instructions: string;
  minimumWords: number;
  maximumWords: number | null;
}

interface StudyConfig {
  aiToolOptions: string[];
  aiDefaultMode: "controlled" | "natural";
}

const TOOL_URLS: Record<string, string> = {
  ChatGPT: "https://chatgpt.com/",
  Gemini: "https://gemini.google.com/",
  Claude: "https://claude.ai/",
};

type Stage = "prompt" | "handoff" | "output";

function AiTaskFlow({ task, config, onDone }: { task: AiTask; config: StudyConfig; onDone: () => void }) {
  const promptField = useProtectedTextField({ allowClipboard: false });
  const [aiTool, setAiTool] = useState(config.aiToolOptions[0] ?? "ChatGPT");
  const [aiMode, setAiMode] = useState<"controlled" | "natural">(config.aiDefaultMode);
  const [stage, setStage] = useState<Stage>("prompt");
  const [interactionId, setInteractionId] = useState<string | null>(null);
  const [completePrompt, setCompletePrompt] = useState("");
  const [copied, setCopied] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [draftLoaded, setDraftLoaded] = useState(false);

  const step = `ai_prompt:${task.id}`;
  useAutosave(step, promptField.text);

  useEffect(() => {
    fetchDraft(step).then((draft) => {
      if (draft) promptField.setText(draft);
      setDraftLoaded(true);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  const outputField = useProtectedTextField({ allowClipboard: true });
  const [wasEdited, setWasEdited] = useState<"no" | "yes">("no");
  const editedField = useProtectedTextField({ allowClipboard: true });
  const [modelName, setModelName] = useState("");

  const belowMinimum = promptField.wordCount < task.minimumWords;

  async function submitPrompt() {
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/ai/prompt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          taskId: task.id,
          studentPrompt: promptField.text,
          aiTool,
          aiMode,
          metadata: promptField.getMetadata(),
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Could not save your prompt.");
      }
      const data = await res.json();
      setInteractionId(data.interactionId);
      setCompletePrompt(data.completePrompt);
      setStage("handoff");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  }

  async function copyPrompt() {
    try {
      await navigator.clipboard.writeText(completePrompt);
      setCopied(true);
    } catch {
      setError("Could not copy automatically — please select and copy the text below manually.");
    }
  }

  async function submitOutput() {
    if (!interactionId) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/ai/output", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          interactionId,
          aiOutput: outputField.text,
          wasEdited: wasEdited === "yes",
          editedOutput: wasEdited === "yes" ? editedField.text : null,
          modelName,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Could not save the AI output.");
      }
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  }

  if (!draftLoaded) return <LoadingState />;

  if (stage === "prompt") {
    return (
      <>
        <h2 className="text-xl font-semibold text-slate-900">{task.title}</h2>
        <div className="mt-3 whitespace-pre-wrap rounded-md border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
          {task.scenario}
        </div>
        <InfoAlert>{task.instructions}</InfoAlert>

        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="text-sm font-medium text-slate-800">AI tool you will use</span>
            <select
              value={aiTool}
              onChange={(e) => setAiTool(e.target.value)}
              className="mt-1 w-full rounded-md border border-slate-300 bg-white p-2 text-slate-900 shadow-sm"
            >
              {config.aiToolOptions.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </label>
          <div>
            <span className="text-sm font-medium text-slate-800">Conversation setting</span>
            <div className="mt-1 space-y-1 text-sm text-slate-700">
              <label className="flex items-center gap-2">
                <input type="radio" checked={aiMode === "controlled"} onChange={() => setAiMode("controlled")} />
                Fresh/new chat (controlled)
              </label>
              <label className="flex items-center gap-2">
                <input type="radio" checked={aiMode === "natural"} onChange={() => setAiMode("natural")} />
                My normal AI environment (natural)
              </label>
            </div>
          </div>
        </div>

        <div className="mt-5">
          <ProtectedTextarea
            id="ai-prompt"
            label="Your instructions to the AI"
            fieldProps={promptField.fieldProps}
            wordCount={promptField.wordCount}
            characterCount={promptField.characterCount}
            elapsedSeconds={promptField.elapsedSeconds}
            minimumWords={task.minimumWords}
            maximumWords={task.maximumWords ?? undefined}
            rows={8}
          />
        </div>

        <ErrorAlert message={error} />
        {belowMinimum && (
          <p className="mt-2 text-sm text-amber-700">
            Write at least {task.minimumWords} words ({promptField.wordCount} so far).
          </p>
        )}

        <div className="mt-6 flex justify-end">
          <PrimaryButton onClick={submitPrompt} disabled={belowMinimum || submitting}>
            {submitting ? "Saving…" : "Record my prompt"}
          </PrimaryButton>
        </div>
      </>
    );
  }

  if (stage === "handoff") {
    return (
      <>
        <h2 className="text-xl font-semibold text-slate-900">Your prompt has been recorded</h2>
        <p className="mt-2 text-sm text-slate-600">Now, follow these steps:</p>
        <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm text-slate-700">
          <li>Copy the complete prompt below.</li>
          <li>
            Open {aiTool}{aiMode === "controlled" ? " in a new/fresh chat" : ""}.
          </li>
          <li>Paste the prompt and press Enter.</li>
          <li>Wait for the complete response, then copy it in full.</li>
          <li>Return to this tab and paste the response in the next step.</li>
        </ol>

        <div className="mt-4 whitespace-pre-wrap rounded-md border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
          {completePrompt}
        </div>

        <div className="mt-4 flex flex-wrap gap-3">
          <SecondaryButton onClick={copyPrompt}>{copied ? "Copied ✓" : "Copy prompt"}</SecondaryButton>
          {TOOL_URLS[aiTool] && (
            <a href={TOOL_URLS[aiTool]} target="_blank" rel="noopener noreferrer">
              <SecondaryButton type="button">Open {aiTool} ↗</SecondaryButton>
            </a>
          )}
        </div>

        <div className="mt-8 flex justify-end">
          <PrimaryButton onClick={() => setStage("output")}>I have the AI&apos;s response</PrimaryButton>
        </div>
      </>
    );
  }

  return (
    <>
      <h2 className="text-xl font-semibold text-slate-900">Paste the AI&apos;s response</h2>
      <p className="mt-1 text-sm text-slate-600">
        Paste the complete response below exactly as the AI produced it. Do not edit it here — pasting is enabled
        for this field only.
      </p>
      <div className="mt-4">
        <ProtectedTextarea
          id="ai-output"
          label="AI-generated response"
          fieldProps={outputField.fieldProps}
          wordCount={outputField.wordCount}
          characterCount={outputField.characterCount}
          elapsedSeconds={outputField.elapsedSeconds}
          rows={10}
          allowClipboard
        />
      </div>

      <label className="mt-4 block max-w-xs">
        <span className="text-sm font-medium text-slate-800">Model name, if shown (optional)</span>
        <input
          type="text"
          value={modelName}
          onChange={(e) => setModelName(e.target.value)}
          placeholder="e.g. GPT-5, or leave blank"
          className="mt-1 w-full rounded-md border border-slate-300 p-2 text-sm"
        />
      </label>

      <fieldset className="mt-5">
        <legend className="text-sm font-medium text-slate-800">Did you modify the AI-generated response before using it?</legend>
        <div className="mt-1 flex gap-4 text-sm text-slate-700">
          <label className="flex items-center gap-2">
            <input type="radio" checked={wasEdited === "no"} onChange={() => setWasEdited("no")} /> No
          </label>
          <label className="flex items-center gap-2">
            <input type="radio" checked={wasEdited === "yes"} onChange={() => setWasEdited("yes")} /> Yes
          </label>
        </div>
      </fieldset>

      {wasEdited === "yes" && (
        <div className="mt-4">
          <ProtectedTextarea
            id="ai-edited-output"
            label="Paste your final edited version"
            fieldProps={editedField.fieldProps}
            wordCount={editedField.wordCount}
            characterCount={editedField.characterCount}
            elapsedSeconds={editedField.elapsedSeconds}
            rows={10}
            allowClipboard
          />
        </div>
      )}

      <ErrorAlert message={error} />

      <div className="mt-6 flex justify-end">
        <PrimaryButton
          onClick={submitOutput}
          disabled={submitting || !outputField.text.trim() || (wasEdited === "yes" && !editedField.text.trim())}
        >
          {submitting ? "Saving…" : "Submit and continue"}
        </PrimaryButton>
      </div>
    </>
  );
}

export default function AiTaskPage() {
  const router = useRouter();
  const [tasks, setTasks] = useState<AiTask[] | null>(null);
  const [config, setConfig] = useState<StudyConfig | null>(null);
  const [index, setIndex] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      fetch("/api/tasks/ai").then(async (r) => {
        if (!r.ok) throw new Error((await r.json()).error ?? "Could not load the AI task.");
        return r.json();
      }),
      fetch("/api/study-config").then((r) => r.json()),
    ])
      .then(([taskData, configData]) => {
        setTasks(taskData.tasks);
        setConfig(configData);
      })
      .catch((err) => setError(err.message));
  }, []);

  if (error) {
    return (
      <Card>
        <ErrorAlert message={error} />
      </Card>
    );
  }
  if (!tasks || !config) {
    return (
      <Card>
        <LoadingState />
      </Card>
    );
  }

  const current = tasks[index];
  if (!current) {
    router.push("/study/review");
    return (
      <Card>
        <LoadingState />
      </Card>
    );
  }

  return (
    <Card key={current.id}>
      <AiTaskFlow
        task={current}
        config={config}
        onDone={() => {
          if (index + 1 < tasks.length) setIndex(index + 1);
          else router.push("/study/review");
        }}
      />
    </Card>
  );
}
