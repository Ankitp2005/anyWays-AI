/**
 * deploy-score-decay.mjs
 * ──────────────────────
 * Step 1: Opens the Supabase SQL Editor URL for you to paste the migration
 * Step 2: Tests if the decay function is working
 *
 * Usage: node deploy-score-decay.mjs
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { exec } from 'child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));

// ── Load env ────────────────────────────────────────────────────────
const envFile = readFileSync(resolve(__dirname, '.env'), 'utf-8');
const env = {};
envFile.split('\n').forEach(line => {
    const match = line.trim().match(/^([^=]+)=["']?(.+?)["']?\s*$/);
    if (match) env[match[1]] = match[2];
});

const SUPABASE_URL = env.VITE_SUPABASE_URL;
const SERVICE_KEY  = env.VITE_SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_KEY) {
    console.error('❌ Missing VITE_SUPABASE_URL or VITE_SUPABASE_SERVICE_ROLE_KEY in .env');
    process.exit(1);
}

// Extract project ref from URL (e.g. "zqkwjitdydbsorovhazw" from "https://zqkwjitdydbsorovhazw.supabase.co")
const projectRef = SUPABASE_URL.replace('https://', '').split('.')[0];
const sqlEditorUrl = `https://supabase.com/dashboard/project/${projectRef}/sql/new`;

const migrationPath = resolve(__dirname, 'supabase/migrations/20260502170000_score_decay.sql');

const mode = process.argv[2]; // "apply" or "test"

if (mode === 'test') {
    // ── TEST MODE: Check if the function exists and works ───────────
    console.log('\n🧪 Testing run_score_decay()...\n');

    const supabase = createClient(SUPABASE_URL, SERVICE_KEY);
    const { data, error } = await supabase.rpc('run_score_decay');

    if (error) {
        console.log(`❌ Function not found or errored: ${error.message}`);
        console.log(`\n👉 You need to apply the migration first:`);
        console.log(`   node deploy-score-decay.mjs apply\n`);
    } else {
        console.log(`✅ Score decay is working!\n`);
        console.log(`   Decayed places: ${data.decayed_count}`);
        console.log(`   Executed at:    ${data.executed_at}`);
        if (data.details && data.details.length > 0) {
            console.log(`\n   Details:`);
            data.details.forEach(d => {
                console.log(`     • ${d.place_id}: ${d.old_score} → ${d.new_score} (idle ${d.hours_idle}h)`);
            });
        } else {
            console.log(`   No places needed decay right now.`);
        }
        console.log();
    }
} else {
    // ── APPLY MODE: Show instructions + open browser ────────────────
    console.log(`\n${'═'.repeat(55)}`);
    console.log(`  🚀 SCORE DECAY DEPLOYMENT`);
    console.log(`${'═'.repeat(55)}\n`);

    console.log(`  Step 1: Opening Supabase SQL Editor in your browser...\n`);

    // Open the SQL editor in default browser
    const openCmd = process.platform === 'win32' ? 'start' :
                    process.platform === 'darwin' ? 'open' : 'xdg-open';
    exec(`${openCmd} "${sqlEditorUrl}"`);

    console.log(`  Step 2: Paste the following SQL file contents:\n`);
    console.log(`    📄 ${migrationPath}\n`);
    console.log(`  Step 3: Click "Run" in the SQL Editor\n`);
    console.log(`  Step 4: Verify by running:\n`);
    console.log(`    node deploy-score-decay.mjs test\n`);
    console.log(`${'─'.repeat(55)}`);
    console.log(`  SQL Editor URL (if browser didn't open):`);
    console.log(`  ${sqlEditorUrl}`);
    console.log(`${'─'.repeat(55)}\n`);
}
