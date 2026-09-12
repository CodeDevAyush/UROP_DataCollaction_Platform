-- ============================================================================
-- Switch task length limits from word counts to character counts.
--
-- Participant-facing minimums/maximums are now enforced and displayed in
-- characters rather than words (word_count columns on writing_samples /
-- casual_responses / ai_interactions are UNCHANGED and keep being computed
-- and stored — they remain valuable for future linguistic analysis, e.g.
-- vocabulary diversity; they are simply no longer shown to participants or
-- used for gating).
-- ============================================================================

alter table public.tasks rename column minimum_words to minimum_characters;
alter table public.tasks rename column maximum_words to maximum_characters;

comment on column public.tasks.minimum_characters is 'Minimum character count required before the participant can submit (enforced server-side).';
comment on column public.tasks.maximum_characters is 'Recommended maximum character count, shown to the participant as guidance (not hard-enforced).';
