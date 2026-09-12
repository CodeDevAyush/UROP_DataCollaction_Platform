import { createHash } from "crypto";

export const DEFAULT_CONSENT_VERSION = "v1-2026";

export const DEFAULT_CONSENT_TEXT = `
INFORMED CONSENT — Research Participation

Study title: AI-Tool Influence on Code-Switching Patterns Among SRM Students:
An NLP-Based Register and Code-Mixing Analysis

Purpose
This is an academic (UROP) research study investigating how students write in
formal/academic contexts, how they communicate casually, how they prompt
generative-AI tools, and how AI-generated text compares with a student's own
natural writing style.

What participation involves
You will be asked to: (1) write a short formal/academic response, (2) reply
naturally to a few casual message scenarios, and (3) write your own
instructions ("prompt") for a generative-AI tool, then paste that tool's
response back into this website. The whole study takes approximately
20–35 minutes.

Data collected
- The text you write for each task (formal responses, casual replies, your
  AI prompts, and any AI output/edited output you paste in).
- Writing-process metadata: timestamps, word/character counts, and
  AGGREGATE counts of keystrokes, backspaces, and paste/cut/drop events in
  the on-screen text box. We do NOT record your screen, camera, microphone,
  or any activity outside the study's own text boxes.
- Basic demographic/context information (e.g. academic year, program,
  primary language, AI usage habits).

AI interaction data
For the AI-mediated task, we store the exact instructions you write, the
standardized task text, the AI's response as you paste it, and — if you
choose to edit it — your edited version, each kept as a separate, distinct
record.

Voluntary participation and withdrawal
Participation is completely voluntary. You may stop at any point before
final submission without penalty. Once you submit your anonymized data,
withdrawal after the fact may not be possible because the data is not
linked to your name — see "Confidentiality" below.

Confidentiality and anonymization
You are identified only by a randomly generated participant code (e.g.
SRM-A7K29). We do not require your name or email. Data is analyzed and
reported only in de-identified/aggregate form.

Research use
Your anonymized responses may be used for academic analysis, publication,
or presentation related to this UROP project.

Contact
Questions about this study can be directed to the student researcher and
faculty mentor listed on the study's landing page.

By proceeding, you confirm that you have read and understood this
information and voluntarily agree to participate.
`.trim();

export function hashConsentText(text: string): string {
  return createHash("sha256").update(text, "utf8").digest("hex");
}
