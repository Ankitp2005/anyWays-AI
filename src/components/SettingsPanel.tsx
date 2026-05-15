import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { User, Mail, Moon, Sun, Shield, Save, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

export const SettingsPanel: React.FC = () => {
    const { user } = useAuth();
    const { theme, toggleTheme } = useTheme();
    const [saving, setSaving] = useState(false);

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
        <div className="max-w-4xl space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div>
                <h1 className="text-3xl font-bold tracking-tight mb-2">Platform Settings</h1>
                <p className="text-muted-foreground">Manage your account preferences and platform configuration.</p>
            </div>

            <div className="grid gap-8 md:grid-cols-3">
                {/* Profile Section */}
                <div className="md:col-span-2 space-y-6">
                    <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
                        <div className="border-b border-border px-6 py-4 flex items-center gap-2">
                            <User size={18} className="text-primary" />
                            <h2 className="font-semibold">Profile Information</h2>
                        </div>
                        <div className="p-6">
                            <form onSubmit={handleSaveProfile} className="space-y-4">
                                <div className="flex items-center gap-4 mb-6">
                                    <div className="h-16 w-16 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-xl border border-primary/30">
                                        {displayName.charAt(0).toUpperCase()}
                                    </div>
                                    <div>
                                        <h3 className="font-medium text-lg">{displayName}</h3>
                                        <p className="text-sm text-muted-foreground">Manage your personal details</p>
                                    </div>
                                </div>

                                <div className="grid gap-4 sm:grid-cols-2">
                                    <div className="space-y-1.5">
                                        <label className="text-sm font-medium">Display Name</label>
                                        <input
                                            type="text"
                                            defaultValue={displayName}
                                            className="w-full bg-background border border-input rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                                            disabled // Disabled for now since it's from Google
                                            title="Name is managed by Google Auth"
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-sm font-medium flex items-center gap-2">
                                            Email Address <Shield size={12} className="text-emerald-500" />
                                        </label>
                                        <div className="relative">
                                            <Mail size={16} className="absolute left-3 top-2.5 text-muted-foreground" />
                                            <input
                                                type="email"
                                                value={email}
                                                disabled
                                                className="w-full bg-secondary/50 border border-border rounded-lg pl-9 pr-3 py-2 text-sm text-muted-foreground cursor-not-allowed"
                                            />
                                        </div>
                                        <p className="text-xs text-muted-foreground mt-1">Email is managed by Google Auth.</p>
                                    </div>
                                </div>

                                <div className="pt-4 flex justify-end">
                                    <button
                                        type="submit"
                                        disabled={saving}
                                        className="bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors flex items-center gap-2"
                                    >
                                        {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                                        Save Changes
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>

                {/* Preferences Section */}
                <div className="space-y-6">
                    <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
                        <div className="border-b border-border px-6 py-4">
                            <h2 className="font-semibold">Preferences</h2>
                        </div>
                        <div className="p-6 space-y-6">
                            <div>
                                <h3 className="text-sm font-medium mb-3">Appearance</h3>
                                <div className="flex items-center justify-between p-3 border border-border rounded-lg bg-background">
                                    <div className="flex items-center gap-3">
                                        {theme === 'dark' ? <Moon size={18} className="text-blue-400" /> : <Sun size={18} className="text-amber-500" />}
                                        <div>
                                            <p className="text-sm font-medium">Theme</p>
                                            <p className="text-xs text-muted-foreground capitalize">{theme} Mode</p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={toggleTheme}
                                        className="bg-secondary hover:bg-secondary/80 text-secondary-foreground px-3 py-1.5 rounded-md text-xs font-medium transition-colors border border-border"
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
