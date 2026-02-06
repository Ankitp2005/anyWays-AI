import React from 'react';
import { Activity, ShieldCheck, MapPin, AlertCircle, TrendingUp } from 'lucide-react';
import type { Place } from '../models/types';
import { cn } from '../utils/cn';

interface DashboardOverviewProps {
    places: Place[];
}

export const DashboardOverview: React.FC<DashboardOverviewProps> = ({ places }) => {
    // Calculate simple metrics mock
    const totalPlaces = places.length;
    const verifiedPlaces = places.filter(p => p.validationState === 'CONFIRMED').length;
    const validationRate = totalPlaces > 0 ? Math.round((verifiedPlaces / totalPlaces) * 100) : 0;
    const activeSignals = places.reduce((acc, p) => acc + p.signals.length, 0);

    const metrics = [
        {
            label: 'Monitored Places',
            value: totalPlaces,
            change: '+12%',
            icon: MapPin,
            color: 'text-blue-500',
            bg: 'bg-blue-500/10'
        },
        {
            label: 'Validation Accuracy',
            value: `${validationRate}%`,
            change: '+2.4%',
            icon: ShieldCheck,
            color: 'text-green-500',
            bg: 'bg-green-500/10'
        },
        {
            label: 'Live Signals (24h)',
            value: activeSignals * 142, // Mock multiplier for visual scale
            change: '+8%',
            icon: Activity,
            color: 'text-purple-500',
            bg: 'bg-purple-500/10'
        },
        {
            label: 'Pending Review',
            value: places.filter(p => p.validationState === 'FLAGGED').length,
            change: '-5%',
            icon: AlertCircle,
            color: 'text-orange-500',
            bg: 'bg-orange-500/10'
        }
    ];

    return (
        <div className="space-y-6">
            <h2 className="text-2xl font-bold tracking-tight">Platform Overview</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {metrics.map((metric) => (
                    <div key={metric.label} className="bg-card border border-border rounded-xl p-5 shadow-sm">
                        <div className="flex justify-between items-start mb-4">
                            <div className={cn("p-2 rounded-lg", metric.bg, metric.color)}>
                                <metric.icon size={20} />
                            </div>
                            <div className={cn(
                                "flex items-center text-xs font-medium px-2 py-0.5 rounded-full",
                                metric.change.startsWith('+') ? "text-green-600 bg-green-100 dark:bg-green-900/30" : "text-red-600 bg-red-100 dark:bg-red-900/30"
                            )}>
                                {metric.change.startsWith('+') ? <TrendingUp size={10} className="mr-1" /> : null}
                                {metric.change}
                            </div>
                        </div>
                        <div>
                            <p className="text-sm text-muted-foreground font-medium">{metric.label}</p>
                            <h3 className="text-2xl font-bold mt-1">{metric.value}</h3>
                        </div>
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
                    <h3 className="font-semibold mb-4">Recent Signals</h3>
                    <div className="space-y-4">
                        {places.flatMap(p => p.signals.map(s => ({ ...s, placeName: p.name }))).slice(0, 5).map((signal, idx) => (
                            <div key={idx} className="flex items-center gap-3 text-sm">
                                <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                                <span className="font-medium text-foreground">{signal.type.replace('_', ' ')}</span>
                                <span className="text-muted-foreground">detected at</span>
                                <span className="font-medium text-foreground">{signal.placeName}</span>
                                <span className="ml-auto text-xs text-muted-foreground/70">{new Date(signal.timestamp).toLocaleTimeString()}</span>
                            </div>
                        ))}
                        {places.flatMap(p => p.signals).length === 0 && (
                            <div className="text-muted-foreground text-sm italic">No recent signals detected.</div>
                        )}
                    </div>
                </div>
                <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
                    <h3 className="font-semibold mb-4">System Status</h3>
                    <div className="space-y-3">
                        <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">API Latency</span>
                            <span className="font-mono text-green-500">24ms</span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">Crawler Status</span>
                            <span className="font-mono text-green-500">Active (423/s)</span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">Validation Queue</span>
                            <span className="font-mono text-blue-500">Empty</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
