import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const env = fs.readFileSync('.env', 'utf-8');
const url = env.match(/VITE_SUPABASE_URL=(.*)/)[1].replace(/['"\s]/g, '');
const key = env.match(/VITE_SUPABASE_SERVICE_ROLE_KEY=(.*)/)[1].replace(/['"\s]/g, '');

const s = createClient(url, key);

async function run() {
    // 1. Insert ideal historical data for the past 7 days
    const pastMetrics = [];
    for (let i = 2; i <= 8; i++) {
        const d = new Date(new Date('2026-05-05').getTime() - i * 86400000);
        pastMetrics.push({
            metric_date: d.toISOString().split('T')[0],
            total_predictions: 100,
            total_success: 95,
            total_failures: 5,
            accuracy: 0.95,
            precision: 0.96,
            recall: 0.94,
            avg_predicted_score: 0.90,
            avg_actual_success_rate: 0.95,
            calibration_error: 0.05,
            drift_score: 0.02,
            status: 'HEALTHY'
        });
    }

    const { error } = await s.from('model_performance_metrics').upsert(pastMetrics);
    if (error) console.error("Error inserting past metrics:", error);
    else console.log("✅ Seeded ideal historical data for the past 7 days");

    // 2. Re-trigger the analysis for the chaotic data
    console.log("🔄 Re-calculating Model Health Analysis...");
    await s.rpc('compute_daily_model_metrics');
    
    const { data } = await s.from('model_performance_metrics').select('metric_date, accuracy, drift_score, status').order('metric_date', { ascending: false }).limit(2);
    console.table(data);
    console.log("✅ Analysis Complete!");
}

run();
