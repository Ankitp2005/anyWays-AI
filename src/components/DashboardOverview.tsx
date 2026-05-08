import React from 'react';
import { MapPin, ShieldCheck, Activity, AlertCircle, TrendingUp } from 'lucide-react';
import { cn } from '../utils/cn';
import { Place } from '../models/types';
import { SystemHealthPanel } from './dashboard/SystemHealthPanel';

interface DashboardOverviewProps {
    places: Place[];
}

export const DashboardOverview: React.FC<DashboardOverviewProps> = ({ places }) => {
    // ... logic remains same ...
    const totalPlaces = places.length;
    const openPlaces = places.filter(p => p.status === 'OPEN').length;
    const avgConfidence = totalPlaces > 0
        ? Math.round(places.reduce((acc, p) => acc + ((p as any).confidence_score ?? 0), 0) / totalPlaces)
        : 0;
    const lowConfidencePlaces = places.filter(p => ((p as any).confidence_score ?? 0) < 40).length;

    const metrics = [
        // ... (existing metrics array)
        {
            label: 'Monitored Places',
            value: totalPlaces,
            change: '+12%',
            icon: MapPin,
            color: 'text-blue-500',
            bg: 'bg-blue-500/10'
        },
        {
            label: 'Open Places',
            value: openPlaces,
            change: '+2.4%',
            icon: ShieldCheck,
            color: 'text-green-500',
            bg: 'bg-green-500/10'
        },
        {
            label: 'Avg Confidence Score',
            value: `${avgConfidence}%`,
            change: '+8%',
            icon: Activity,
            color: 'text-purple-500',
            bg: 'bg-purple-500/10'
        },
        {
            label: 'Low Confidence (<40)',
            value: lowConfidencePlaces,
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

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {/* Recent Places */}
                <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
                    <h3 className="font-semibold mb-4 text-sm">Recent Places</h3>
                    <div className="space-y-4">
                        {places.slice(0, 5).map((place) => (
                            <div key={place.id} className="flex items-center gap-3 text-sm">
                                <div className="w-2 h-2 rounded-full bg-primary" />
                                <span className="font-medium text-foreground truncate max-w-[150px]">{place.name}</span>
                                <span className={cn("ml-auto text-[10px] font-bold px-2 py-0.5 rounded-full",
                                    place.status === 'OPEN' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                                )}>{place.status}</span>
                            </div>
                        ))}
                        {places.length === 0 && (
                            <div className="text-muted-foreground text-sm italic">No places added yet.</div>
                        )}
                    </div>
                </div>

                {/* System Status */}
                <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
                    <h3 className="font-semibold mb-4 text-sm">System Status</h3>
                    <div className="space-y-3">
                        <div className="flex items-center justify-between text-xs">
                            <span className="text-muted-foreground">Supabase Realtime</span>
                            <span className="font-mono text-green-500 font-bold">● ACTIVE</span>
                        </div>
                        <div className="flex items-center justify-between text-xs">
                            <span className="text-muted-foreground">API Gateway</span>
                            <span className="font-mono text-green-500 font-bold">● ONLINE</span>
                        </div>
                        <div className="flex items-center justify-between text-xs">
                            <span className="text-muted-foreground">Validation Workers</span>
                            <span className="font-mono text-blue-500 font-bold">IDLE</span>
                        </div>
                    </div>
                </div>

                {/* System Health Panel (Model Monitoring) */}
                <SystemHealthPanel />
            </div>
        </div>
    );
};
