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
  characterCount: number;
  elapsedSeconds: number;
  minimumCharacters?: number;
  maximumCharacters?: number;
  rows?: number;
  allowClipboard?: boolean;
}

export function ProtectedTextarea({
  id,
  label,
  placeholder,
  fieldProps,
  characterCount,
  elapsedSeconds,
  minimumCharacters,
  maximumCharacters,
  rows = 10,
  allowClipboard = false,
}: ProtectedTextareaProps) {
  const belowMinimum = typeof minimumCharacters === "number" && characterCount < minimumCharacters;

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
          Character count:{" "}
          <strong className={belowMinimum ? "text-amber-700" : "text-slate-700"}>{characterCount}</strong>
          {typeof minimumCharacters === "number" && minimumCharacters > 0 && (
            <span>
              {" "}
              (minimum {minimumCharacters}
              {maximumCharacters ? `, recommended up to ${maximumCharacters}` : ""})
            </span>
          )}
        </span>
        <span>Elapsed time: {formatElapsed(elapsedSeconds)}</span>
        {!allowClipboard && <span className="text-slate-400">Paste, cut, and drag-and-drop are disabled in this field.</span>}
      </div>
    </div>
  );
}
