-- =============================================================================
-- anyWays — Supabase PostgreSQL Schema
-- Converted 1-to-1 from backend/prisma/schema.prisma
-- Field names preserved exactly as Prisma @map() directives define them.
-- Run this in the Supabase SQL Editor (Dashboard → SQL Editor → New Query).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- SAFETY: Drop existing objects if re-running (idempotent setup)
-- Remove this block if your tables already have live data.
-- -----------------------------------------------------------------------------
DROP TABLE IF EXISTS public.api_key_usage        CASCADE;
DROP TABLE IF EXISTS public.validation_signals   CASCADE;
DROP TABLE IF EXISTS public.places               CASCADE;
DROP TABLE IF EXISTS public.api_keys             CASCADE;
DROP TYPE  IF EXISTS public.place_status         CASCADE;
DROP TYPE  IF EXISTS public.signal_type          CASCADE;
DROP FUNCTION IF EXISTS public.update_modified_column CASCADE;


-- =============================================================================
-- 1. ENUMS
--    Prisma: enum PlaceStatus  →  @@map not used, values used directly
--    Prisma: enum SignalType   →  same
-- =============================================================================

CREATE TYPE public.place_status AS ENUM (
  'OPEN',
  'CLOSED',
  'TEMPORARILY_CLOSED',
  'PERMANENTLY_CLOSED'
);

CREATE TYPE public.signal_type AS ENUM (
  'FOOT_TRAFFIC',
  'OCR_MENU',
  'SOCIAL_SENTIMENT',
  'HOURS_VERIFIED',
  'PHONE_VERIFIED'
);


-- =============================================================================
-- 2. API KEYS  (@@map("api_keys"))
--
--  Prisma field        →  SQL column         Type
--  ─────────────────────────────────────────────────────
--  id                  →  id                 UUID PK
--  userId / user_id    →  user_id            UUID → auth.users
--  keyHash / key_hash  →  key_hash           TEXT
--  name                →  name               TEXT
--  permissions         →  permissions        JSONB   (Json in Prisma)
--  lastUsedAt          →  last_used_at       TIMESTAMPTZ nullable
--  revokedAt           →  revoked_at         TIMESTAMPTZ nullable
--  createdAt           →  created_at         TIMESTAMPTZ
--  updatedAt           →  updated_at         TIMESTAMPTZ (auto-trigger)
-- =============================================================================

CREATE TABLE public.api_keys (
  id           UUID        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id      UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  key_hash     TEXT        NOT NULL,
  name         TEXT        NOT NULL,
  permissions  JSONB       NOT NULL DEFAULT '[]'::jsonb,
  last_used_at TIMESTAMPTZ,
  revoked_at   TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE  public.api_keys              IS 'API keys issued to dashboard users for SDK access';
COMMENT ON COLUMN public.api_keys.key_hash     IS 'SHA-256 hash of the raw API key — raw key is never stored';
COMMENT ON COLUMN public.api_keys.permissions  IS 'Array of permission strings, e.g. ["read","write","admin"]';


-- =============================================================================
-- 3. API KEY USAGE  (@@map("api_key_usage"))
--
--  Prisma field       →  SQL column       Type
--  ────────────────────────────────────────────
--  id                 →  id               UUID PK
--  apiKeyId           →  api_key_id       UUID → api_keys
--  endpoint           →  endpoint         TEXT
--  method             →  method           TEXT
--  statusCode         →  status_code      INT
--  timestamp          →  timestamp        TIMESTAMPTZ  (no updatedAt in Prisma)
-- =============================================================================

CREATE TABLE public.api_key_usage (
  id          UUID        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  api_key_id  UUID        NOT NULL REFERENCES public.api_keys(id) ON DELETE CASCADE,
  endpoint    TEXT        NOT NULL,
  method      TEXT        NOT NULL,
  status_code INT         NOT NULL,
  timestamp   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.api_key_usage IS 'Append-only log of every API key request — no updated_at (matches Prisma model)';


-- =============================================================================
-- 4. PLACES  (@@map("places"))
--
--  Prisma field          →  SQL column          Type
--  ────────────────────────────────────────────────────────────
--  id                    →  id                  UUID PK
--  userId / user_id      →  user_id             UUID → auth.users
--  name                  →  name                TEXT
--  address               →  address             TEXT nullable
--  latitude              →  latitude            NUMERIC(10,8) nullable
--  longitude             →  longitude           NUMERIC(11,8) nullable
--  status (PlaceStatus)  →  status              place_status enum  DEFAULT OPEN
--  confidenceScore       →  confidence_score    INT  DEFAULT 0
--  lastValidatedAt       →  last_validated_at   TIMESTAMPTZ nullable
--  createdAt             →  created_at          TIMESTAMPTZ
--  updatedAt             →  updated_at          TIMESTAMPTZ (auto-trigger)
-- =============================================================================

CREATE TABLE public.places (
  id                UUID              NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id           UUID              NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name              TEXT              NOT NULL,
  address           TEXT,
  latitude          NUMERIC(10, 8),
  longitude         NUMERIC(11, 8),
  status            public.place_status NOT NULL DEFAULT 'OPEN'::public.place_status,
  confidence_score  INT               NOT NULL DEFAULT 0
                    CHECK (confidence_score >= 0 AND confidence_score <= 100),
  last_validated_at TIMESTAMPTZ,
  created_at        TIMESTAMPTZ       NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ       NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE  public.places                    IS 'Physical locations tracked by the Place Intelligence platform';
COMMENT ON COLUMN public.places.confidence_score   IS '0–100 score computed from validation signals';
COMMENT ON COLUMN public.places.last_validated_at  IS 'Timestamp of the most recent signal ingestion';


-- =============================================================================
-- 5. VALIDATION SIGNALS  (@@map("validation_signals"))
--
--  Prisma field          →  SQL column          Type
--  ────────────────────────────────────────────────────────────
--  id                    →  id                  UUID PK
--  placeId / place_id    →  place_id            UUID → places
--  signalType            →  signal_type         signal_type enum
--  signalValue           →  signal_value        JSONB   (Json in Prisma)
--  confidenceImpact      →  confidence_impact   INT
--  detectedAt            →  detected_at         TIMESTAMPTZ
--  createdAt             →  created_at          TIMESTAMPTZ
--  (no updatedAt in Prisma → no updated_at column here)
-- =============================================================================

CREATE TABLE public.validation_signals (
  id                UUID               NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  place_id          UUID               NOT NULL REFERENCES public.places(id) ON DELETE CASCADE,
  signal_type       public.signal_type NOT NULL,
  signal_value      JSONB              NOT NULL,
  confidence_impact INT                NOT NULL,
  detected_at       TIMESTAMPTZ        NOT NULL DEFAULT NOW(),
  created_at        TIMESTAMPTZ        NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE  public.validation_signals              IS 'Individual signals that drive the place confidence score';
COMMENT ON COLUMN public.validation_signals.signal_value IS 'Flexible JSONB payload — structure varies per signal_type';
COMMENT ON COLUMN public.validation_signals.confidence_impact IS 'Positive or negative integer added to place.confidence_score';


-- =============================================================================
-- 6. INDEXES  (performance — mirrors Prisma implicit FK indexes)
-- =============================================================================

-- Auth/ownership lookups
CREATE INDEX idx_places_user_id        ON public.places(user_id);
CREATE INDEX idx_api_keys_user_id      ON public.api_keys(user_id);

-- Signal fetching by place
CREATE INDEX idx_signals_place_id      ON public.validation_signals(place_id);

-- API key hash lookup (used on every inbound SDK request)
CREATE INDEX idx_api_keys_key_hash     ON public.api_keys(key_hash);

-- Usage log lookups
CREATE INDEX idx_api_key_usage_key_id  ON public.api_key_usage(api_key_id);
CREATE INDEX idx_api_key_usage_ts      ON public.api_key_usage(timestamp DESC);

-- Active keys only (partial index — WHERE revoked_at IS NULL)
CREATE INDEX idx_api_keys_active       ON public.api_keys(user_id) WHERE revoked_at IS NULL;


-- =============================================================================
-- 7. updated_at AUTO-TRIGGER
--    Mirrors Prisma @updatedAt — only on tables that have an updated_at column.
--    api_key_usage and validation_signals deliberately have NO updated_at.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.update_modified_column()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_places_updated_at
  BEFORE UPDATE ON public.places
  FOR EACH ROW EXECUTE FUNCTION public.update_modified_column();

CREATE TRIGGER trg_api_keys_updated_at
  BEFORE UPDATE ON public.api_keys
  FOR EACH ROW EXECUTE FUNCTION public.update_modified_column();


-- =============================================================================
-- 8. ROW LEVEL SECURITY (RLS)
--    Supabase requires RLS to be explicitly enabled and policies defined.
--    Every table in public schema must have policies or it is inaccessible
--    to anon/authenticated roles.
-- =============================================================================

ALTER TABLE public.places             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_keys           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.validation_signals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_key_usage      ENABLE ROW LEVEL SECURITY;


-- -----------------------------------------------------------------------------
-- places — authenticated users manage their own rows only
-- -----------------------------------------------------------------------------
CREATE POLICY "places: owner full access"
  ON public.places
  FOR ALL
  TO authenticated
  USING     (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);


-- -----------------------------------------------------------------------------
-- api_keys — authenticated users manage their own keys only
-- -----------------------------------------------------------------------------
CREATE POLICY "api_keys: owner full access"
  ON public.api_keys
  FOR ALL
  TO authenticated
  USING     (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);


-- -----------------------------------------------------------------------------
-- validation_signals
--   SELECT  → dashboard users can read signals for their own places
--   INSERT  → Edge Functions use the service_role key (bypasses RLS),
--             but we also allow authenticated inserts for direct dashboard use
-- -----------------------------------------------------------------------------
CREATE POLICY "signals: owner can read"
  ON public.validation_signals
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.places
      WHERE places.id = validation_signals.place_id
        AND places.user_id = auth.uid()
    )
  );

CREATE POLICY "signals: owner can insert"
  ON public.validation_signals
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.places
      WHERE places.id = validation_signals.place_id
        AND places.user_id = auth.uid()
    )
  );


-- -----------------------------------------------------------------------------
-- api_key_usage — append-only log
--   SELECT  → owner of the api_key can read their own usage logs
--   INSERT  → Edge Functions insert via service_role (bypasses RLS)
--             Authenticated users cannot insert directly (write-once via SDK)
-- -----------------------------------------------------------------------------
CREATE POLICY "api_key_usage: owner can read"
  ON public.api_key_usage
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.api_keys
      WHERE api_keys.id = api_key_usage.api_key_id
        AND api_keys.user_id = auth.uid()
    )
  );


-- =============================================================================
-- END OF MIGRATION
-- =============================================================================
