-- =============================================================================
-- anyWays — Standalone RLS Policy Reference
-- Run in: Supabase Dashboard → SQL Editor
--
-- This file is for reference and incremental changes only.
-- The policies below were already applied via the init migration.
-- Use the ALTER POLICY / DROP POLICY + CREATE POLICY pattern to update.
-- =============================================================================


-- =============================================================================
-- POLICY SUMMARY
-- =============================================================================
--
--  Table                 | Operation | Role          | Condition
--  ──────────────────────────────────────────────────────────────────────────
--  places                | ALL       | authenticated | auth.uid() = user_id
--  api_keys              | ALL       | authenticated | auth.uid() = user_id
--  validation_signals    | SELECT    | authenticated | place.user_id = auth.uid()
--  validation_signals    | INSERT    | authenticated | place.user_id = auth.uid()
--  api_key_usage         | SELECT    | authenticated | api_key.user_id = auth.uid()
--  (all tables)          | ALL       | service_role  | bypasses RLS (Edge Functions)
-- =============================================================================


-- =============================================================================
-- 1. PLACES
--    Frontend queries: SELECT *, INSERT, UPDATE, DELETE
--    All scoped to the authenticated user via user_id column.
-- =============================================================================

-- Drop + recreate pattern (safe to re-run)
DROP POLICY IF EXISTS "places: owner full access" ON public.places;

CREATE POLICY "places: owner full access"
  ON public.places
  FOR ALL
  TO authenticated
  USING     (auth.uid() = user_id)   -- controls SELECT, UPDATE, DELETE
  WITH CHECK (auth.uid() = user_id); -- controls INSERT, UPDATE


-- =============================================================================
-- 2. API KEYS
--    Frontend queries: SELECT (active only), UPDATE (revoke via revoked_at),
--                      INSERT (generate new key)
--    Scoped to owner via user_id.
-- =============================================================================

DROP POLICY IF EXISTS "api_keys: owner full access" ON public.api_keys;

CREATE POLICY "api_keys: owner full access"
  ON public.api_keys
  FOR ALL
  TO authenticated
  USING     (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);


-- =============================================================================
-- 3. VALIDATION SIGNALS
--    Frontend queries:
--      SELECT  — api.signals.getSignalsForPlace(placeId)
--              — api.signals.getRecentSignals() with !inner join on places
--      INSERT  — dashboard direct insert OR Edge Function via service_role
--
--    Policy uses a sub-select on places to verify ownership transitively.
--    This is safe because places itself is also RLS-protected.
-- =============================================================================

DROP POLICY IF EXISTS "signals: owner can read"   ON public.validation_signals;
DROP POLICY IF EXISTS "signals: owner can insert" ON public.validation_signals;

CREATE POLICY "signals: owner can read"
  ON public.validation_signals
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM   public.places
      WHERE  places.id      = validation_signals.place_id
        AND  places.user_id = auth.uid()
    )
  );

CREATE POLICY "signals: owner can insert"
  ON public.validation_signals
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM   public.places
      WHERE  places.id      = validation_signals.place_id
        AND  places.user_id = auth.uid()
    )
  );


-- =============================================================================
-- 4. API KEY USAGE  (append-only log)
--    Frontend queries: SELECT (for usage analytics)
--    INSERT is done only by Edge Functions using service_role — bypasses RLS.
--    Authenticated users can never INSERT directly (write-once via SDK only).
-- =============================================================================

DROP POLICY IF EXISTS "api_key_usage: owner can read" ON public.api_key_usage;

CREATE POLICY "api_key_usage: owner can read"
  ON public.api_key_usage
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM   public.api_keys
      WHERE  api_keys.id      = api_key_usage.api_key_id
        AND  api_keys.user_id = auth.uid()
    )
  );
