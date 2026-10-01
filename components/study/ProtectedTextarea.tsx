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
  wordCount?: number;
  characterCount?: number;
  elapsedSeconds: number;
  minimumWords?: number;
  maximumWords?: number;
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
  wordCount,
  characterCount,
  elapsedSeconds,
  minimumWords,
  maximumWords,
  minimumCharacters,
  maximumCharacters,
  rows = 10,
  allowClipboard = false,
}: ProtectedTextareaProps) {
  const effectiveMinWords = typeof minimumWords === "number" ? minimumWords : undefined;
  const effectiveMaxWords = typeof maximumWords === "number" ? maximumWords : undefined;
  const useWords = typeof effectiveMinWords === "number" || typeof wordCount === "number";
  const currentCount = useWords ? (wordCount ?? 0) : (characterCount ?? 0);
  const minCount = useWords ? effectiveMinWords : minimumCharacters;
  const maxCount = useWords ? effectiveMaxWords : maximumCharacters;
  const belowMinimum = typeof minCount === "number" && currentCount < minCount;

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
          {useWords ? "Word count: " : "Character count: "}
          <strong className={belowMinimum ? "text-amber-700" : "text-slate-700"}>{currentCount}</strong>
          {typeof minCount === "number" && minCount > 0 && (
            <span>
              {" "}
              (minimum {minCount}
              {maxCount ? `, recommended up to ${maxCount}` : ""})
            </span>
          )}
        </span>
        <span>Elapsed time: {formatElapsed(elapsedSeconds)}</span>
        {!allowClipboard && <span className="text-slate-400">Paste, cut, and drag-and-drop are disabled in this field.</span>}
      </div>
    </div>
  );
}
