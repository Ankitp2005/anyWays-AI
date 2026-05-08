import { createClient } from '@supabase/supabase-js';

// ============================================================
// Vite injects VITE_* variables at build time via import.meta.env
// These MUST be present in your .env file at project root:
//   VITE_SUPABASE_URL=https://<project-ref>.supabase.co
//   VITE_SUPABASE_ANON_KEY=<your-anon-key>
// ============================================================

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

if (!supabaseUrl || supabaseUrl.trim() === '') {
    throw new Error(
        '[supabaseClient] VITE_SUPABASE_URL is missing or empty.\n' +
        'Add it to your .env file: VITE_SUPABASE_URL=https://<project>.supabase.co'
    );
}

if (!supabaseAnonKey || supabaseAnonKey.trim() === '') {
    throw new Error(
        '[supabaseClient] VITE_SUPABASE_ANON_KEY is missing or empty.\n' +
        'Add it to your .env file: VITE_SUPABASE_ANON_KEY=<your-anon-key>'
    );
}

// Single shared Supabase client — import this everywhere, never call createClient() again.
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
        persistSession: true,      // Persists the JWT in localStorage across page reloads
        autoRefreshToken: true,    // Silently refreshes expired JWTs before they expire
        detectSessionInUrl: true,  // Handles OAuth / Magic Link callback tokens in the URL
    },
});
