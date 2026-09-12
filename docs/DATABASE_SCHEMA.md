# Database Schema

Source of truth: [`supabase/migrations/`](../supabase/migrations/) (initial
schema, plus any later migrations such as the switch from word- to
character-based task limits). This document is a guided tour, not a
duplicate — if the two disagree, the migrations win.

## Design principles

1. **Raw text is immutable.** `raw_text`, `student_prompt`, `ai_output`, and
   `edited_output` are written once and never overwritten by application
   code. Any future NLP normalization/feature extraction must live in new
   tables that reference these by id, never mutate them in place.
2. **Human vs. AI-generated vs. AI-edited text are always distinct columns
   or tables**, never merged into one generic "response" field — see
   `writing_samples`/`casual_responses` (human) vs. `ai_interactions`
   (`ai_output` vs. `edited_output`).
3. **No unnecessary PII.** Participants are identified only by
   `participants.participant_code` (e.g. `SRM-A7K29`). No name/email column
   exists anywhere in the schema.
4. **Every data table carries `study_phase`** so the same schema supports
   repeated baseline/follow-up waves without a migration.
5. **RLS is enabled on every table with no anon/authenticated policies**
   (except admins reading their own `admin_profiles` row). All
   participant-facing reads/writes go through Next.js API routes using the
   Supabase **service-role** key, which bypasses RLS — the browser never
   queries these tables directly.

## Tables

### `participants`
One row per anonymous participant. `participant_code` is the pseudonymous ID
shown to the participant (only at the end of the study). `consent_version`
and `consent_timestamp` reflect the participant's most recent consent.

### `participant_profiles`
Demographic/context fields (academic year, program, primary language, AI
usage habits, ...). One-to-one with `participants`. All fields are optional.

### `consent_records`
Append-only log of consent events (participant, consent version, a hash of
the exact consent text shown, timestamp). Supports re-consent across study
phases or consent-text revisions without losing history.

### `study_sessions`
One attempt at the study flow. `status` is `in_progress` | `completed` |
`abandoned`. `session_code` is a separate human-readable code from
`participant_code`, useful if a participant does multiple sessions/phases.

### `tasks`
The researcher-managed question bank. One row per stimulus (`condition` is
`formal` | `casual` | `ai`). `minimum_characters`/`maximum_characters` and
`minimum_duration_seconds`/`maximum_duration_seconds` are enforced (character
count server-side; duration is currently informational/display-only) per
task. `active` toggles visibility without deleting history.

### `task_assignments`
Records exactly which tasks a given session received and in what order —
this is what makes randomized/counterbalanced designs reconstructable after
the fact. Created lazily (on first fetch of that condition) by
`lib/study/assignment.ts`, which shuffles the active pool for the
session's `study_phase` and picks `study_settings.task_counts[condition]`
of them.

### `writing_samples` (Condition A — human formal)
One row per submitted formal-writing task. `raw_text` is immutable.
Includes writing-process metadata (`keystroke_count`, `backspace_count`,
`paste_attempts`, `cut_attempts`, `drop_attempts`, `focus_loss_count`,
`duration_seconds`) and `independent_writing_confirmed` /
`independent_writing_note` from the pre-submit attestation.
`integrity_flag` is `green`/`yellow`/`red` — see
[ETHICS_DATA_HANDLING.md](ETHICS_DATA_HANDLING.md) for what that is (and
isn't). Unique on `(session_id, task_id)` — a task can't be submitted twice.

### `casual_responses` (Condition B — human casual)
Same shape as `writing_samples`, one row per scenario reply. In this schema,
each casual "task" in the `tasks` table already represents one scenario, so
`scenario_number` mirrors presentation order rather than being a separate
axis.

### `ai_interactions` (Condition C — AI-mediated)
The most structurally important table: `student_prompt` (participant's own
instructions), `standardized_task` (a snapshot of the task's scenario +
instructions at submission time), and `complete_prompt` (what was actually
copied to the AI tool) are three **separate** columns, alongside prompt-side
process metadata. `ai_output` is the raw pasted AI response; `was_edited` /
`edited_output` capture the participant's edited version **without**
overwriting `ai_output`. `ai_mode` is `controlled` (fresh chat) or `natural`
(participant's normal AI environment/personalization).

### `session_drafts`
Autosave: one row per `(session_id, step)` holding the **current** draft
text/metadata, upserted every ~12s and on step change. This is intentionally
not a keystroke log — see the "Data-integrity rules" section below.

### `study_settings`
Key/value researcher configuration (JSONB `value`), read with sensible
defaults via `lib/study/settings.ts` if a key hasn't been set yet. Keys in
use: `conditions_mandatory`, `task_counts`, `ai_tool_options`,
`ai_default_mode`, `consent_version`, `consent_text`,
`current_study_phase`, `researcher_contact`, `faculty_mentor_contact`,
`retention_policy`.

### `admin_profiles`
Extends Supabase Auth (`auth.users`) with a `role` (`researcher` | `admin`).
Authentication itself is handled entirely by Supabase Auth; this table only
carries the app-specific profile/role.

## Data-integrity rules encoded in the schema

- Never store a full keystroke log — only aggregate counts. `session_drafts`
  stores current text, not a diff history.
- Never silently transform participant text (no spell-correction,
  translation, casing, emoji/slang stripping). If you add NLP processing
  later, write it to a new table.
- `writing_samples`/`casual_responses`/`ai_interactions` each have a unique
  constraint preventing a duplicate submission for the same
  `(session_id, task_id)` — corrections require an explicit admin action,
  not a silent overwrite (not yet built; see README's "Recommended next
  steps").

## Known limitation: TypeScript + `@supabase/postgrest-js`

The installed version of `@supabase/postgrest-js` (bundled by
`@supabase/supabase-js`) has a type-inference bug: when the Supabase client
is parameterized with a `Database` generic, `.select()` resolves its result
type to `never` for essentially any select string other than a bare `"*"`
on a single table with no embedded relations, and `.insert()`/`.update()`
resolve to `never` as soon as the table's `Insert`/`Update` type has any
optional field (i.e., almost always, since most tables have DB-generated
defaults).

Minimal repro (fails to type-check even though it is exactly the
documented, idiomatic usage):

```ts
interface Database {
  public: {
    Tables: {
      foo: { Row: { id: string; name: string }; Insert: { id?: string; name: string }; Update: Partial<{ id: string; name: string }>; Relationships: [] };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
  };
}
const supabase = createClient<Database>(url, key);
await supabase.from("foo").insert({ name: "a" }); // TS2353: 'name' does not exist on type 'never[]'
```

**Workaround used throughout `app/api/**`:** clients are created without a
generic `Database` type; reads append the library's own official escape
hatch, `.overrideTypes<T, { merge: false }>()`, against the hand-written
interfaces in `types/database.ts`; writes cast their payload `as never`
(also a documented workaround for this class of issue). None of this
affects runtime behavior — it was verified end-to-end against a real local
Supabase Postgres instance during development. If a future version of
`@supabase/postgrest-js` fixes this, the workarounds can be removed and a
proper `Database` generic reinstated (the type shapes in
`types/database.ts` are already correct for that).
