"use client";

import { usePathname } from "next/navigation";

const STEPS = [
  { path: "/study/instructions", label: "Instructions" },
  { path: "/study/consent", label: "Consent" },
  { path: "/study/profile", label: "Profile" },
  { path: "/study/formal", label: "Formal Writing" },
  { path: "/study/casual", label: "Casual Replies" },
  { path: "/study/ai", label: "AI-Mediated Task" },
  { path: "/study/review", label: "Review" },
  { path: "/study/completion", label: "Done" },
];

export function StudyStepper() {
  const pathname = usePathname();
  const currentIndex = STEPS.findIndex((s) => pathname?.startsWith(s.path));

  return (
    <nav aria-label="Study progress" className="border-b border-slate-200 bg-white">
      <ol className="mx-auto flex max-w-4xl flex-wrap gap-x-1 gap-y-2 overflow-x-auto px-4 py-3 text-xs sm:text-sm">
        {STEPS.map((step, index) => {
          const isCurrent = index === currentIndex;
          const isDone = currentIndex >= 0 && index < currentIndex;
          return (
            <li key={step.path} className="flex items-center">
              <span
                aria-current={isCurrent ? "step" : undefined}
                className={
                  "rounded-full px-3 py-1 font-medium " +
                  (isCurrent
                    ? "bg-blue-700 text-white"
                    : isDone
                      ? "bg-blue-100 text-blue-800"
                      : "bg-slate-100 text-slate-500")
                }
              >
                {index + 1}. {step.label}
              </span>
              {index < STEPS.length - 1 && <span className="mx-1 text-slate-300">›</span>}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
