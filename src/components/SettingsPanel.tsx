import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { User, Mail, Moon, Sun, Shield, Save, Loader2, CreditCard, Zap, TrendingUp } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../services/api';

export const SettingsPanel: React.FC = () => {
    const { user } = useAuth();
    const { theme, toggleTheme } = useTheme();
    const [saving, setSaving] = useState(false);
    
    const [usageStats, setUsageStats] = useState({ used: 0, limit: 100000 });
    const [loadingUsage, setLoadingUsage] = useState(true);

    useEffect(() => {
        const fetchUsage = async () => {
            try {
                const stats = await api.apiKeys.getMonthlyUsage();
                setUsageStats(stats);
            } catch (error) {
                console.error('Failed to load usage', error);
            } finally {
                setLoadingUsage(false);
            }
        };
        fetchUsage();
    }, []);

    const displayName = user?.user_metadata?.name || user?.email?.split('@')[0] || 'User';
    const email = user?.email || '';

    const handleSaveProfile = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        // Simulate a save action since Supabase auth profile updates might require more setup
        setTimeout(() => {
            setSaving(false);
            toast.success('Profile updated successfully');
        }, 1000);
    };

    return (
        <div className="max-w-4xl space-y-8 animate-in fade-in h-[calc(100vh-100px)] overflow-y-auto pr-4 scrollbar-thin">
            <div>
                <h1 className="text-3xl font-black uppercase tracking-tight text-[#ffedd7] mb-2">Platform Settings</h1>
                <p className="text-xs text-[#6c5f51]">Manage your account preferences and platform configuration.</p>
            </div>

            <div className="grid gap-8 md:grid-cols-3">
                {/* Profile Section */}
                <div className="md:col-span-2 space-y-6">
                    <div className="bg-[#100904] border border-[#40372e] border-dashed rounded-xl overflow-hidden">
                        <div className="border-b border-[#40372e] border-dashed px-6 py-4 flex items-center gap-2">
                            <User size={18} className="text-[#dc5000]" />
                            <h2 className="font-bold text-sm uppercase tracking-wider text-[#ffedd7]">Profile Information</h2>
                        </div>
                        <div className="p-6">
                            <form onSubmit={handleSaveProfile} className="space-y-4">
                                <div className="flex items-center gap-4 mb-6">
                                    <div className="h-16 w-16 rounded-full border border-[#ffedd7]/20 flex items-center justify-center text-[#ffedd7] font-bold text-xl bg-transparent">
                                        {displayName.charAt(0).toUpperCase()}
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-base text-[#ffedd7] uppercase tracking-wider">{displayName}</h3>
                                        <p className="text-xs text-[#6c5f51]">Manage your personal details</p>
                                    </div>
                                </div>

                                <div className="grid gap-4 sm:grid-cols-2">
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-mono text-[#6c5f51] uppercase tracking-wider">Display Name</label>
                                        <input
                                            type="text"
                                            defaultValue={displayName}
                                            className="w-full bg-transparent border-b border-[#ffedd7] rounded-none px-3 py-2 text-sm text-[#ffedd7] focus:outline-none focus:border-[#dc5000] placeholder-[#ffedd7]/40"
                                            disabled // Disabled for now since it's from Google
                                            title="Name is managed by Google Auth"
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-mono text-[#6c5f51] uppercase tracking-wider flex items-center gap-2">
                                            Email Address <Shield size={12} className="text-[#ffedd7]" />
                                        </label>
                                        <div className="relative">
                                            <Mail size={16} className="absolute left-3 top-3 text-[#6c5f51]" />
                                            <input
                                                type="email"
                                                value={email}
                                                disabled
                                                className="w-full bg-transparent border-b border-[#40372e] rounded-none pl-9 pr-3 py-2 text-sm text-[#6c5f51] cursor-not-allowed"
                                            />
                                        </div>
                                        <p className="text-[10px] font-mono text-[#6c5f51] mt-1">Email is managed by Google Auth.</p>
                                    </div>
                                </div>

                                <div className="pt-4 flex justify-end">
                                    <button
                                        type="submit"
                                        disabled={saving}
                                        className="bg-[#382416] text-[#ffedd7] px-5 py-2 rounded-[36px] border border-[#ffedd7]/10 hover:border-[#ffedd7]/30 transition-all font-bold text-xs flex items-center gap-2 cursor-pointer"
                                    >
                                        {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                                        Save Changes
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>

                    {/* Billing & Usage Section */}
                    <div className="bg-[#100904] border border-[#40372e] border-dashed rounded-xl overflow-hidden">
                        <div className="border-b border-[#40372e] border-dashed px-6 py-4 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <CreditCard size={18} className="text-[#dc5000]" />
                                <h2 className="font-bold text-sm uppercase tracking-wider text-[#ffedd7]">Subscription & API Usage</h2>
                            </div>
                            <span className="border border-[#ffedd7]/20 text-[#ffedd7] px-2.5 py-0.5 rounded-[22.5px] text-[10px] font-mono font-bold uppercase tracking-wider bg-transparent">
                                Growth Plan
                            </span>
                        </div>
                        <div className="p-6">
                            <div className="mb-6">
                                <div className="flex justify-between items-end mb-2">
                                    <div>
                                        <h3 className="text-xs font-mono text-[#6c5f51] uppercase tracking-wider">Monthly API Requests</h3>
                                        <p className="text-[10px] font-mono text-[#6c5f51]">Reset on June 1, 2026</p>
                                    </div>
                                    <div className="text-right">
                                        <span className="text-lg font-black font-mono text-[#ffedd7]">
                                            {loadingUsage ? '...' : usageStats.used.toLocaleString()}
                                        </span>
                                        <span className="text-xs font-mono text-[#6c5f51]">
                                            {' '} / {usageStats.limit.toLocaleString()}
                                        </span>
                                    </div>
                                </div>
                                <div className="h-1.5 w-full bg-[#40372e] rounded-full overflow-hidden">
                                    <div 
                                        className="h-full bg-[#ffedd7] rounded-full transition-all duration-1000"
                                        style={{ width: `${Math.min(100, (usageStats.used / usageStats.limit) * 100)}%` }}
                                    ></div>
                                </div>
                                <p className="text-[10px] font-mono text-[#6c5f51] mt-3 flex items-center gap-1.5">
                                    <Zap size={14} className="text-[#ffedd7]" />
                                    You are using {loadingUsage ? '...' : ((usageStats.used / usageStats.limit) * 100).toFixed(2)}% of your available API quota.
                                </p>
                            </div>

                            <div className="flex gap-3 pt-4 border-t border-[#40372e] border-dashed">
                                <button className="px-5 py-2 bg-[#382416] text-[#ffedd7] border border-[#ffedd7]/10 hover:border-[#ffedd7]/30 rounded-[36px] text-xs font-bold transition-all flex items-center gap-2 cursor-pointer">
                                    <TrendingUp size={16} />
                                    Upgrade to Enterprise
                                </button>
                                <button className="px-4 py-2 border border-[#ffedd7] rounded-[22.5px] text-xs font-bold hover:border-[#dc5000] transition-colors bg-transparent text-[#ffedd7] cursor-pointer">
                                    View Invoices
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Preferences Section */}
                <div className="space-y-6">
                    <div className="bg-[#100904] border border-[#40372e] border-dashed rounded-xl overflow-hidden">
                        <div className="border-b border-[#40372e] border-dashed px-6 py-4">
                            <h2 className="font-bold text-sm uppercase tracking-wider text-[#ffedd7]">Preferences</h2>
                        </div>
                        <div className="p-6 space-y-6">
                            <div>
                                <h3 className="text-xs font-mono text-[#6c5f51] uppercase tracking-wider mb-3">Appearance</h3>
                                <div className="flex items-center justify-between p-3 border border-[#40372e] border-dashed rounded-xl bg-transparent">
                                    <div className="flex items-center gap-3">
                                        {theme === 'dark' ? <Moon size={18} className="text-[#ffedd7]" /> : <Sun size={18} className="text-[#ffedd7]" />}
                                        <div>
                                            <p className="text-xs font-bold text-[#ffedd7] uppercase tracking-wider">Theme</p>
                                            <p className="text-[10px] font-mono text-[#6c5f51] capitalize">{theme} Mode</p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={toggleTheme}
                                        className="px-4 py-1.5 border border-[#ffedd7] rounded-[22.5px] text-xs font-bold hover:border-[#dc5000] transition-colors bg-transparent text-[#ffedd7] cursor-pointer"
                                    >
                                        Toggle
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
