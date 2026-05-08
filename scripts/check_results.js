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

async function check() {
    const { data: signals } = await supabase.from('validation_signals')
        .select('signal_type, is_simulated, confidence_impact')
        .eq('is_simulated', true);
        
    console.log('\n--- Simulated Validation Signals ---');
    console.log(signals);

    const { data: logs } = await supabase.from('activity_logs')
        .select('event_type, is_simulated')
        .eq('is_simulated', true);
        
    console.log('\n--- Simulated Activity Logs ---');
    console.log(logs);
}

check().catch(console.error);
