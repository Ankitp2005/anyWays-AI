import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const env = fs.readFileSync('.env', 'utf-8');
const url = env.match(/VITE_SUPABASE_URL=(.*)/)[1].replace(/['"\s]/g, '');
const key = env.match(/VITE_SUPABASE_SERVICE_ROLE_KEY=(.*)/)[1].replace(/['"\s]/g, '');

const s = createClient(url, key);

async function run() {
    const { data: places } = await s.from('places').select('user_id');
    const { data: { users } } = await s.auth.admin.listUsers();
    
    const userMap = users.reduce((acc, u) => { acc[u.id] = u.email; return acc; }, {});
    const counts = places.reduce((acc, p) => { acc[p.user_id] = (acc[p.user_id] || 0) + 1; return acc; }, {});
    
    console.log("Place counts by user:");
    Object.entries(counts).forEach(([uid, count]) => {
        console.log(`${userMap[uid] || uid}: ${count}`);
    });
}

run();
