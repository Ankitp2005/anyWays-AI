import React, { useState, useEffect } from 'react';
import { Key, Plus, Copy, Trash2, Check, ShieldAlert } from 'lucide-react';
import { StorageService } from '../services/storage';
import type { ApiKey } from '../models/types';
import { cn } from '../utils/cn';

export const ApiKeysManagement: React.FC = () => {
    const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
    const [copiedId, setCopiedId] = useState<string | null>(null);
    const [isGenerating, setIsGenerating] = useState(false);

    useEffect(() => {
        setApiKeys(StorageService.getApiKeys());
    }, []);

    const generateKey = () => {
        setIsGenerating(true);
        // Simulate API call
        setTimeout(() => {
            const newKey: ApiKey = {
                id: crypto.randomUUID(),
                name: `API Key ${apiKeys.length + 1}`,
                key: `sk_live_${Math.random().toString(36).substring(2, 15)}_${Math.random().toString(36).substring(2, 15)}`,
                status: 'ACTIVE',
                createdAt: new Date().toISOString(),
            };

            const updatedKeys = [...apiKeys, newKey];
            setApiKeys(updatedKeys);
            StorageService.saveApiKeys(updatedKeys);
            setIsGenerating(false);
        }, 600);
    };

    const revokeKey = (id: string) => {
        const updatedKeys = apiKeys.map(key =>
            key.id === id ? { ...key, status: 'REVOKED' as const } : key
        );
        setApiKeys(updatedKeys);
        StorageService.saveApiKeys(updatedKeys);
    };

    const deleteKey = (id: string) => {
        if (confirm('Are you sure you want to delete this API key? This action cannot be undone.')) {
            const updatedKeys = apiKeys.filter(key => key.id !== id);
            setApiKeys(updatedKeys);
            StorageService.saveApiKeys(updatedKeys);
        }
    };

    const copyToClipboard = (text: string, id: string) => {
        navigator.clipboard.writeText(text);
        setCopiedId(id);
        setTimeout(() => setCopiedId(null), 2000);
    };

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
                    <button
                        onClick={generateKey}
                        className="text-primary hover:underline text-sm font-medium"
                    >
                        Generate your first key
                    </button>
                </div>
            ) : (
                <div className="space-y-4">
                    {apiKeys.map((apiKey) => (
                        <div
                            key={apiKey.id}
                            className={cn(
                                "bg-card border rounded-lg p-5 transition-all",
                                apiKey.status === 'REVOKED' ? "border-red-200 bg-red-50/50 dark:bg-red-900/10 dark:border-red-900/30 opacity-75" : "border-border shadow-sm"
                            )}
                        >
                            <div className="flex items-start justify-between mb-4">
                                <div className="flex items-center gap-3">
                                    <div className={cn(
                                        "p-2 rounded-md",
                                        apiKey.status === 'REVOKED' ? "bg-red-100 text-red-600 dark:bg-red-900/30" : "bg-primary/10 text-primary"
                                    )}>
                                        <Key size={20} />
                                    </div>
                                    <div>
                                        <h3 className="font-medium flex items-center gap-2">
                                            {apiKey.name}
                                            {apiKey.status === 'REVOKED' && (
                                                <span className="text-[10px] uppercase font-bold tracking-wider text-red-600 bg-red-100 dark:bg-red-900/30 dark:text-red-400 px-1.5 py-0.5 rounded-sm">
                                                    Revoked
                                                </span>
                                            )}
                                        </h3>
                                        <p className="text-xs text-muted-foreground">
                                            Created {new Date(apiKey.createdAt).toLocaleDateString()}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    {apiKey.status === 'ACTIVE' && (
                                        <button
                                            onClick={() => revokeKey(apiKey.id)}
                                            className="text-xs text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 px-2 py-1 rounded"
                                        >
                                            Revoke
                                        </button>
                                    )}
                                    <button
                                        onClick={() => deleteKey(apiKey.id)}
                                        className="p-1.5 text-muted-foreground hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
                                        title="Delete Key"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            </div>

                            <div className="flex items-center gap-3">
                                <code className={cn(
                                    "flex-1 bg-secondary/50 px-3 py-2 rounded-md font-mono text-sm border border-transparent",
                                    apiKey.status === 'REVOKED' && "line-through text-muted-foreground decoration-red-400"
                                )}>
                                    {apiKey.key}
                                </code>
                                <button
                                    onClick={() => copyToClipboard(apiKey.key, apiKey.id)}
                                    className="flex items-center gap-1.5 px-3 py-2 bg-secondary hover:bg-secondary/80 text-foreground text-xs font-medium rounded-md transition-colors min-w-[80px] justify-center"
                                >
                                    {copiedId === apiKey.id ? (
                                        <>
                                            <Check size={14} className="text-green-600" />
                                            <span>Copied</span>
                                        </>
                                    ) : (
                                        <>
                                            <Copy size={14} />
                                            <span>Copy</span>
                                        </>
                                    )}
                                </button>
                            </div>

                            {apiKey.status === 'REVOKED' && (
                                <div className="mt-3 flex items-center gap-2 text-xs text-red-600 dark:text-red-400">
                                    <ShieldAlert size={14} />
                                    <span>This key has been revoked and can no longer be used for API requests.</span>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};
