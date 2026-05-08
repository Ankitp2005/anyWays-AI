-- =============================================================================
-- System: Real-World Signal Validation
-- =============================================================================

ALTER TYPE public.signal_type ADD VALUE IF NOT EXISTS 'GPS_ARRIVAL_VERIFIED';
ALTER TYPE public.signal_type ADD VALUE IF NOT EXISTS 'REAL_DWELL_TIME';
ALTER TYPE public.signal_type ADD VALUE IF NOT EXISTS 'DEVICE_VERIFIED_PRESENCE';
