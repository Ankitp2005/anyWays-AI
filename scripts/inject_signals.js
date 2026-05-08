import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const env = fs.readFileSync('.env', 'utf-8');
const url = env.match(/VITE_SUPABASE_URL=(.*)/)[1].replace(/['"\s]/g, '');
const key = env.match(/VITE_SUPABASE_SERVICE_ROLE_KEY=(.*)/)[1].replace(/['"\s]/g, '');

const s = createClient(url, key);

async function run() {
    const { data: places } = await s.from('places').select('id, name').ilike('name', 'Chaos Place %');
    if (!places || places.length === 0) return console.log('No places');
    
    const events = [];
    
    places.forEach(place => {
        let currentScore = 100;
        
        for (let i = 15; i >= 0; i--) {
            const date = new Date(Date.now() - (i * 12 * 60 * 60 * 1000)).toISOString();
            let sigType = 'PICKUP_LOCATION_VERIFIED';
            let delta = 5;
            
            if (i < 5) {
                sigType = 'CLOSED_DETECTED';
                delta = -30;
            }
            
            const before = currentScore;
            currentScore = Math.max(0, Math.min(100, currentScore + delta));
            
            events.push({
                place_id: place.id,
                signal_type: sigType,
                confidence_delta: delta,
                score_before: before,
                score_after: currentScore,
                created_at: date
            });
        }
    });

    const { error } = await s.from('signal_events').insert(events);
    if (error) console.error(error);
    else console.log('✅ Successfully injected signal history for the timeline!');
}

run();
