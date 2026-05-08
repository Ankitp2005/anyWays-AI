import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

// 1. Load config
const envPath = path.resolve(process.cwd(), '.env');
const envFile = fs.readFileSync(envPath, 'utf-8');
let supabaseUrl = '';
let supabaseServiceKey = '';

envFile.split('\n').forEach(line => {
    if (line.startsWith('VITE_SUPABASE_URL')) supabaseUrl = line.split('=')[1].replace(/['"]/g, '').trim();
    if (line.startsWith('VITE_SUPABASE_SERVICE_ROLE_KEY')) supabaseServiceKey = line.split('=')[1].replace(/['"]/g, '').trim();
});

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Simulation config
const NUM_PLACES = 5;
const OUTCOMES = ['SUCCESS', 'FAILED', 'CLOSED'];
const FAILURE_REASONS = [
    "Store closed unexpectedly",
    "Incorrect location pin",
    "Entry denied by security"
];

// Helper to pick random item
const sample = (arr) => arr[Math.floor(Math.random() * arr.length)];
const randomFloat = (min, max) => Math.random() * (max - min) + min;

async function runSimulation() {
    console.log("🚀 Starting Isolated Testing Tool...");
    
    const args = process.argv.slice(2);
    const scenarioArg = args.find(a => a.startsWith('--scenario='));
    const scenario = scenarioArg ? scenarioArg.split('=')[1] : null;

    if (!['malicious_attack', 'gps_drift', 'recovery'].includes(scenario)) {
        console.error("Please provide a valid scenario: --scenario=malicious_attack | --scenario=gps_drift | --scenario=recovery");
        process.exit(1);
    }
    
    // 1. Get a user
    const { data: users, error: userErr } = await supabase.auth.admin.listUsers();
    if (userErr || !users.users.length) {
        console.error("Failed to fetch users or no users exist.");
        return;
    }
    const userId = users.users[0].id;
    
    // 2. Create API Keys
    const keys = [];
    const rawKey = crypto.randomUUID();
    const encoder = new TextEncoder();
    const hashBuffer = await crypto.subtle.digest('SHA-256', encoder.encode(rawKey));
    const keyHash = Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');
    
    const { data: keyData } = await supabase.from('api_keys').insert([{
        user_id: userId,
        name: `SimKey_${scenario}`,
        key_hash: keyHash,
        permissions: ['write']
    }]).select().single();
    keys.push({ id: keyData.id, rawKey });
    
    // 3. Create a Place for the scenario
    const { data: place } = await supabase.from('places').insert([{
        user_id: userId,
        name: `Scenario Place (${scenario})`,
        address: `${Math.floor(Math.random() * 9000) + 100} Simulated Ave`,
        latitude: 40.7128 + randomFloat(-0.05, 0.05),
        longitude: -74.0060 + randomFloat(-0.05, 0.05),
        status: 'OPEN'
    }]).select().single();
    
    console.log(`Created place and API key. Executing scenario: ${scenario}`);

    // 4. Generate Scenario Events
    const apiKeyObj = keys[0];
    
    const invokeSignal = async (sigType, payload) => {
        const resp = await supabase.functions.invoke('signals-v2', {
            method: 'POST',
            headers: { 
                'x-api-key': apiKeyObj.rawKey,
                'x-simulation': 'true'
            },
            body: { place_id: place.id, signal_type: sigType, payload }
        });
        if (resp.error) console.error("Signal invoke error:", resp.error.message);
        return resp;
    };

    const invokeFeedback = async (score, outcome, reason) => {
        return supabase.functions.invoke('delivery-feedback', {
            method: 'POST',
            headers: { 'x-simulation': 'true' },
            body: { place_id: place.id, predicted_score: score, actual_outcome: outcome, failure_reason: reason }
        });
    };

    if (scenario === 'malicious_attack') {
        console.log("-> Simulating Malicious Attack (Spamming CLOSED_DETECTED)");
        for (let i = 0; i < 5; i++) {
            await invokeSignal('CLOSED_DETECTED', {});
        }
    } else if (scenario === 'gps_drift') {
        console.log("-> Simulating GPS Drift (Validations slightly off location)");
        for (let i = 0; i < 3; i++) {
            await invokeSignal('FOOT_TRAFFIC', { 
                latitude: place.latitude + 0.05, 
                longitude: place.longitude + 0.05 
            });
        }
    } else if (scenario === 'recovery') {
        console.log("-> Simulating Recovery (Positive validations after failure)");
        await invokeFeedback(20, 'FAILED', 'Store closed unexpectedly');
        for (let i = 0; i < 3; i++) {
            await invokeSignal('OCR_MENU', {});
            await invokeSignal('FOOT_TRAFFIC', { 
                latitude: place.latitude, 
                longitude: place.longitude 
            });
        }
    }

    // Force metric computation just to verify it ignores this data
    await supabase.rpc('compute_daily_model_metrics');
    
    console.log("🎉 Scenario Complete!");
}

runSimulation().catch(console.error);
