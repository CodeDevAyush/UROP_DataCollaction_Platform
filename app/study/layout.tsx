import { StudyStepper } from "@/components/study/StudyStepper";

export default function StudyLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-4xl px-4 py-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">Academic Research Study</p>
          <h1 className="text-base font-semibold text-slate-900 sm:text-lg">
            AI-Tool Influence on Code-Switching Patterns Among SRM Students
          </h1>
        </div>
      </header>
      <StudyStepper />
      <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-8">{children}</main>
      <footer className="border-t border-slate-200 bg-white py-4 text-center text-xs text-slate-400">
        Your responses are used for academic research only. See the consent information for details.
      </footer>
    </div>
  );
}
