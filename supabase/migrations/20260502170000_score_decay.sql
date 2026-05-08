-- Score Decay System
-- ==================
-- Problem: Places that stop receiving signals keep their score forever.
-- Solution: Scheduled hourly decay that gradually reduces scores for stale places.
--
-- Decay Rules:
--   - Idle window: 6 hours (no signals within this period triggers decay)
--   - Decay rate:  2 points per idle hour beyond the 6-hour threshold
--   - Floor:       0 (scores never go negative)
--   - Idempotent:  Running multiple times in the same hour produces the same result
--                  because we calculate based on elapsed time, not incremental subtraction
--
-- Race Condition Safety:
--   Uses SELECT ... FOR UPDATE SKIP LOCKED to avoid blocking concurrent signal ingestion

-- ── 1. Core Decay Function ──────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.apply_score_decay()
RETURNS TABLE(place_id UUID, old_score INT, new_score INT, hours_idle FLOAT) AS $$
DECLARE
    v_idle_threshold_hours CONSTANT INT := 6;   -- hours before decay starts
    v_decay_per_hour       CONSTANT INT := 2;   -- points lost per idle hour
    v_now                  TIMESTAMPTZ := NOW();
    v_rec                  RECORD;
    v_hours_idle           FLOAT;
    v_decay_amount         INT;
    v_new_score            INT;
BEGIN
    -- Process all places that:
    --   1. Have a score > 0 (nothing to decay at 0)
    --   2. Have been idle for > v_idle_threshold_hours
    -- Lock rows to prevent race conditions with concurrent signal ingestion
    FOR v_rec IN
        SELECT p.id, p.confidence_score, p.last_validated_at
        FROM public.places p
        WHERE p.confidence_score > 0
          AND (
              p.last_validated_at IS NULL
              OR p.last_validated_at < (v_now - make_interval(hours => v_idle_threshold_hours))
          )
        FOR UPDATE SKIP LOCKED
    LOOP
        -- Calculate idle hours beyond the threshold
        IF v_rec.last_validated_at IS NULL THEN
            -- Never validated: treat as maximally stale (24h idle)
            v_hours_idle := 24.0;
        ELSE
            v_hours_idle := EXTRACT(EPOCH FROM (v_now - v_rec.last_validated_at)) / 3600.0;
        END IF;

        -- Only decay the hours BEYOND the idle threshold
        v_decay_amount := FLOOR((v_hours_idle - v_idle_threshold_hours) * v_decay_per_hour);

        -- Guard: never increase score, minimum decay is 0
        v_decay_amount := GREATEST(v_decay_amount, 0);

        -- Calculate new score (floor at 0)
        v_new_score := GREATEST(0, v_rec.confidence_score - v_decay_amount);

        -- Skip if no actual change (idempotency for re-runs)
        IF v_new_score = v_rec.confidence_score THEN
            CONTINUE;
        END IF;

        -- Apply the decay
        UPDATE public.places
        SET confidence_score = v_new_score
        WHERE public.places.id = v_rec.id;

        -- Return affected rows for logging
        place_id   := v_rec.id;
        old_score  := v_rec.confidence_score;
        new_score  := v_new_score;
        hours_idle := ROUND(v_hours_idle::NUMERIC, 1);
        RETURN NEXT;
    END LOOP;

    RETURN;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ── 2. Convenience wrapper for Edge Function / cron ─────────────────────────────
-- Returns a JSON summary instead of a table (easier to consume from Edge Functions)

CREATE OR REPLACE FUNCTION public.run_score_decay()
RETURNS JSONB AS $$
DECLARE
    v_results JSONB;
    v_count   INT;
BEGIN
    SELECT 
        COALESCE(json_agg(row_to_json(d)), '[]'::JSON)::JSONB,
        COUNT(*)
    INTO v_results, v_count
    FROM public.apply_score_decay() d;

    RETURN jsonb_build_object(
        'decayed_count', v_count,
        'executed_at',   NOW()::TEXT,
        'details',       v_results
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ── 3. Schedule via pg_cron (runs every hour at minute 0) ───────────────────────
-- NOTE: pg_cron must be enabled in Supabase Dashboard → Database → Extensions
-- If pg_cron is not available, the Edge Function cron (below) handles scheduling.

DO $$
BEGIN
    -- Only create the cron job if the extension exists
    IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
        PERFORM cron.unschedule('score_decay_hourly');
        PERFORM cron.schedule(
            'score_decay_hourly',
            '0 * * * *',              -- Every hour at :00
            'SELECT public.run_score_decay()'
        );
        RAISE NOTICE 'pg_cron job "score_decay_hourly" scheduled.';
    ELSE
        RAISE NOTICE 'pg_cron extension not found. Use Edge Function cron instead.';
    END IF;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Could not schedule pg_cron job: %. Use Edge Function cron instead.', SQLERRM;
END;
$$;
