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

async function cleanup() {
    console.log("🧹 Cleaning up simulation data...");
    
    // We have to use RPC or delete directly using PostgREST. 
    // Wait, PostgREST delete needs a filter.
    const { error: err1 } = await supabase.from('validation_signals').delete().eq('is_simulated', true);
    console.log("validation_signals cleanup:", err1 ? err1.message : "OK");

    const { error: err2 } = await supabase.from('delivery_attempts').delete().eq('is_simulated', true);
    console.log("delivery_attempts cleanup:", err2 ? err2.message : "OK");

    const { error: err3 } = await supabase.from('activity_logs').delete().eq('is_simulated', true);
    console.log("activity_logs cleanup:", err3 ? err3.message : "OK");
    
    const { error: err4 } = await supabase.from('api_key_trust_history').delete().eq('is_simulated', true);
    console.log("api_key_trust_history cleanup:", err4 ? err4.message : "OK");

    console.log("Cleanup complete!");
}

cleanup().catch(console.error);
