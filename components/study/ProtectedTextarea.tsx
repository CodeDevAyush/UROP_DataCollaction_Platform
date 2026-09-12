"use client";

function formatElapsed(seconds: number): string {
  const m = Math.floor(seconds / 60)
    .toString()
    .padStart(2, "0");
  const s = (seconds % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

interface ProtectedTextareaProps {
  id: string;
  label: string;
  placeholder?: string;
  fieldProps: React.TextareaHTMLAttributes<HTMLTextAreaElement>;
  wordCount: number;
  characterCount: number;
  elapsedSeconds: number;
  minimumWords?: number;
  maximumWords?: number;
  rows?: number;
  allowClipboard?: boolean;
}

export function ProtectedTextarea({
  id,
  label,
  placeholder,
  fieldProps,
  wordCount,
  characterCount,
  elapsedSeconds,
  minimumWords,
  maximumWords,
  rows = 10,
  allowClipboard = false,
}: ProtectedTextareaProps) {
  const belowMinimum = typeof minimumWords === "number" && wordCount < minimumWords;

  return (
    <div className="space-y-2">
      <label htmlFor={id} className="block text-sm font-medium text-slate-800">
        {label}
      </label>
      <textarea
        id={id}
        rows={rows}
        placeholder={placeholder}
        className="w-full rounded-md border border-slate-300 bg-white p-3 text-slate-900 shadow-sm focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-400"
        aria-describedby={`${id}-counters`}
        {...fieldProps}
      />
      <div id={`${id}-counters`} className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-slate-500">
        <span aria-live="polite">
          Word count: <strong className={belowMinimum ? "text-amber-700" : "text-slate-700"}>{wordCount}</strong>
          {typeof minimumWords === "number" && minimumWords > 0 && (
            <span> (minimum {minimumWords}{maximumWords ? `, recommended up to ${maximumWords}` : ""})</span>
          )}
        </span>
        <span>Character count: {characterCount}</span>
        <span>Elapsed time: {formatElapsed(elapsedSeconds)}</span>
        {!allowClipboard && <span className="text-slate-400">Paste, cut, and drag-and-drop are disabled in this field.</span>}
      </div>
    </div>
  );
}
