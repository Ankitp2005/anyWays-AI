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
supabase.from('validation_signals').select('*').eq('is_simulated', true).then(d => console.log(d.data)).catch(console.error);
