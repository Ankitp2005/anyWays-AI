import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const env = fs.readFileSync('.env', 'utf-8');
const url = env.match(/VITE_SUPABASE_URL=(.*)/)[1].replace(/['"\s]/g, '');
const key = env.match(/VITE_SUPABASE_SERVICE_ROLE_KEY=(.*)/)[1].replace(/['"\s]/g, '');

const s = createClient(url, key);

async function run() {
    const { data: keys } = await s.from('api_key_trust').select('*');
    const { data: places } = await s.from('places').select('id').limit(1);
    
    const res = await fetch(url + '/functions/v1/signals', {
        method: 'POST',
        headers: { 
            'Authorization': 'Bearer ' + key,
            'x-api-key': keys[0].id,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ place_id: places[0].id, signal_type: 'CLOSED_DETECTED', payload: {} })
    });
    console.log("Status:", res.status);
    console.log("Body:", await res.text());
}

run();
