import Link from "next/link";

export default function LandingPage() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col justify-center px-6 py-16">
      <div className="rounded-lg border border-slate-200 bg-white p-8 shadow-sm sm:p-12">
        <p className="text-sm font-semibold uppercase tracking-wide text-blue-700">Academic Research Study</p>
        <h1 className="mt-2 text-2xl font-bold text-slate-900 sm:text-3xl">
          AI-Tool Influence on Code-Switching Patterns Among SRM Students
        </h1>
        <p className="mt-2 text-lg text-slate-600">An NLP-Based Register and Code-Mixing Analysis</p>

        <div className="mt-8 space-y-4 text-slate-700">
          <p>
            This is an academic research study (UROP project). If you take part, you will be asked to provide a
            few short writing samples: a formal/academic response, some casual message replies, and a task where
            you write your own instructions for a generative-AI tool and then paste back its response.
          </p>
          <ul className="list-disc space-y-1 pl-5">
            <li>Participation is completely voluntary.</li>
            <li>The study takes approximately 20–35 minutes.</li>
            <li>Some tasks involve interacting with a generative-AI tool (e.g. ChatGPT) outside this site.</li>
            <li>You are identified only by an anonymous participant code — no name or email is required.</li>
            <li>Your responses will be analyzed only in de-identified/aggregate form.</li>
          </ul>
          <p className="text-sm text-slate-500">
            Please read the study instructions and consent information carefully before beginning. Follow each
            task&apos;s instructions closely, since how you naturally write and prompt is exactly what this study
            is trying to observe.
          </p>
        </div>

        <div className="mt-10 flex flex-col gap-3 sm:flex-row">
          <Link
            href="/study/instructions"
            className="inline-flex justify-center rounded-md bg-blue-700 px-6 py-3 text-base font-semibold text-white shadow-sm transition hover:bg-blue-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700"
          >
            Begin the study
          </Link>
        </div>
      </div>

      <p className="mt-6 text-center text-xs text-slate-400">
        Researcher/admin?{" "}
        <Link href="/admin/login" className="underline hover:text-slate-600">
          Sign in here
        </Link>
      </p>
    </main>
  );
}
