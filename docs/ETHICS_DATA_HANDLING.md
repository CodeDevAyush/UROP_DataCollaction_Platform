# Ethics & Data Handling

This document describes what the platform actually does and does not do,
so researchers can describe it accurately in an ethics/IRB application and
in the consent form. **This platform does not itself claim any ethics
approval** — that is the researchers' responsibility to obtain and record
separately (e.g. in `study_settings.researcher_contact` /
`faculty_mentor_contact`, and in your institution's IRB submission).

## What is collected, and why

See [RESEARCH_DATA_DICTIONARY.md](RESEARCH_DATA_DICTIONARY.md) for the
field-by-field list. In summary: writing samples across three conditions,
aggregate writing-process metadata (timing, word/character counts,
paste/cut/drop/focus-loss counts), and optional demographic/AI-usage
context. No name or email is required to participate.

## What is deliberately *not* collected

- Full keystroke logs or per-keystroke timing sequences.
- Screen recording, camera, or microphone access.
- Browsing activity outside the study's own text fields.
- Any data not described in the consent text shown to the participant.

If you extend this platform, keep this list true — update the consent text
(via **Admin → Settings**) *before* collecting anything not already
disclosed there.

## Integrity controls: what they are and are not

The formal-writing and casual-reply fields disable paste, cut, and
drag-and-drop, and record how many times each was attempted. The system
also asks participants to explicitly attest whether they wrote a formal
response independently or with assistance (and lets them disclose assistance
honestly without being blocked from continuing).

**These are integrity controls, not proof of authenticity.** A determined
participant could still retype AI-generated text by hand, use a second
device, or otherwise bypass the controls. The automatic `integrity_flag`
(`green`/`yellow`/`red`, based on paste/cut/drop counts) is a **triage
signal for a researcher to manually review** — never grounds to
automatically delete, exclude, or accuse a participant. See the
`computeIntegrityFlag` function (`lib/utils/integrity.ts`) and its tests
for the exact, narrow rule it implements.

This platform intentionally does **not** include an "AI detector" for
formal/casual writing. Automated AI-content detectors are not reliable
enough to treat as ground truth, and shipping one here would misrepresent
that reliability to researchers and participants alike. Use process
metadata, task design, and the self-attestation instead — in combination,
never any single signal in isolation.

## Anonymization

Participants are identified only by a randomly generated `participant_code`
(e.g. `SRM-A7K29`), never by name or email, unless a future approved
protocol explicitly requires identifying information — in which case it
should be stored in a separate table from linguistic data, joined only
where strictly necessary, per privacy-by-design.

## Consent

Consent text and version live in **Admin → Settings** and are rendered
as-is on `/study/consent`; a hash of the exact text shown is stored per
consent event (`consent_records.consent_text_hash`) so you have a durable
record of what a given participant actually agreed to, even if the text is
edited later. Update the consent text to accurately reflect:

- What data is collected (keep in sync with the data dictionary).
- That some tasks involve a third-party generative-AI tool the participant
  uses outside this site (their use of that tool is subject to its own
  terms/privacy policy, not this platform's).
- Voluntary participation and how to stop.
- Anonymization and research-use of the data.
- Your institution's actual ethics-approval status, if any — do not let
  this document or the app imply approval it doesn't have.

## Withdrawal

Because data is not linked to identifying information by default, honor
withdrawal requests before final submission (a participant simply closes
the browser without finishing — nothing is retained beyond an in-progress,
uncompleted session, which you can periodically clear if desired). After
anonymized submission, withdrawal of a specific participant's data is not
generally possible without an identifier, which is precisely why the
platform doesn't collect one by default; if your protocol requires
post-hoc withdrawal, you must collect and separately store some
participant-controlled identifier and describe that clearly in consent.

## Researcher notes

`researcher_note` fields exist on `writing_samples`, `casual_responses`, and
`ai_interactions` for a reviewer's own annotations (e.g. "reviewed, paste
attempt appears to be an accidental double-click, not misconduct").
These are never exposed to participants and never included in the
participant-facing UI.

## Data retention

Set your institution's actual retention policy in **Admin → Settings →
Data retention policy**. This platform does not automatically delete data
on any schedule; deletion/retention is a researcher decision, and the
platform does not fabricate a policy on your behalf.
