import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { supabase } from '../lib/supabaseClient';

export const Login: React.FC = () => {
    const { setView } = useApp();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleGoogleLogin = async () => {
        setLoading(true);
        setError(null);
        try {
            const { error } = await supabase.auth.signInWithOAuth({
                provider: 'google',
            });
            if (error) throw error;
        } catch (err: any) {
            setError(err.message ?? 'Google login failed.');
            setLoading(false);
        }
    };

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
        <div className="flex flex-col items-center justify-center min-h-screen bg-[#040506] text-[#ffffff] p-4 selection:bg-[#ff6363]/30 font-sans">
            <div className="w-full max-w-md bg-[#07080a] border border-[#363739] rounded-[11px] p-8 relative shadow-subtle-4">
                <button 
                    onClick={() => setView('marketing' as any)}
                    className="absolute top-4 left-4 p-2 text-[#9c9c9d] hover:text-[#ffffff] hover:bg-[#1b1c1e] transition-all rounded-full cursor-pointer"
                    title="Back to Home"
                >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                    </svg>
                </button>
                <h2 className="text-2xl font-black mb-6 text-center text-[#ffffff] tracking-tight uppercase">Welcome Back</h2>

                {error && (
                    <div className="mb-4 p-3 bg-[#452324] border border-[#ff6363]/40 text-[#ff6363] rounded-[8px] text-xs font-mono" role="alert">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                        <label className="block text-xs font-mono tracking-wider text-[#9c9c9d] mb-1.5 uppercase">
                            Email
                        </label>
                        <input
                            id="login-email"
                            type="email"
                            required
                            autoComplete="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full bg-white/5 border border-white/5 text-white placeholder-[#9c9c9d]/40 rounded-[8px] py-2 px-3 focus:border-[#454647] focus:outline-none transition-all text-sm"
                            placeholder="you@example.com"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-mono tracking-wider text-[#9c9c9d] mb-1.5 uppercase">
                            Password
                        </label>
                        <input
                            id="login-password"
                            type="password"
                            required
                            autoComplete="current-password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full bg-white/5 border border-white/5 text-white placeholder-[#9c9c9d]/40 rounded-[8px] py-2 px-3 focus:border-[#454647] focus:outline-none transition-all text-sm"
                            placeholder="••••••••"
                        />
                    </div>
                    <button
                        id="login-submit"
                        type="submit"
                        disabled={loading}
                        className="w-full py-2.5 px-4 bg-[#e6e6e6] text-[#2f3031] font-semibold rounded-[8px] transition-all disabled:opacity-50 text-sm hover:opacity-90 cursor-pointer"
                    >
                        {loading ? 'Logging in...' : 'Login'}
                    </button>
                </form>

                <div className="mt-6 flex items-center justify-center">
                    <div className="w-full border-t border-[#363739]"></div>
                    <span className="px-3 text-xs text-[#6a6b6c] font-mono bg-[#07080a]">OR</span>
                    <div className="w-full border-t border-[#363739]"></div>
                </div>

                <button
                    type="button"
                    onClick={handleGoogleLogin}
                    disabled={loading}
                    className="mt-6 w-full flex items-center justify-center gap-2 py-2.5 px-4 border border-[#454647] rounded-[8px] hover:border-white/20 bg-transparent text-[#e6e6e6] font-semibold transition-all disabled:opacity-50 text-sm cursor-pointer"
                >
                    <svg className="w-5 h-5" viewBox="0 0 24 24">
                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                    </svg>
                    Continue with Google
                </button>

                <div className="mt-6 text-center text-xs text-[#6a6b6c]">
                    Don't have an account?{' '}
                    <button
                        onClick={() => setView('register' as any)}
                        className="text-[#ffffff] hover:text-[#ff6363] font-bold underline decoration-[#ff6363] transition-all cursor-pointer bg-transparent border-none p-0"
                    >
                        Sign up
                    </button>
                </div>
            </div>
        </div>
    );
};
