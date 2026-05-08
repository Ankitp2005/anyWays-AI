-- Add user_id to validation_signals for direct filtering and RLS performance
DO $$ BEGIN
    ALTER TABLE public.validation_signals ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
EXCEPTION
    WHEN duplicate_column THEN null;
END $$;

-- Backfill existing signals (safe to re-run)
UPDATE public.validation_signals
SET user_id = places.user_id
FROM public.places
WHERE public.validation_signals.place_id = public.places.id
  AND public.validation_signals.user_id IS NULL;

-- Make it NOT NULL after backfill
DO $$ BEGIN
    ALTER TABLE public.validation_signals ALTER COLUMN user_id SET NOT NULL;
EXCEPTION
    WHEN others THEN null;
END $$;

-- Update RLS Policies to be simpler and faster
DROP POLICY IF EXISTS "signals: owner can read" ON public.validation_signals;
DROP POLICY IF EXISTS "signals: owner can insert" ON public.validation_signals;

CREATE POLICY "signals: owner can read"
  ON public.validation_signals
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "signals: owner can insert"
  ON public.validation_signals
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_validation_signals_user_id ON public.validation_signals(user_id);
