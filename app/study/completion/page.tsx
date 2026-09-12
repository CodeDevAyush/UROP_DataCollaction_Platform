"use client";

import { useState } from "react";
import { Card } from "@/components/ui";

export default function CompletionPage() {
  const [code] = useState<string | null>(() =>
    typeof window !== "undefined" ? sessionStorage.getItem("urop_participant_code") : null
  );

  return (
    <Card className="text-center">
      <h2 className="text-2xl font-semibold text-slate-900">Thank you for participating in the study.</h2>
      <p className="mt-3 text-slate-700">Your responses have been recorded successfully.</p>

      {code && (
        <div className="mx-auto mt-6 inline-block rounded-md border border-slate-200 bg-slate-50 px-6 py-4">
          <p className="text-xs uppercase tracking-wide text-slate-500">Your anonymous participant ID</p>
          <p className="mt-1 text-2xl font-mono font-semibold text-blue-800">{code}</p>
        </div>
      )}

      <p className="mt-6 text-sm text-slate-500">
        You may close this window. If you have any questions about the study, please contact the researcher using
        the details on the consent page.
      </p>
    </Card>
  );
}
