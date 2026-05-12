import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { supabase } from '../lib/supabaseClient';

export const Register: React.FC = () => {
    const { setView } = useApp();
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    // Supabase may require email confirmation before the user is fully logged in.
    const [confirmationSent, setConfirmationSent] = useState(false);

    const handleGoogleLogin = async () => {
        setLoading(true);
        setError(null);
        try {
            const { error } = await supabase.auth.signInWithOAuth({
                provider: 'google',
            });
            if (error) throw error;
        } catch (err: any) {
            setError(err.message ?? 'Google signup failed.');
            setLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            const { data, error } = await supabase.auth.signUp({
                email,
                password,
                options: {
                    data: { name }, // stored in auth.users.raw_user_meta_data
                },
            });

            if (error) throw error;

            if (data.session) {
                // Email confirmation is disabled — user is immediately logged in.
                // onAuthStateChange in AppContext fires and routes to dashboard.
            } else {
                // Email confirmation is enabled — session is null until user confirms.
                setConfirmationSent(true);
            }
        } catch (err: any) {
            setError(err.message ?? 'Registration failed. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    // --- Confirmation pending state ---
    if (confirmationSent) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-neutral-50 dark:bg-neutral-900 p-4">
                <div className="w-full max-w-md bg-white dark:bg-neutral-800 rounded-lg shadow-xl p-8 text-center">
                    <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                        <svg className="w-8 h-8 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                    </div>
                    <h2 className="text-2xl font-bold mb-2 text-neutral-800 dark:text-white">Check your email</h2>
                    <p className="text-neutral-600 dark:text-neutral-400 mb-6">
                        We sent a confirmation link to <strong>{email}</strong>. Click it to activate your account.
                    </p>
                    <button
                        onClick={() => setView('login' as any)}
                        className="text-blue-600 dark:text-blue-400 hover:underline text-sm"
                    >
                        Back to login
                    </button>
                </div>
            </div>
        );
    }

    // --- Registration form ---
    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-neutral-50 dark:bg-neutral-900 p-4">
            <div className="w-full max-w-md bg-white dark:bg-neutral-800 rounded-lg shadow-xl p-8 relative">
                <button 
                    onClick={() => setView('marketing' as any)}
                    className="absolute top-4 left-4 p-2 text-neutral-500 hover:text-neutral-800 dark:hover:text-white transition-colors rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-700"
                    title="Back to Home"
                >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                    </svg>
                </button>
                <h2 className="text-2xl font-bold mb-6 text-center text-neutral-800 dark:text-white">Create Account</h2>

                {error && (
                    <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-lg text-sm" role="alert">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                            Name
                        </label>
                        <input
                            id="register-name"
                            type="text"
                            required
                            autoComplete="name"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="w-full px-4 py-2 rounded-lg border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                            Email
                        </label>
                        <input
                            id="register-email"
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
                            id="register-password"
                            type="password"
                            required
                            autoComplete="new-password"
                            minLength={8}
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full px-4 py-2 rounded-lg border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                        />
                        <p className="text-xs text-neutral-500 mt-1">Min 8 chars, 1 uppercase, 1 number.</p>
                    </div>
                    <button
                        id="register-submit"
                        type="submit"
                        disabled={loading}
                        className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50"
                    >
                        {loading ? 'Creating Account...' : 'Sign Up'}
                    </button>
                </form>

                <div className="mt-4 flex items-center justify-center">
                    <div className="w-full border-t border-neutral-300 dark:border-neutral-600"></div>
                    <span className="px-3 text-sm text-neutral-500 bg-white dark:bg-neutral-800">OR</span>
                    <div className="w-full border-t border-neutral-300 dark:border-neutral-600"></div>
                </div>

                <button
                    type="button"
                    onClick={handleGoogleLogin}
                    disabled={loading}
                    className="mt-4 w-full flex items-center justify-center gap-2 py-3 px-4 border border-neutral-300 dark:border-neutral-600 rounded-lg hover:bg-neutral-50 dark:hover:bg-neutral-700 transition-colors disabled:opacity-50 text-neutral-700 dark:text-neutral-200 font-medium bg-white dark:bg-neutral-800"
                >
                    <svg className="w-5 h-5" viewBox="0 0 24 24">
                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                    </svg>
                    Continue with Google
                </button>

                <div className="mt-6 text-center text-sm text-neutral-600 dark:text-neutral-400">
                    Already have an account?{' '}
                    <button
                        onClick={() => setView('login' as any)}
                        className="text-blue-600 dark:text-blue-400 hover:underline"
                    >
                        Log in
                    </button>
                </div>
            </div>
        </div>
    );
};
