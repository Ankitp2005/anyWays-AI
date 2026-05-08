import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

const envPath = path.resolve(process.cwd(), '.env');
const envFile = fs.readFileSync(envPath, 'utf-8');
let supabaseUrl = '';
let supabaseServiceKey = '';

envFile.split('\n').forEach(line => {
    if (line.startsWith('VITE_SUPABASE_URL')) supabaseUrl = line.split('=')[1].replace(/['"]/g, '').trim();
    if (line.startsWith('VITE_SUPABASE_SERVICE_ROLE_KEY')) supabaseServiceKey = line.split('=')[1].replace(/['"]/g, '').trim();
});

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function verifyIsolation() {
    console.log("🔍 Verifying Simulation Isolation...\n");

    // 1. Check if there's any simulation data in the DB right now
    const { count: preSimSignals } = await supabase.from('validation_signals').select('*', { count: 'exact', head: true }).eq('is_simulated', true);
    console.log(`[1] Pre-Simulation check: Found ${preSimSignals || 0} simulated validation signals in DB.`);

    // 2. Query a core metric (Total Real Signals)
    const { count: realSignals } = await supabase.from('validation_signals').select('*', { count: 'exact', head: true }).eq('is_simulated', false);
    console.log(`[2] Real system data count: ${realSignals || 0} signals.`);

    // 3. Trigger a short manual simulation via API
    console.log(`\n🚀 Firing a simulated 'malicious_attack' API request...`);
    
    // We need a dummy place and api key just to test the endpoint
    const { data: users } = await supabase.auth.admin.listUsers();
    const userId = users?.users[0]?.id || '00000000-0000-0000-0000-000000000000';

    const { data: place } = await supabase.from('places').insert([{
        user_id: userId,
        name: `Verification Place`,
        address: `123 Test St`,
        latitude: 40.7128,
        longitude: -74.0060,
        status: 'OPEN'
    }]).select().single();

    const crypto = await import('crypto');
    
    // Create API Key
    const rawKey = crypto.randomUUID();
    const encoder = new TextEncoder();
    const hashBuffer = await crypto.subtle.digest('SHA-256', encoder.encode(rawKey));
    const keyHash = Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');

    const { data: keyData } = await supabase.from('api_keys').insert([{
        user_id: userId,
        name: `VerifyKey`,
        key_hash: keyHash,
        permissions: ['write']
    }]).select().single();

    // Call the Edge Function directly (simulating a request from the chaos script)
    const resp = await supabase.functions.invoke('signals', {
        method: 'POST',
        headers: { 
            'x-api-key': rawKey,
            'x-simulation': 'true'
        },
        body: { place_id: place.id, signal_type: 'CLOSED_DETECTED', payload: {} }
    });

    console.log(`✅ Simulated request completed. Edge function response status:`, resp.error ? resp.error.message : 'SUCCESS');

    // Wait a second for async triggers
    await new Promise(r => setTimeout(r, 1000));

    console.log(`\n📊 Checking Results...`);

    // 4. Verify the signal was inserted BUT tagged as simulated
    const { count: postSimSignals } = await supabase.from('validation_signals').select('*', { count: 'exact', head: true }).eq('is_simulated', true);
    console.log(`[A] Database Verification: DB now contains ${postSimSignals || 0} simulated validation signals.`);

    // 5. Verify Real Data count hasn't changed (Zero Leakage)
    const { count: postRealSignals } = await supabase.from('validation_signals').select('*', { count: 'exact', head: true }).eq('is_simulated', false);
    const leakage = postRealSignals !== realSignals;
    console.log(`[B] Metric Verification: Real data count is still ${postRealSignals || 0}. Leakage detected? ${leakage ? 'YES ❌' : 'NO ✅'}`);

    // 6. Verify Activity Logs show SIMULATION_EVENT
    const { data: logs } = await supabase.from('activity_logs').select('event_type, event_meta').eq('place_id', place.id).eq('is_simulated', true);
    console.log(`[C] Observability Verification: Activity Logs created:`, logs?.length || 0);
    if (logs && logs.length > 0) {
        console.log(`    -> Log Event Type: ${logs[0].event_type} ✅`);
    }

    // Cleanup the verification data
    await supabase.from('places').delete().eq('id', place.id);
    await supabase.from('api_keys').delete().eq('id', keyData.id);
    await supabase.from('validation_signals').delete().eq('is_simulated', true);
    await supabase.from('activity_logs').delete().eq('is_simulated', true);
}

verifyIsolation().catch(console.error);
