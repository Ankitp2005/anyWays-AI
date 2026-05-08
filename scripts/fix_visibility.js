import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const env = fs.readFileSync('.env', 'utf-8');
const url = env.match(/VITE_SUPABASE_URL=(.*)/)[1].replace(/['"\s]/g, '');
const key = env.match(/VITE_SUPABASE_SERVICE_ROLE_KEY=(.*)/)[1].replace(/['"\s]/g, '');

const s = createClient(url, key);

async function run() {
    const { data: { users } } = await s.auth.admin.listUsers();
    const admin = users.find(u => u.email === 'admin@anyways.com');
    if (!admin) {
        console.log('Admin not found');
        return;
    }
    
    const { error } = await s.from('places').update({ user_id: admin.id }).neq('user_id', admin.id);
    if (error) {
        console.error(error);
    } else {
        console.log('✅ Successfully reassigned all places to admin@anyways.com');
        
        // Also force a metrics re-run so the dashboard updates
        console.log('🔄 Triggering Model Health Analysis...');
        await s.rpc('compute_daily_model_metrics');
        console.log('✅ Analysis Complete!');
    }
}

run();
