import React, { useState, useEffect } from 'react';
import { Key, Plus, Copy, Check } from 'lucide-react';
import { cn } from '../utils/cn';
import toast from 'react-hot-toast';
import api from '../services/api';

export const ApiKeysManagement: React.FC = () => {
    const [apiKeys, setApiKeys] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [isGenerating, setIsGenerating] = useState(false);
    const [copiedId, setCopiedId] = useState<string | null>(null);

    // One-time unhashed key to show the user exactly once
    const [newlyGeneratedKey, setNewlyGeneratedKey] = useState<{id: string, rawKey: string} | null>(null);

    useEffect(() => {
        fetchKeys();
    }, []);

    const fetchKeys = async () => {
        setLoading(true);
        try {
            const data = await api.apiKeys.getApiKeys();
            setApiKeys(data);
        } catch (err) {
            toast.error('Failed to load API keys');
        } finally {
            setLoading(false);
        }
    };

    const generateKey = async () => {
        setIsGenerating(true);
        try {
            const name = `API Key ${apiKeys.length + 1}`;
            const { record, rawKey } = await api.apiKeys.generateApiKey(name);

            // rawKey is shown ONCE here — never retrievable again after this point
            setNewlyGeneratedKey({ id: record.id, rawKey });
            setApiKeys(prev => [record, ...prev]);
            toast.success('API Key generated! Copy it now — it will not be shown again.');
        } catch (err: any) {
            toast.error(err.message ?? 'Failed to generate API key');
        } finally {
            setIsGenerating(false);
        }
    };

    const revokeKey = async (id: string) => {
        if (!window.confirm('Revoke this API key? This cannot be undone.')) return;
        try {
            await api.apiKeys.revokeApiKey(id);
            // Clear the one-time display if the revoked key was the newly generated one
            if (newlyGeneratedKey?.id === id) setNewlyGeneratedKey(null);
            setApiKeys(prev => prev.filter(k => k.id !== id));
            toast.success('API Key revoked');
        } catch (err: any) {
            toast.error(err.message ?? 'Failed to revoke key');
        }
    };

    const copyToClipboard = (text: string, id: string) => {
        navigator.clipboard.writeText(text);
        setCopiedId(id);
        setTimeout(() => setCopiedId(null), 2000);
    };

    if (loading) {
        return <div className="p-8 text-center text-[#6a6b6c] font-mono animate-pulse">Loading API Keys...</div>;
    }

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-semibold tracking-tight text-[#ffffff]">API Keys</h2>
                    <p className="text-xs text-[#6a6b6c]">Manage your secret keys for accessing the Place Intelligence SDK.</p>
                </div>
                <button
                    onClick={generateKey}
                    disabled={isGenerating}
                    className="flex items-center gap-2 bg-[#e6e6e6] text-[#2f3031] px-4 py-1.5 rounded-[8px] hover:opacity-90 transition-all font-bold text-xs disabled:opacity-50 cursor-pointer shadow-subtle font-sans"
                >
                    {isGenerating ? (
                        <span className="w-4 h-4 border-2 border-[#2f3031] border-t-transparent rounded-full animate-spin" />
                    ) : (
                        <Plus size={18} />
                    )}
                    Generate New Key
                </button>
            </div>

            {apiKeys.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-12 border border-[#363739] rounded-[11px] bg-[#07080a] text-center shadow-subtle-4">
                    <div className="border border-white/5 p-4 rounded-full mb-4 bg-[#1b1c1e] text-white shadow-subtle-2">
                        <Key size={32} />
                    </div>
                    <h3 className="text-sm font-semibold uppercase tracking-wider mb-1 text-white">No API Keys Found</h3>
                    <p className="text-xs text-[#6a6b6c] max-w-sm mb-6">
                        You haven't generated any API keys yet. Create one to start integrating with our SDK.
                    </p>
                </div>
            ) : (
                <div className="space-y-4">
                    {apiKeys.map((apiKey) => {
                        // Is this the one we JUST generated?
                        const isNew = newlyGeneratedKey?.id === apiKey.id;
                        const displayKey = isNew ? newlyGeneratedKey!.rawKey : '••••••••••••••••••••••••••••••••';

                        return (
                            <div key={apiKey.id} className={cn("bg-[#07080a] border rounded-[11px] p-5 transition-all shadow-subtle-4", isNew ? "border-[#ff6363] ring-1 ring-[#ff6363]/50" : "border-[#363739]")}>
                                <div className="flex items-start justify-between mb-4">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 rounded-[8px] border border-white/5 text-[#ffffff] bg-[#1b1c1e] shadow-subtle-2">
                                            <Key size={20} />
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-sm uppercase tracking-wider flex items-center gap-2 text-[#ffffff]">
                                                {apiKey.name}
                                                {isNew && <span className="px-2 py-0.5 text-[10px] bg-[#ff6363] text-white rounded-[6px] font-mono font-medium shadow-subtle-2">NEW</span>}
                                            </h3>
                                            <p className="text-[10px] font-mono text-[#6a6b6c]">
                                                Created {new Date(apiKey.created_at).toLocaleDateString()}
                                            </p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => revokeKey(apiKey.id)}
                                        className="text-xs text-[#ff6363] hover:text-[#ff6363]/80 border border-[#ff6363]/30 hover:border-[#ff6363]/50 rounded-[8px] px-3 py-1.5 transition-all bg-transparent cursor-pointer font-sans"
                                    >
                                        Revoke
                                    </button>
                                </div>

                                <div className="flex items-center gap-3">
                                    <code className={cn("flex-1 px-3 py-2 rounded-[8px] font-mono text-sm border bg-[#111214] shadow-subtle-2", isNew ? "border-[#ff6363] text-[#ff6363]" : "border-white/5 text-[#ffffff]")}>
                                        {displayKey}
                                    </code>
                                    <button
                                        onClick={() => isNew ? copyToClipboard(newlyGeneratedKey!.rawKey, apiKey.id) : null}
                                        disabled={!isNew}
                                        className={cn(
                                            "flex items-center gap-1.5 px-4 py-2 border text-xs font-bold rounded-[8px] min-w-[80px] justify-center transition-all bg-transparent",
                                            isNew ? "border-[#454647] text-[#9c9c9d] hover:border-white/40 hover:text-white cursor-pointer" : "border-white/5 text-[#6a6b6c] opacity-50 cursor-not-allowed"
                                        )}
                                    >
                                        {copiedId === apiKey.id ? (
                                            <><Check size={14} className="text-[#59d499]" /><span>Copied</span></>
                                        ) : (
                                            <><Copy size={14} /><span>Copy</span></>
                                        )}
                                    </button>
                                </div>

                                {!isNew && (
                                    <p className="text-[10px] font-mono text-[#6a6b6c] mt-2">
                                        For security reasons, your API key is hidden. If you lost it, please revoke this key and generate a new one.
                                    </p>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};
