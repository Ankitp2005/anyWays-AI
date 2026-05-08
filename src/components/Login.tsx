import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { supabase } from '../lib/supabaseClient';

export const Login: React.FC = () => {
    const { setView } = useApp();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            // 1. Check Rate Limit (5 attempts / 15 min)
            // We use the email as the identifier.
            const { data: limitData, error: limitError } = await supabase.rpc('check_login_rate_limit', {
                p_identifier: email
            });

            if (limitError) {
                console.error('Rate limit check failed:', limitError);
                // Fail open in dev, but in production you might want to block or log.
            } else if (!limitData.allowed) {
                throw new Error(`Too many login attempts. Please wait 15 minutes and try again.`);
            }

            // 2. Attempt Login
            const { data, error } = await supabase.auth.signInWithPassword({ email, password });

            if (error) throw error;

            if (data.session) {
                // Dashboard redirect handled by AuthContext
            }
        } catch (err: any) {
            setError(err.message ?? 'Login failed. Please check your credentials.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-neutral-50 dark:bg-neutral-900 p-4">
            <div className="w-full max-w-md bg-white dark:bg-neutral-800 rounded-lg shadow-xl p-8">
                <h2 className="text-2xl font-bold mb-6 text-center text-neutral-800 dark:text-white">Welcome Back</h2>

                {error && (
                    <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-lg text-sm" role="alert">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                            Email
                        </label>
                        <input
                            id="login-email"
                            type="email"
                            required
                            autoComplete="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full px-4 py-2 rounded-lg border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                            Password
                        </label>
                        <input
                            id="login-password"
                            type="password"
                            required
                            autoComplete="current-password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full px-4 py-2 rounded-lg border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                        />
                    </div>
                    <button
                        id="login-submit"
                        type="submit"
                        disabled={loading}
                        className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50"
                    >
                        {loading ? 'Logging in...' : 'Login'}
                    </button>
                </form>

                <div className="mt-6 text-center text-sm text-neutral-600 dark:text-neutral-400">
                    Don't have an account?{' '}
                    <button
                        onClick={() => setView('register' as any)}
                        className="text-blue-600 dark:text-blue-400 hover:underline"
                    >
                        Sign up
                    </button>
                </div>
            </div>
        </div>
    );
};
