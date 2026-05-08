import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.48.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  // ── Simulation Isolation ──────────────────────────────────────────────────
  const isSimulated = req.headers.get('x-simulation') === 'true';

  // STEP 3: Production Safety Guard — block simulation in production
  if (isSimulated && Deno.env.get('ENVIRONMENT') === 'production') {
    return new Response(
      JSON.stringify({ error: 'Simulation disabled in production' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 403 }
    );
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { place_id, predicted_score, predicted_label, actual_outcome, failure_reason } = await req.json();

    if (!place_id || !actual_outcome) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: place_id or actual_outcome' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // Call the RPC to log delivery attempt and update signal feedback
    const { data, error } = await supabaseClient.rpc('log_delivery_attempt', {
      p_place_id: place_id,
      p_predicted_score: predicted_score || 0,
      p_predicted_label: predicted_label || null,
      p_actual_outcome: actual_outcome,
      p_failure_reason: failure_reason || null
    });

    if (error) {
      console.error('RPC Error:', error);
      throw error;
    }

    // Tag the delivery_attempts row with is_simulated (write-path only).
    if (isSimulated && data) {
      await supabaseClient
        .from('delivery_attempts')
        .update({ is_simulated: true })
        .eq('id', data);
    }

    return new Response(
      JSON.stringify({ success: true, delivery_attempt_id: data }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );

  } catch (error) {
    console.error('Delivery Feedback Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
