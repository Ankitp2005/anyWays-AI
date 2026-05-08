-- =============================================================================
-- Ingestion Adapters: Add Source Type
-- =============================================================================

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'validation_signals' AND column_name = 'source_type') THEN
        ALTER TABLE public.validation_signals ADD COLUMN source_type TEXT DEFAULT 'INTERNAL';
    END IF;
END $$;
