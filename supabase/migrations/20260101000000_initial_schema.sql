-- ============================================================================
-- UROP Language Study — Initial Schema
-- Research data-collection platform for:
-- "AI-Tool Influence on Code-Switching Patterns Among SRM Students"
--
-- Design principles:
--   1. Raw participant text is NEVER overwritten or normalized in place.
--      Future NLP processing must write to new tables, not mutate these.
--   2. Human-authored, AI-generated, and AI-edited text are always stored
--      in distinct columns/tables — never merged into one generic field.
--   3. Identifying data (none is collected by default) is kept separate
--      from linguistic data. Only pseudonymous participant_code values
--      are used for analysis.
--   4. All tables carry study_phase so the same schema supports repeated
--      baseline/follow-up data collection waves without migration churn.
--   5. RLS is enabled on every table with NO anon/authenticated policies.
--      All participant-facing reads/writes go through Next.js API routes
--      using the service-role key (server-only). Admins authenticate via
--      Supabase Auth; admin data access also goes through server routes
--      that verify the session, rather than direct client-side queries
--      against these tables.
-- ============================================================================

create extension if not exists pgcrypto;

-- ----------------------------------------------------------------------------
-- participants: the anonymous root record for a study participant.
-- ----------------------------------------------------------------------------
create table public.participants (
  id uuid primary key default gen_random_uuid(),
  participant_code text not null unique,
  consent_version text,
  consent_timestamp timestamptz,
  created_at timestamptz not null default now()
);

comment on table public.participants is 'Anonymous root record per study participant. No name/email stored here by default.';
comment on column public.participants.participant_code is 'Human-readable pseudonymous ID shown to the participant, e.g. SRM-A7K29.';

-- ----------------------------------------------------------------------------
-- participant_profiles: research-relevant demographic/context fields.
-- ----------------------------------------------------------------------------
create table public.participant_profiles (
  id uuid primary key default gen_random_uuid(),
  participant_id uuid not null references public.participants(id) on delete cascade,
  academic_year text,
  program text,
  branch text,
  age_group text,
  primary_language text,
  other_languages text[] not null default '{}',
  ai_usage_frequency text,
  ai_tools_used text[] not null default '{}',
  ai_primary_use text,
  created_at timestamptz not null default now(),
  unique (participant_id)
);

-- ----------------------------------------------------------------------------
-- consent_records: append-only log of consent given (supports re-consent
-- across study phases / consent-text revisions).
-- ----------------------------------------------------------------------------
create table public.consent_records (
  id uuid primary key default gen_random_uuid(),
  participant_id uuid not null references public.participants(id) on delete cascade,
  consent_version text not null,
  consent_text_hash text not null,
  accepted boolean not null,
  "timestamp" timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- study_sessions: one attempt at the study flow by a participant.
-- ----------------------------------------------------------------------------
create table public.study_sessions (
  id uuid primary key default gen_random_uuid(),
  participant_id uuid not null references public.participants(id) on delete cascade,
  session_code text not null unique,
  study_phase text not null default 'baseline',
  status text not null default 'in_progress' check (status in ('in_progress', 'completed', 'abandoned')),
  started_at timestamptz not null default now(),
  completed_at timestamptz
);

create index study_sessions_participant_idx on public.study_sessions(participant_id);

-- ----------------------------------------------------------------------------
-- tasks: researcher-managed question bank. One row per stimulus.
-- ----------------------------------------------------------------------------
create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  task_code text not null unique,
  condition text not null check (condition in ('formal', 'casual', 'ai')),
  study_phase text not null default 'baseline',
  title text not null,
  scenario text not null,
  instructions text not null default '',
  minimum_words integer not null default 0,
  maximum_words integer,
  minimum_duration_seconds integer,
  maximum_duration_seconds integer,
  randomization_group text,
  display_order integer not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index tasks_condition_phase_idx on public.tasks(condition, study_phase, active);

-- ----------------------------------------------------------------------------
-- task_assignments: records exactly which tasks a participant received and
-- in what order, supporting randomized/counterbalanced designs.
-- ----------------------------------------------------------------------------
create table public.task_assignments (
  id uuid primary key default gen_random_uuid(),
  participant_id uuid not null references public.participants(id) on delete cascade,
  session_id uuid not null references public.study_sessions(id) on delete cascade,
  task_id uuid not null references public.tasks(id) on delete restrict,
  presentation_order integer not null,
  created_at timestamptz not null default now(),
  unique (session_id, task_id)
);

-- ----------------------------------------------------------------------------
-- writing_samples: Condition A — Human Formal / Academic writing.
-- raw_text is immutable once written; never overwritten by NLP processing.
-- ----------------------------------------------------------------------------
create table public.writing_samples (
  id uuid primary key default gen_random_uuid(),
  participant_id uuid not null references public.participants(id) on delete cascade,
  session_id uuid not null references public.study_sessions(id) on delete cascade,
  task_id uuid not null references public.tasks(id) on delete restrict,
  condition text not null default 'formal' check (condition = 'formal'),
  unique (session_id, task_id),
  text_category text not null default 'formal_human' check (text_category = 'formal_human'),
  study_phase text not null default 'baseline',
  raw_text text not null,
  word_count integer not null default 0,
  character_count integer not null default 0,
  started_at timestamptz,
  submitted_at timestamptz not null default now(),
  duration_seconds integer,
  keystroke_count integer not null default 0,
  backspace_count integer not null default 0,
  paste_attempts integer not null default 0,
  cut_attempts integer not null default 0,
  drop_attempts integer not null default 0,
  focus_loss_count integer not null default 0,
  independent_writing_confirmed boolean not null default false,
  independent_writing_note text,
  integrity_flag text not null default 'green' check (integrity_flag in ('green', 'yellow', 'red')),
  researcher_note text,
  created_at timestamptz not null default now()
);

create index writing_samples_participant_idx on public.writing_samples(participant_id);
create index writing_samples_session_idx on public.writing_samples(session_id);

comment on column public.writing_samples.raw_text is 'Immutable as-submitted text. Any future NLP normalization must live in a separate table, never overwrite this column.';

-- ----------------------------------------------------------------------------
-- casual_responses: Condition B — Human Casual communication.
-- One row per short scenario reply (a participant answers several).
-- ----------------------------------------------------------------------------
create table public.casual_responses (
  id uuid primary key default gen_random_uuid(),
  participant_id uuid not null references public.participants(id) on delete cascade,
  session_id uuid not null references public.study_sessions(id) on delete cascade,
  task_id uuid not null references public.tasks(id) on delete restrict,
  scenario_number integer not null default 1,
  unique (session_id, task_id),
  text_category text not null default 'casual_human' check (text_category = 'casual_human'),
  study_phase text not null default 'baseline',
  raw_text text not null,
  word_count integer not null default 0,
  character_count integer not null default 0,
  started_at timestamptz,
  submitted_at timestamptz not null default now(),
  duration_seconds integer,
  keystroke_count integer not null default 0,
  backspace_count integer not null default 0,
  paste_attempts integer not null default 0,
  cut_attempts integer not null default 0,
  drop_attempts integer not null default 0,
  focus_loss_count integer not null default 0,
  independent_writing_confirmed boolean not null default false,
  integrity_flag text not null default 'green' check (integrity_flag in ('green', 'yellow', 'red')),
  researcher_note text,
  created_at timestamptz not null default now()
);

create index casual_responses_participant_idx on public.casual_responses(participant_id);
create index casual_responses_session_idx on public.casual_responses(session_id);

-- ----------------------------------------------------------------------------
-- ai_interactions: Condition C — Student Prompt + AI Output (+ optional edit).
-- student_prompt, ai_output, and edited_output are always kept distinct.
-- ----------------------------------------------------------------------------
create table public.ai_interactions (
  id uuid primary key default gen_random_uuid(),
  participant_id uuid not null references public.participants(id) on delete cascade,
  session_id uuid not null references public.study_sessions(id) on delete cascade,
  task_id uuid not null references public.tasks(id) on delete restrict,
  study_phase text not null default 'baseline',
  unique (session_id, task_id),

  ai_tool text not null default 'ChatGPT',
  ai_mode text not null default 'natural' check (ai_mode in ('controlled', 'natural')),
  model_name text not null default 'unknown',

  standardized_task text not null,
  student_prompt text not null,
  complete_prompt text not null,
  prompt_word_count integer not null default 0,
  prompt_started_at timestamptz,
  prompt_submitted_at timestamptz,
  prompt_duration_seconds integer,
  prompt_keystroke_count integer not null default 0,
  prompt_backspace_count integer not null default 0,
  prompt_paste_attempts integer not null default 0,

  ai_output text,
  ai_output_word_count integer,
  ai_output_submitted_at timestamptz,

  was_edited boolean not null default false,
  edited_output text,
  edited_output_word_count integer,

  researcher_note text,
  created_at timestamptz not null default now()
);

create index ai_interactions_participant_idx on public.ai_interactions(participant_id);
create index ai_interactions_session_idx on public.ai_interactions(session_id);

comment on column public.ai_interactions.student_prompt is 'Original participant-authored instructions for the AI, stored verbatim.';
comment on column public.ai_interactions.ai_output is 'Raw AI response as pasted by the participant, stored verbatim (never auto-corrected).';
comment on column public.ai_interactions.edited_output is 'Participant''s edited version of the AI output, if any. Never overwrites ai_output.';

-- ----------------------------------------------------------------------------
-- session_drafts: lightweight autosave for in-progress steps, keyed by a
-- step identifier. Stores current draft state only — not a keystroke log.
-- ----------------------------------------------------------------------------
create table public.session_drafts (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.study_sessions(id) on delete cascade,
  step text not null,
  draft_text text not null default '',
  draft_metadata jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  unique (session_id, step)
);

-- ----------------------------------------------------------------------------
-- study_settings: researcher-configurable global settings (key/value).
-- e.g. which conditions are mandatory, consent copy, AI tool options.
-- ----------------------------------------------------------------------------
create table public.study_settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- admin_profiles: extends Supabase Auth users with a researcher role.
-- Authentication itself is handled by Supabase Auth (auth.users).
-- ----------------------------------------------------------------------------
create table public.admin_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  display_name text,
  role text not null default 'researcher' check (role in ('researcher', 'admin')),
  created_at timestamptz not null default now()
);

-- ============================================================================
-- Row Level Security
-- All application access goes through server-side API routes using the
-- service role key (which bypasses RLS). No anon/authenticated policies are
-- defined, so direct client-side access with the publishable anon key is
-- denied for every table below.
-- ============================================================================
alter table public.participants enable row level security;
alter table public.participant_profiles enable row level security;
alter table public.consent_records enable row level security;
alter table public.study_sessions enable row level security;
alter table public.tasks enable row level security;
alter table public.task_assignments enable row level security;
alter table public.writing_samples enable row level security;
alter table public.casual_responses enable row level security;
alter table public.ai_interactions enable row level security;
alter table public.session_drafts enable row level security;
alter table public.study_settings enable row level security;
alter table public.admin_profiles enable row level security;

-- Admins may read their own profile row directly (used by the admin UI to
-- confirm role after Supabase Auth login).
create policy "admin can read own profile"
  on public.admin_profiles for select
  using (auth.uid() = id);
