import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import fetch from 'node-fetch';

// Load environment variables from .env
dotenv.config();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const API_KEY = process.env.SIMULATOR_API_KEY; // You need to generate an API key in the dashboard and put it in .env

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env');
    process.exit(1);
}

if (!API_KEY) {
    console.error('❌ Missing SIMULATOR_API_KEY in .env');
    console.error('Please generate an API Key in the dashboard and add SIMULATOR_API_KEY="your_raw_key" to .env');
    process.exit(1);
}

// Use Service Role to query places across all users
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

const SIGNAL_TYPES = [
    { type: 'FOOT_TRAFFIC', weightMin: 5, weightMax: 20 },
    { type: 'SOCIAL_SENTIMENT', weightMin: 10, weightMax: 25 },
    { type: 'OCR_MENU', weightMin: 15, weightMax: 30 },
    { type: 'HOURS_VERIFIED', weightMin: 10, weightMax: 20 },
    { type: 'PHONE_VERIFIED', weightMin: 20, weightMax: 40 },
];

function getRandomInt(min: number, max: number) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function generateSignalPayload(signalType: string) {
    switch (signalType) {
        case 'FOOT_TRAFFIC':
            return { count: getRandomInt(10, 200), source: 'camera_01', duration: '1h' };
        case 'SOCIAL_SENTIMENT':
            const sentiments = ['positive', 'positive', 'neutral', 'negative'];
            return { platform: 'twitter', sentiment: sentiments[getRandomInt(0, 3)], score: getRandomInt(60, 95) / 100 };
        case 'OCR_MENU':
            return { source: 'user_upload', items_detected: getRandomInt(5, 45), confidence: 0.9 };
        case 'HOURS_VERIFIED':
            return { source: 'google_places', matches_listed: true };
        case 'PHONE_VERIFIED':
            return { connected: true, duration_seconds: getRandomInt(15, 120) };
        default:
            return { generic: true };
    }
}

async function simulateSignal() {
    try {
        // 1. Pick a random place
        const { data: places, error: placesError } = await supabase
            .from('places')
            .select('id, name')
            .limit(50); // Get up to 50 places to choose from

        if (placesError) throw placesError;
        if (!places || places.length === 0) {
            console.log('⏳ No places found in the database. Waiting...');
            return;
        }

        const randomPlace = places[getRandomInt(0, places.length - 1)];

        // 2. Generate a random signal
        const signalDef = SIGNAL_TYPES[getRandomInt(0, SIGNAL_TYPES.length - 1)];
        const impact = getRandomInt(signalDef.weightMin, signalDef.weightMax);
        const payload = generateSignalPayload(signalDef.type);

        console.log(`\n🤖 [Simulator] Ingesting ${signalDef.type} for "${randomPlace.name}" (+${impact})`);

        // 3. Send the signal via the Edge Function (this tests the whole pipeline + rate limits)
        const response = await fetch(`${SUPABASE_URL}/functions/v1/signals`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': API_KEY
            },
            body: JSON.stringify({
                place_id: randomPlace.id,
                signal_type: signalDef.type,
                signal_value: payload,
                confidence_impact: impact
            })
        });

        if (!response.ok) {
            const errBody = await response.text();
            console.error(`❌ [Simulator] Failed to ingest signal: ${response.status} ${response.statusText}`, errBody);
            return;
        }

        const result = await response.json() as any;
        console.log(`✅ [Simulator] Success! New Score: ${result.newScore}% [${result.scoreLabel}]`);

    } catch (err: any) {
        console.error('❌ [Simulator] Error:', err.message);
    }
}

// ── Run Loop ─────────────────────────────────────────────────────────────────

console.log('🚀 Starting Background Traffic Simulator...');
console.log('Press Ctrl+C to stop.\n');

// Run immediately once
simulateSignal();

// Then run every 10 to 30 seconds randomly
function scheduleNext() {
    const delayMs = getRandomInt(10000, 30000); // 10 to 30 seconds
    setTimeout(async () => {
        await simulateSignal();
        scheduleNext();
    }, delayMs);
}

scheduleNext();
