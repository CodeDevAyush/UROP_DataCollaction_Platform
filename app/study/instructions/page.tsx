import Link from "next/link";
import { Card, PrimaryButton, SecondaryButton } from "@/components/ui";

export default function InstructionsPage() {
  return (
    <Card>
      <h2 className="text-xl font-semibold text-slate-900">Before you begin</h2>
      <div className="mt-4 space-y-4 text-slate-700">
        <p>This study has three parts. Please read all of this before starting.</p>

        <div>
          <h3 className="font-semibold text-slate-900">1. Formal / academic writing</h3>
          <p>
            You will read a short scenario and write a formal, academic-style response entirely on your own.{" "}
            <strong>Do not use ChatGPT, Gemini, Claude, other AI tools, translation tools, or Grammarly-style
            writing assistants, and do not paste in previously prepared text.</strong> Paste, cut, and drag-and-drop
            are disabled in this section to help maintain independent writing.
          </p>
        </div>

        <div>
          <h3 className="font-semibold text-slate-900">2. Casual replies</h3>
          <p>
            You will see a few realistic everyday scenarios (like a friend texting you) and reply exactly as you
            normally would — in whatever language, slang, abbreviations, or emojis you&apos;d actually use. There
            is no right language or style; we are interested in how you naturally communicate.
          </p>
        </div>

        <div>
          <h3 className="font-semibold text-slate-900">3. AI-mediated task</h3>
          <p>
            You will read a scenario and, instead of answering it yourself, write your own instructions
            (&quot;prompt&quot;) for a generative-AI tool. You will then copy that prompt, open ChatGPT (or the
            configured tool) yourself in a new tab, paste it in, and copy the AI&apos;s complete response back into
            this site. Paste is allowed for this step, since you are bringing in the AI&apos;s own output.
          </p>
        </div>

        <p className="text-sm text-slate-500">
          The whole study takes about 20–35 minutes. Your progress is autosaved as you go, so a brief connection
          issue or accidental refresh should not lose your work. Once you submit a task, it cannot be edited
          afterward.
        </p>
      </div>

      <div className="mt-8 flex justify-between">
        <Link href="/">
          <SecondaryButton>Back</SecondaryButton>
        </Link>
        <Link href="/study/consent">
          <PrimaryButton>Continue to consent</PrimaryButton>
        </Link>
      </div>
    </Card>
  );
}
