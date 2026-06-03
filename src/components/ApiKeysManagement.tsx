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
        return <div className="p-8 text-center text-[#6c5f51] font-mono animate-pulse">Loading API Keys...</div>;
    }

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-black uppercase tracking-tight text-[#ffedd7]">API Keys</h2>
                    <p className="text-xs text-[#6c5f51]">Manage your secret keys for accessing the Place Intelligence SDK.</p>
                </div>
                <button
                    onClick={generateKey}
                    disabled={isGenerating}
                    className="flex items-center gap-2 bg-[#382416] text-[#ffedd7] px-5 py-2 rounded-[36px] border border-[#ffedd7]/10 hover:border-[#ffedd7]/30 transition-all font-bold text-xs disabled:opacity-50 cursor-pointer"
                >
                    {isGenerating ? (
                        <span className="w-4 h-4 border-2 border-[#ffedd7] border-t-transparent rounded-full animate-spin" />
                    ) : (
                        <Plus size={18} />
                    )}
                    Generate New Key
                </button>
            </div>

            {apiKeys.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-12 border border-dashed border-[#40372e] rounded-xl bg-transparent text-center">
                    <div className="border border-[#ffedd7]/20 p-4 rounded-full mb-4 bg-transparent">
                        <Key size={32} className="text-[#ffedd7]" />
                    </div>
                    <h3 className="text-sm font-bold uppercase tracking-wider mb-1 text-[#ffedd7]">No API Keys Found</h3>
                    <p className="text-xs text-[#6c5f51] max-w-sm mb-6">
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
                            <div key={apiKey.id} className={cn("bg-[#100904] border border-dashed rounded-xl p-5 transition-all", isNew ? "border-[#dc5000] ring-1 ring-[#dc5000]/50" : "border-[#40372e]")}>
                                <div className="flex items-start justify-between mb-4">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 rounded-xl border border-[#ffedd7]/20 text-[#ffedd7] bg-transparent">
                                            <Key size={20} />
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-sm uppercase tracking-wider flex items-center gap-2 text-[#ffedd7]">
                                                {apiKey.name}
                                                {isNew && <span className="px-2 py-0.5 text-[10px] bg-[#dc5000] text-[#ffedd7] rounded-[22.5px] font-mono font-bold">NEW</span>}
                                            </h3>
                                            <p className="text-[10px] font-mono text-[#6c5f51]">
                                                Created {new Date(apiKey.created_at).toLocaleDateString()}
                                            </p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => revokeKey(apiKey.id)}
                                        className="text-xs text-[#dc5000] hover:text-[#dc5000]/80 border border-[#dc5000]/30 hover:border-[#dc5000]/50 rounded-[22.5px] px-3.5 py-1.5 transition-all bg-transparent cursor-pointer"
                                    >
                                        Revoke
                                    </button>
                                </div>

                                <div className="flex items-center gap-3">
                                    <code className={cn("flex-1 px-3 py-2 rounded-none font-mono text-sm border", isNew ? "bg-transparent border-[#dc5000] text-[#dc5000]" : "bg-transparent border-[#40372e] text-[#ffedd7]")}>
                                        {displayKey}
                                    </code>
                                    <button
                                        onClick={() => isNew ? copyToClipboard(newlyGeneratedKey!.rawKey, apiKey.id) : null}
                                        disabled={!isNew}
                                        className={cn(
                                            "flex items-center gap-1.5 px-4 py-2 border text-xs font-bold rounded-[22.5px] min-w-[80px] justify-center transition-all bg-transparent",
                                            isNew ? "border-[#ffedd7] text-[#ffedd7] hover:border-[#dc5000] cursor-pointer" : "border-[#40372e] text-[#6c5f51] opacity-50 cursor-not-allowed"
                                        )}
                                    >
                                        {copiedId === apiKey.id ? (
                                            <><Check size={14} className="text-[#ffedd7]" /><span>Copied</span></>
                                        ) : (
                                            <><Copy size={14} /><span>Copy</span></>
                                        )}
                                    </button>
                                </div>

                                {!isNew && (
                                    <p className="text-[10px] font-mono text-[#6c5f51] mt-2">
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
