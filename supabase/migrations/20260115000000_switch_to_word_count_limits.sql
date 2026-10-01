-- ============================================================================
-- Switch task length limits to word counts.
--
-- Participant-facing minimums/maximums are now enforced and displayed in words
-- (e.g. 500 words for formal writing, 50 words per question for casual replies,
-- 300 words for AI prompts).
-- ============================================================================

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'tasks' AND column_name = 'minimum_characters'
  ) THEN
    ALTER TABLE public.tasks RENAME COLUMN minimum_characters TO minimum_words;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'tasks' AND column_name = 'maximum_characters'
  ) THEN
    ALTER TABLE public.tasks RENAME COLUMN maximum_characters TO maximum_words;
  END IF;
END $$;

COMMENT ON COLUMN public.tasks.minimum_words IS 'Minimum word count required before the participant can submit (enforced server-side).';
COMMENT ON COLUMN public.tasks.maximum_words IS 'Recommended maximum word count, shown to the participant as guidance (not hard-enforced).';
