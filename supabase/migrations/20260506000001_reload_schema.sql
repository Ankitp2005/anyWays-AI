-- Dummy migration to trigger PostgREST schema cache reload
COMMENT ON TABLE public.delivery_attempts IS 'Tracks ground truth delivery attempts';
