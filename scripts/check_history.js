import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const env = fs.readFileSync('.env', 'utf-8');
const url = env.match(/VITE_SUPABASE_URL=(.*)/)[1].replace(/['"\s]/g, '');
const key = env.match(/VITE_SUPABASE_SERVICE_ROLE_KEY=(.*)/)[1].replace(/['"\s]/g, '');

const s = createClient(url, key);

async function run() {
    const { data: places } = await s.from('places').select('id, name').ilike('name', 'Chaos Place %').limit(1);
    const place = places[0];

    const { data: hist, error } = await s.rpc('get_place_signal_history', { p_place_id: place.id });
    if (error) {
        console.error('RPC error:', error);
    } else {
        console.log(`✅ Signal history for "${place.name}": ${hist.length} events`);
        if (hist.length > 0) {
            console.log('First event:', JSON.stringify(hist[hist.length - 1], null, 2));
            console.log('Last event:', JSON.stringify(hist[0], null, 2));
        }
    }
}

run();
