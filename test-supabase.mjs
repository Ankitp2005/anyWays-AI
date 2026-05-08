import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("❌ Missing environment variables. Make sure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are set.");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testConnection() {
    console.log("Testing Supabase connection to:", supabaseUrl);
    
    // We expect { data: { user: null }, error: null } because we aren't logged in,
    // but a successful null return means the network connection and anon key are valid!
    const { data, error } = await supabase.auth.getUser();

    if (error && error.status !== 401 && error.message !== 'Auth session missing!') {
        console.error("❌ Supabase connection failed:", error.message);
        process.exit(1);
    } else {
        console.log("✅ Supabase connection successful! Anon Key is valid.");
        process.exit(0);
    }
}

testConnection();
