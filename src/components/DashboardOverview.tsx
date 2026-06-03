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

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {metrics.map((metric) => (
                    <div key={metric.label} className="bg-[#100904] border border-[#40372e] border-dashed rounded-xl p-6 transition-all duration-300 relative overflow-hidden group">
                        <div className="flex justify-between items-start mb-4">
                            <div className="p-2 rounded-lg border border-[#ffedd7]/20 text-[#ffedd7] bg-[#382416]/40">
                                <metric.icon size={20} />
                            </div>
                            <div className={cn(
                                "flex items-center text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border",
                                metric.change.startsWith('+') ? "text-[#ffedd7] border-[#ffedd7]/15 bg-[#382416]/55" : "text-[#dc5000] border-[#dc5000]/20 bg-[#382416]/20"
                            )}>
                                {metric.change.startsWith('+') ? <TrendingUp size={10} className="mr-1" /> : null}
                                {metric.change}
                            </div>
                        </div>
                        <div className="relative z-10">
                            <p className="text-xs text-[#6c5f51] font-mono uppercase tracking-wider">{metric.label}</p>
                            <h3 className="text-3xl font-black mt-2 text-[#ffedd7] font-mono">{metric.value}</h3>
                        </div>
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {/* Recent Places */}
                <div className="bg-[#100904] border border-[#40372e] border-dashed rounded-xl p-6">
                    <h3 className="font-bold mb-4 text-xs font-mono uppercase text-[#6c5f51] tracking-wider">Recent Places</h3>
                    <div className="space-y-4">
                        {places.slice(0, 5).map((place) => (
                            <div key={place.id} className="flex items-center gap-3 text-sm">
                                <div className="w-1.5 h-1.5 rounded-full bg-[#dc5000]" />
                                <span className="font-medium text-[#ffedd7] truncate max-w-[150px]">{place.name}</span>
                                <span className={cn("ml-auto text-[9px] font-mono font-bold px-2 py-0.5 rounded-full border",
                                    place.status === 'OPEN' ? 'border-[#ffedd7]/20 text-[#ffedd7]' : 'border-[#dc5000]/30 text-[#dc5000]'
                                )}>{place.status}</span>
                            </div>
                        ))}
                        {places.length === 0 && (
                            <div className="text-[#6c5f51] text-xs italic font-mono">No places added yet.</div>
                        )}
                    </div>
                </div>

                {/* System Status */}
                <div className="bg-[#100904] border border-[#40372e] border-dashed rounded-xl p-6">
                    <h3 className="font-bold mb-4 text-xs font-mono uppercase text-[#6c5f51] tracking-wider">System Status</h3>
                    <div className="space-y-3">
                        <div className="flex items-center justify-between text-xs font-mono">
                            <span className="text-[#6c5f51]">Supabase Realtime</span>
                            <span className="text-[#ffedd7] font-bold">● ACTIVE</span>
                        </div>
                        <div className="flex items-center justify-between text-xs font-mono">
                            <span className="text-[#6c5f51]">API Gateway</span>
                            <span className="text-[#ffedd7] font-bold">● ONLINE</span>
                        </div>
                        <div className="flex items-center justify-between text-xs font-mono">
                            <span className="text-[#6c5f51]">Validation Workers</span>
                            <span className="text-[#dc5000] font-bold">IDLE</span>
                        </div>
                    </div>
                </div>

                {/* System Health Panel (Model Monitoring) */}
                <SystemHealthPanel />
            </div>
        </div>
    );
};
