import React from 'react';
import type { Place } from '../models/types';
import { ArrowLeft, CheckCircle2, AlertTriangle, Terminal, Copy } from 'lucide-react';
import { cn } from '../utils/cn';

interface PlaceDetailsProps {
    place: Place;
    onBack: () => void;
}

export const PlaceDetails: React.FC<PlaceDetailsProps> = ({ place, onBack }) => {
    const jsonSnippet = JSON.stringify({
        place_id: place.id,
        name: place.name,
        status: place.status,
        confidence: place.confidenceScore,
        last_verified: place.lastVerified,
        signals_count: place.signals.length
    }, null, 2);

    return (
        <div className="animate-in slide-in-from-right-4 duration-300">
            <button
                onClick={onBack}
                className="mb-6 flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
                <ArrowLeft size={16} />
                Back to Places
            </button>

            <div className="flex items-start justify-between mb-8">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight mb-2">{place.name}</h1>
                    <div className="flex items-center gap-3 text-sm text-muted-foreground">
                        <span className="font-mono bg-secondary px-1.5 rounded text-xs">{place.id}</span>
                        <span>{place.address}</span>
                    </div>
                </div>
                <div className="flex gap-3">
                    <button className="px-4 py-2 border border-border rounded-md text-sm font-medium hover:bg-secondary">
                        Request Re-verify
                    </button>
                    <button className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:bg-primary/90">
                        Edit Metadata
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Main Info */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Status Card */}
                    <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
                        <h3 className="font-semibold mb-4">Verification Status</h3>
                        <div className="flex items-center gap-6">
                            <div className="flex items-center gap-2">
                                <div className={cn(
                                    "p-2 rounded-full",
                                    place.status === 'OPEN' ? "bg-green-100 text-green-600" : "bg-red-100 text-red-600"
                                )}>
                                    {place.status === 'OPEN' ? <CheckCircle2 size={24} /> : <AlertTriangle size={24} />}
                                </div>
                                <div>
                                    <p className="text-sm font-medium">Operational Status</p>
                                    <p className="text-lg font-bold">{place.status}</p>
                                </div>
                            </div>
                            <div className="h-10 w-px bg-border" />
                            <div>
                                <p className="text-sm font-medium text-muted-foreground mb-1">Confidence Score</p>
                                <div className="flex items-center gap-2">
                                    <div className="h-2 w-24 bg-secondary rounded-full overflow-hidden">
                                        <div
                                            className={cn("h-full rounded-full", place.confidenceScore > 0.8 ? "bg-green-500" : "bg-orange-500")}
                                            style={{ width: `${place.confidenceScore * 100}%` }}
                                        />
                                    </div>
                                    <span className="font-mono font-bold">{Math.round(place.confidenceScore * 100)}%</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Signals Timeline */}
                    <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
                        <h3 className="font-semibold mb-6">Validation Signals</h3>
                        <div className="relative border-l border-border ml-3 space-y-8">
                            {place.signals.map((signal, idx) => (
                                <div key={idx} className="relative pl-8">
                                    <div className="absolute -left-1.5 top-1.5 h-3 w-3 rounded-full bg-primary ring-4 ring-background" />
                                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 mb-1">
                                        <span className="font-bold text-sm">{signal.type.replace('_', ' ')}</span>
                                        <span className="text-xs text-muted-foreground font-mono">
                                            {new Date(signal.timestamp).toLocaleString()}
                                        </span>
                                    </div>
                                    <p className="text-sm text-muted-foreground">
                                        Source: <span className="font-medium text-foreground">{signal.source}</span>
                                        <span className="mx-2">•</span>
                                        Confidence: {(signal.confidence * 100).toFixed(0)}%
                                    </p>
                                </div>
                            ))}
                            {place.signals.length === 0 && (
                                <p className="pl-8 text-sm text-muted-foreground italic">No signals recorded recently.</p>
                            )}
                        </div>
                    </div>
                </div>

                {/* API Sidebar */}
                <div className="space-y-6">
                    <div className="bg-zinc-950 text-zinc-50 rounded-xl overflow-hidden border border-zinc-800 shadow-md">
                        <div className="px-4 py-3 bg-zinc-900 border-b border-zinc-800 flex items-center justify-between">
                            <div className="flex items-center gap-2 text-xs font-medium text-zinc-400">
                                <Terminal size={12} />
                                <span>API Response Preview</span>
                            </div>
                            <Copy size={12} className="text-zinc-500 hover:text-zinc-300 cursor-pointer" />
                        </div>
                        <div className="p-4 overflow-x-auto">
                            <pre className="text-xs font-mono leading-relaxed text-zinc-300">
                                {jsonSnippet}
                            </pre>
                        </div>
                    </div>

                    <div className="bg-card border border-border rounded-xl p-5 shadow-sm">
                        <h3 className="font-semibold mb-3 text-sm">Metadata</h3>
                        <dl className="space-y-2 text-sm">
                            <div className="flex justify-between py-1 border-b border-border/50">
                                <dt className="text-muted-foreground">Category</dt>
                                <dd className="font-medium">{place.category}</dd>
                            </div>
                            <div className="flex justify-between py-1 border-b border-border/50">
                                <dt className="text-muted-foreground">Has Menu</dt>
                                <dd className="font-medium">{place.metadata.hasMenu ? 'Yes' : 'No'}</dd>
                            </div>
                            <div className="flex justify-between py-1 border-b border-border/50">
                                <dt className="text-muted-foreground">Entrances</dt>
                                <dd className="font-medium">{place.metadata.hasEntrances ? 'Mapped' : 'Unknown'}</dd>
                            </div>
                            <div className="pt-2">
                                <dt className="text-muted-foreground mb-1">Payment Methods</dt>
                                <dd className="flex flex-wrap gap-1">
                                    {place.metadata.paymentMethods.map(pm => (
                                        <span key={pm} className="px-1.5 py-0.5 bg-secondary rounded text-xs border border-border">
                                            {pm}
                                        </span>
                                    ))}
                                </dd>
                            </div>
                        </dl>
                    </div>
                </div>
            </div>
        </div>
    );
};
