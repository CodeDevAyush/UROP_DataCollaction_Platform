-- ============================================================================
-- Consolidate casual_responses from one row per scenario reply to one row
-- per participant session, with all of that session's replies nested in a
-- single JSONB array column. Existing per-scenario rows (if any) are
-- aggregated into the new shape rather than discarded.
-- ============================================================================

create table public.casual_responses_v2 (
  id uuid primary key default gen_random_uuid(),
  participant_id uuid not null references public.participants(id) on delete cascade,
  session_id uuid not null references public.study_sessions(id) on delete cascade,
  study_phase text not null default 'baseline',
  replies jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (session_id)
);

alter table public.casual_responses_v2 enable row level security;

comment on column public.casual_responses_v2.replies is
  'Array of this session''s casual scenario replies, one object per scenario: '
  '{ task_id, scenario_number, raw_text, word_count, character_count, started_at, '
  'submitted_at, duration_seconds, keystroke_count, backspace_count, paste_attempts, '
  'cut_attempts, drop_attempts, focus_loss_count, independent_writing_confirmed, '
  'integrity_flag, researcher_note }. raw_text inside each element is immutable, '
  'same guarantee as every other raw_text column in this schema.';

insert into public.casual_responses_v2 (participant_id, session_id, study_phase, replies, created_at, updated_at)
select
  participant_id,
  session_id,
  min(study_phase) as study_phase,
  jsonb_agg(
    jsonb_build_object(
      'task_id', task_id,
      'scenario_number', scenario_number,
      'raw_text', raw_text,
      'word_count', word_count,
      'character_count', character_count,
      'started_at', started_at,
      'submitted_at', submitted_at,
      'duration_seconds', duration_seconds,
      'keystroke_count', keystroke_count,
      'backspace_count', backspace_count,
      'paste_attempts', paste_attempts,
      'cut_attempts', cut_attempts,
      'drop_attempts', drop_attempts,
      'focus_loss_count', focus_loss_count,
      'independent_writing_confirmed', independent_writing_confirmed,
      'integrity_flag', integrity_flag,
      'researcher_note', researcher_note
    )
    order by scenario_number
  ) as replies,
  min(created_at) as created_at,
  now() as updated_at
from public.casual_responses
group by participant_id, session_id;

drop table public.casual_responses;
alter table public.casual_responses_v2 rename to casual_responses;
alter index casual_responses_v2_pkey rename to casual_responses_pkey;
alter table public.casual_responses rename constraint casual_responses_v2_participant_id_fkey to casual_responses_participant_id_fkey;
alter table public.casual_responses rename constraint casual_responses_v2_session_id_fkey to casual_responses_session_id_fkey;
alter table public.casual_responses rename constraint casual_responses_v2_session_id_key to casual_responses_session_id_key;

create index casual_responses_participant_idx on public.casual_responses(participant_id);
