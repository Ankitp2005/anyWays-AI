/**
 * deploy-negative-signals.mjs
 * ───────────────────────────
 * Usage:
 *   node deploy-negative-signals.mjs apply   → opens SQL Editor
 *   node deploy-negative-signals.mjs test    → verifies enum values exist
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { exec } from 'child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));

const envFile = readFileSync(resolve(__dirname, '.env'), 'utf-8');
const env = {};
envFile.split('\n').forEach(line => {
    const match = line.trim().match(/^([^=]+)=["']?(.+?)["']?\s*$/);
    if (match) env[match[1]] = match[2];
});

const SUPABASE_URL = env.VITE_SUPABASE_URL;
const SERVICE_KEY  = env.VITE_SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_KEY) {
    console.error('❌ Missing env vars');
    process.exit(1);
}

const projectRef = SUPABASE_URL.replace('https://', '').split('.')[0];
const sqlEditorUrl = `https://supabase.com/dashboard/project/${projectRef}/sql/new`;
const migrationPath = resolve(__dirname, 'supabase/migrations/20260502180000_negative_signals.sql');

const mode = process.argv[2];

if (mode === 'test') {
    console.log('\n🧪 Testing negative signal types...\n');
    const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

    // Test CLOSED_DETECTED
    const { error: err1 } = await supabase
        .from('validation_signals')
        .select('id')
        .eq('signal_type', 'CLOSED_DETECTED')
        .limit(1);

    if (err1 && err1.message.includes('invalid input value')) {
        console.log('  CLOSED_DETECTED: ❌ not in enum yet');
        console.log('\n  👉 Run: node deploy-negative-signals.mjs apply\n');
        process.exit(1);
    } else {
        console.log('  CLOSED_DETECTED: ✅ accepted');
    }

    // Test LOW_TRAFFIC
    const { error: err2 } = await supabase
        .from('validation_signals')
        .select('id')
        .eq('signal_type', 'LOW_TRAFFIC')
        .limit(1);

    if (err2 && err2.message.includes('invalid input value')) {
        console.log('  LOW_TRAFFIC:     ❌ not in enum yet');
        console.log('\n  👉 Run: node deploy-negative-signals.mjs apply\n');
        process.exit(1);
    } else {
        console.log('  LOW_TRAFFIC:     ✅ accepted');
    }

    console.log('\n✅ Both negative signal types are ready!\n');

} else {
    console.log(`\n${'═'.repeat(55)}`);
    console.log(`  🚀 NEGATIVE SIGNALS DEPLOYMENT`);
    console.log(`${'═'.repeat(55)}\n`);

    console.log(`  Step 1: Opening Supabase SQL Editor...\n`);
    
    const openCmd = process.platform === 'win32' ? 'start' :
                    process.platform === 'darwin' ? 'open' : 'xdg-open';
    exec(`${openCmd} "${sqlEditorUrl}"`);

    console.log(`  Step 2: Paste the contents of:\n`);
    console.log(`    📄 ${migrationPath}\n`);
    console.log(`  Step 3: Click "Run"\n`);
    console.log(`  Step 4: Verify:\n`);
    console.log(`    node deploy-negative-signals.mjs test\n`);
    console.log(`${'─'.repeat(55)}`);
    console.log(`  URL: ${sqlEditorUrl}`);
    console.log(`${'─'.repeat(55)}\n`);
}
