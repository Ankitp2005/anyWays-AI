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
        return <div className="p-8 text-center text-muted-foreground animate-pulse">Loading API Keys...</div>;
    }

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight">API Keys</h2>
                    <p className="text-muted-foreground">Manage your secret keys for accessing the Place Intelligence SDK.</p>
                </div>
                <button
                    onClick={generateKey}
                    disabled={isGenerating}
                    className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-md font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors"
                >
                    {isGenerating ? (
                        <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                    ) : (
                        <Plus size={18} />
                    )}
                    Generate New Key
                </button>
            </div>

            {apiKeys.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-12 border-2 border-dashed border-border rounded-xl bg-card/50 text-center">
                    <div className="bg-secondary p-4 rounded-full mb-4">
                        <Key size={32} className="text-muted-foreground" />
                    </div>
                    <h3 className="text-lg font-medium mb-1">No API Keys Found</h3>
                    <p className="text-sm text-muted-foreground max-w-sm mb-6">
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
                            <div key={apiKey.id} className={cn("bg-card border rounded-lg p-5 transition-all shadow-sm", isNew ? "border-green-500 ring-1 ring-green-500" : "border-border")}>
                                <div className="flex items-start justify-between mb-4">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 rounded-md bg-primary/10 text-primary">
                                            <Key size={20} />
                                        </div>
                                        <div>
                                            <h3 className="font-medium flex items-center gap-2 text-foreground">
                                                {apiKey.name}
                                                {isNew && <span className="px-2 py-0.5 text-[10px] bg-green-100 text-green-700 rounded-full font-bold">NEW</span>}
                                            </h3>
                                            <p className="text-xs text-muted-foreground">
                                                Created {new Date(apiKey.created_at).toLocaleDateString()}
                                            </p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => revokeKey(apiKey.id)}
                                        className="text-xs text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 px-3 py-1.5 rounded transition-colors"
                                    >
                                        Revoke
                                    </button>
                                </div>

                                <div className="flex items-center gap-3">
                                    <code className={cn("flex-1 px-3 py-2 rounded-md font-mono text-sm border", isNew ? "bg-green-50/50 border-green-200 text-green-900" : "bg-secondary/50 border-transparent text-foreground")}>
                                        {displayKey}
                                    </code>
                                    <button
                                        onClick={() => isNew ? copyToClipboard(newlyGeneratedKey!.rawKey, apiKey.id) : null}
                                        disabled={!isNew}
                                        className={cn(
                                            "flex items-center gap-1.5 px-3 py-2 bg-secondary text-xs font-medium rounded-md min-w-[80px] justify-center transition-colors",
                                            isNew ? "hover:bg-secondary/80 text-foreground cursor-pointer" : "opacity-50 cursor-not-allowed text-muted-foreground"
                                        )}
                                    >
                                        {copiedId === apiKey.id ? (
                                            <><Check size={14} className="text-green-600" /><span>Copied</span></>
                                        ) : (
                                            <><Copy size={14} /><span>Copy</span></>
                                        )}
                                    </button>
                                </div>

                                {!isNew && (
                                    <p className="text-[11px] text-muted-foreground mt-2">
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
