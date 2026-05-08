-- Enable Realtime for validation_signals table
-- This allows the 'supabase_realtime' publication to broadcast changes to this table
DO $$ BEGIN
    ALTER publication supabase_realtime ADD TABLE validation_signals;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Note: RLS must be enabled for the table to ensure users only receive their own signals.
-- (This is already handled by the existing RLS policies on validation_signals).
