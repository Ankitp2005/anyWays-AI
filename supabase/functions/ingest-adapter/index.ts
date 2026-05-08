import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.48.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// 1. Define Interfaces for real-world signals
interface GPS_PING {
  adapter_type: 'GPS_PING';
  device_id: string;
  latitude: number;
  longitude: number;
  timestamp: string;
}

interface DRIVER_CHECKIN {
  adapter_type: 'DRIVER_CHECKIN';
  driver_id: string;
  order_id: string;
  status: string;
}

interface DELIVERY_STATUS {
  adapter_type: 'DELIVERY_STATUS';
  delivery_id: string;
  status: 'SUCCESS' | 'FAILED' | 'CLOSED';
  reason?: string;
}

type ExternalPayload = GPS_PING | DRIVER_CHECKIN | DELIVERY_STATUS;

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

    const body = await req.json();
    const { place_id, payload } = body as { place_id: string; payload: ExternalPayload };

    if (!place_id || !payload || !payload.adapter_type) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: place_id, payload.adapter_type' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    let mapped_signal_type = '';
    let confidence_impact = 0;
    const source_type = payload.adapter_type;

    // 2. Normalize into existing signals
    switch (payload.adapter_type) {
      case 'GPS_PING':
        mapped_signal_type = 'FOOT_TRAFFIC';
        confidence_impact = 10;
        break;

      case 'DRIVER_CHECKIN':
        mapped_signal_type = 'PICKUP_LOCATION_VERIFIED';
        confidence_impact = 35;
        break;

      case 'DELIVERY_STATUS':
        if (payload.status === 'CLOSED') {
            mapped_signal_type = 'CLOSED_DETECTED';
            confidence_impact = -30;
        } else {
            // Can call the delivery feedback RPC or map to generic validation
            // For now map success to FOOT_TRAFFIC
            mapped_signal_type = payload.status === 'SUCCESS' ? 'FOOT_TRAFFIC' : 'LOW_TRAFFIC';
            confidence_impact = payload.status === 'SUCCESS' ? 20 : -10;
        }
        break;

      default:
        return new Response(
          JSON.stringify({ error: 'Unknown adapter_type' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        );
    }

    // Call the updated ingest_signal RPC with the source_type
    const { data, error } = await supabaseClient.rpc('ingest_signal', {
      p_place_id: place_id,
      p_signal_type: mapped_signal_type,
      p_signal_value: payload,
      p_confidence_impact: confidence_impact,
      p_user_id: '00000000-0000-0000-0000-000000000000', // System / Adapter User
      p_source_type: source_type
    });

    if (error) throw error;

    // Tag the most-recently-inserted signal row for this place with is_simulated.
    // The ingest_signal RPC inserts the validation_signals row; we update it
    // immediately after (write-path only — no read/query changes).
    if (isSimulated) {
      await supabaseClient
        .from('validation_signals')
        .update({ is_simulated: true })
        .eq('place_id', place_id)
        .order('created_at', { ascending: false })
        .limit(1);

      // Step 3: Observability Separation - Force simulation event type
      const fiveSecondsAgo = new Date(Date.now() - 5000).toISOString();
      await supabaseClient
        .from('activity_logs')
        .update({ is_simulated: true, event_type: 'SIMULATION_EVENT' })
        .eq('place_id', place_id)
        .eq('is_simulated', false)
        .gte('created_at', fiveSecondsAgo);
    }

    return new Response(
      JSON.stringify({ success: true, mapped_type: mapped_signal_type, updated_place: data }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );

  } catch (error: any) {
    console.error('Adapter Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
