# Research Data Dictionary

Every field a researcher might see in the admin console or an export,
explained for someone doing the linguistic analysis rather than someone
reading the SQL. "PII" below means personally identifying information in
the legal/ethical sense, not just "identifies a row."

## participants

| Field | Purpose | Type | PII | Required |
|---|---|---|---|---|
| `participant_code` | Anonymous, human-readable participant ID (e.g. `SRM-A7K29`). Use this as the join key in analysis, never the internal `id`. | string | No | Yes |
| `consent_version` | Which version of the consent text this participant agreed to. | string | No | Yes |
| `consent_timestamp` | When they last consented. | timestamp | No | Yes |
| `created_at` | When the participant record was first created. | timestamp | No | Yes |

## participant_profiles

All fields are optional (participants may decline any of them).

| Field | Purpose | Type | PII | Required |
|---|---|---|---|---|
| `academic_year` | e.g. "3rd year". | string | No | No |
| `program` / `branch` | Degree program / department. | string | No | No |
| `age_group` | Bucketed age range, not an exact age/DOB. | string | No | No |
| `primary_language` | Self-reported native/primary language — a key variable for code-switching analysis. | string | No | No |
| `other_languages` | Other languages the participant regularly uses. | string[] | No | No |
| `ai_usage_frequency` | Self-reported frequency of generative-AI use. | string | No | No |
| `ai_tools_used` | Which AI tools they typically use. | string[] | No | No |
| `ai_primary_use` | Free-text: what they mainly use AI for. | string | No | No |

## writing_samples (Condition A — human formal)

| Field | Purpose | Type | PII | Required |
|---|---|---|---|---|
| `raw_text` | The participant's formal-writing response, verbatim. This is the primary linguistic data point for this condition. Never normalized/corrected. | text | No | Yes |
| `word_count` / `character_count` | Recomputed server-side at submission — never trust a client-reported count. | integer | No | Yes |
| `duration_seconds` | Wall-clock time from first keystroke to submission. | integer | No | Yes |
| `keystroke_count` | Aggregate count of character-producing key presses (not per-character logging, not content). | integer | No | Yes |
| `backspace_count` | Aggregate count of Backspace/Delete presses. | integer | No | Yes |
| `paste_attempts` / `cut_attempts` / `drop_attempts` | Number of detected paste/cut/drag-drop events in this controlled writing field (all are blocked; these count the *attempts*). See `integrity_flag` below. | integer | No | Yes |
| `focus_loss_count` | How many times the text field lost focus (e.g. switched tabs) after typing started. | integer | No | Yes |
| `independent_writing_confirmed` | Whether the participant selected "I wrote this myself" (vs. "I used AI/other assistance") in the pre-submit attestation. | boolean | No | Yes |
| `independent_writing_note` | If they disclosed assistance, their own description of it. Recorded, never used to reject the submission. | text | No | No |
| `integrity_flag` | Automatic triage signal (`green`/`yellow`/`red`) from paste/cut/drop counts. **Not proof of misconduct** — see [ETHICS_DATA_HANDLING.md](ETHICS_DATA_HANDLING.md). | enum | No | Yes |
| `researcher_note` | Free-text note a researcher attaches after manual review. Never shown to the participant. | text | No | No |

## casual_responses (Condition B — human casual)

One row **per participant session**, not per scenario: the `replies` column
is a JSON array holding every scenario reply for that participant together.
Each element of that array has the same metadata shape as a `writing_samples`
row (see above). Exports and the admin console flatten this back into one
row per reply, so analysis code doesn't need to think about the nesting —
only `lib/study/casual-responses.ts` does.

| Field (per array element) | Purpose | Type | PII | Required |
|---|---|---|---|---|
| `raw_text` | The participant's reply to a simulated casual scenario, verbatim — expected to show natural code-switching, slang, emoji, abbreviations. This is the key data point for code-mixing analysis. | text | No | Yes |
| `scenario_number` | Presentation order of this scenario for this participant. | integer | No | Yes |
| `task_id` | Which scenario (from the question bank) this reply answers. | uuid | No | Yes |

## ai_interactions (Condition C — AI-mediated)

| Field | Purpose | Type | PII | Required |
|---|---|---|---|---|
| `student_prompt` | The participant's own instructions to the AI, verbatim — a key data point for studying prompting style/code-mixing in AI interactions. | text | No | Yes |
| `standardized_task` | The fixed scenario+instructions text shown to every participant for this task (kept separate so researchers can isolate participant-authored language). | text | No | Yes |
| `complete_prompt` | `standardized_task` + `student_prompt` concatenated — what was actually copied to the AI tool. | text | No | Yes |
| `prompt_word_count` | Word count of `student_prompt` only. | integer | No | Yes |
| `ai_tool` | Which AI product was used (ChatGPT/Gemini/Claude/Other). | string | No | Yes |
| `ai_mode` | `controlled` (participant used a fresh/new chat) or `natural` (their normal AI environment, including any personalization). Never described as "the AI was trained on the student" — it is the participant's ordinary usage context. | enum | No | Yes |
| `model_name` | Model name if the participant could see/report it; `unknown` if not. Never guessed by the system. | string | No | Yes |
| `ai_output` | The AI's response, pasted verbatim by the participant. Never auto-corrected. | text | No | No (until participant returns) |
| `ai_output_word_count` | Word count of `ai_output`. | integer | No | No |
| `was_edited` | Whether the participant modified the AI output before considering it final. | boolean | No | Yes |
| `edited_output` | The participant's edited version, if any — kept as a **separate** field from `ai_output`, never overwriting it. This is the key data point for studying AI-assisted linguistic drift. | text | No | No |
| `researcher_note` | Free-text researcher note, never shown to the participant. | text | No | No |

## session_drafts

Autosave only — not intended for linguistic analysis. `draft_text` holds the
current in-progress text for one step; it is deleted once that step's real
submission succeeds.

## Fields intentionally *not* collected

- Name, email, phone number, or any other direct identifier (unless a future
  approved protocol explicitly adds one to `participant_profiles`, in
  a separate table from linguistic data, per privacy-by-design).
- Full keystroke logs / keystroke timing sequences — only aggregate counts.
  See [ETHICS_DATA_HANDLING.md](ETHICS_DATA_HANDLING.md).
- Screen, camera, or microphone recordings.
- Browsing activity outside this site's own text fields.

## Anonymized export shape

`/admin/export` produces one CSV/JSON per table, each row keyed by
`participant_code` (never the internal UUID `id`, and never a name/email).
See [README.md](../README.md#exporting-the-dataset).
