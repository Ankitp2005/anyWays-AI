import React from 'react';
import { MapPin, ShieldCheck, Activity, AlertCircle, TrendingUp } from 'lucide-react';
import { cn } from '../utils/cn';
import { Place } from '../models/types';
import { SystemHealthPanel } from './dashboard/SystemHealthPanel';

interface DashboardOverviewProps {
    places: Place[];
}

export const DashboardOverview: React.FC<DashboardOverviewProps> = ({ places }) => {
    const totalPlaces = places.length;
    const openPlaces = places.filter(p => p.status === 'OPEN').length;
    const avgConfidence = totalPlaces > 0
        ? Math.round(places.reduce((acc, p) => acc + ((p as any).confidence_score ?? 0), 0) / totalPlaces)
        : 0;
    const lowConfidencePlaces = places.filter(p => ((p as any).confidence_score ?? 0) < 40).length;

    const metrics = [
        {
            label: 'Monitored Places',
            value: totalPlaces,
            change: '+12%',
            icon: MapPin,
        },
        {
            label: 'Open Places',
            value: openPlaces,
            change: '+2.4%',
            icon: ShieldCheck,
        },
        {
            label: 'Avg Confidence Score',
            value: `${avgConfidence}%`,
            change: '+8%',
            icon: Activity,
        },
        {
            label: 'Low Confidence (<40)',
            value: lowConfidencePlaces,
            change: '-5%',
            icon: AlertCircle,
        }
    ];

    return (
        <div className="space-y-6">
            <h2 className="text-2xl font-bold tracking-tight text-[#ffffff]">Platform Overview</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {metrics.map((metric) => (
                    <div key={metric.label} className="bg-[#07080a] border border-[#363739] rounded-[11px] p-6 transition-all duration-200 relative overflow-hidden group shadow-subtle-4">
                        <div className="flex justify-between items-start mb-4">
                            <div className="p-2 rounded-[8px] border border-white/5 text-[#ffffff] bg-[#1b1c1e] shadow-subtle-2">
                                <metric.icon size={20} />
                            </div>
                            <div className={cn(
                                "flex items-center text-[10px] font-mono font-bold px-2 py-0.5 rounded-[6px] border shadow-subtle-2 bg-[#1b1c1e] text-[#ffffff] border-white/5"
                            )}>
                                {metric.change.startsWith('+') ? <TrendingUp size={10} className="mr-1 text-[#59d499]" /> : null}
                                {metric.change}
                            </div>
                        </div>
                        <div className="relative z-10">
                            <p className="text-[11px] text-[#6a6b6c] font-mono uppercase tracking-[0.04em]">{metric.label}</p>
                            <h3 className="text-3xl font-bold mt-2 text-[#ffffff] font-mono tracking-tight">{metric.value}</h3>
                        </div>
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {/* Recent Places */}
                <div className="bg-[#07080a] border border-[#363739] rounded-[11px] p-6 shadow-subtle-4">
                    <h3 className="font-semibold mb-4 text-xs font-mono uppercase text-[#6a6b6c] tracking-[0.04em]">Recent Places</h3>
                    <div className="space-y-4">
                        {places.slice(0, 5).map((place) => (
                            <div key={place.id} className="flex items-center gap-3 text-sm">
                                <div className="w-1.5 h-1.5 rounded-full bg-[#ff6363]" />
                                <span className="font-medium text-[#ffffff] truncate max-w-[150px]">{place.name}</span>
                                <span className={cn("ml-auto text-[9px] font-mono font-bold px-2 py-0.5 rounded-[6px] border shadow-subtle-2 bg-[#1b1c1e]",
                                    place.status === 'OPEN' ? 'border-white/10 text-[#ffffff]' : 'border-[#ff6363]/20 text-[#ff6363]'
                                )}>{place.status}</span>
                            </div>
                        ))}
                        {places.length === 0 && (
                            <div className="text-[#6a6b6c] text-xs italic font-mono">No places added yet.</div>
                        )}
                    </div>
                </div>

                {/* System Status */}
                <div className="bg-[#07080a] border border-[#363739] rounded-[11px] p-6 shadow-subtle-4">
                    <h3 className="font-semibold mb-4 text-xs font-mono uppercase text-[#6a6b6c] tracking-[0.04em]">System Status</h3>
                    <div className="space-y-3">
                        <div className="flex items-center justify-between text-xs font-mono">
                            <span className="text-[#6a6b6c]">Supabase Realtime</span>
                            <span className="text-[#59d499] font-bold">● ACTIVE</span>
                        </div>
                        <div className="flex items-center justify-between text-xs font-mono">
                            <span className="text-[#6a6b6c]">API Gateway</span>
                            <span className="text-[#59d499] font-bold">● ONLINE</span>
                        </div>
                        <div className="flex items-center justify-between text-xs font-mono">
                            <span className="text-[#6a6b6c]">Validation Workers</span>
                            <span className="text-[#ff6363] font-bold">IDLE</span>
                        </div>
                    </div>
                </div>

                {/* System Health Panel (Model Monitoring) */}
                <SystemHealthPanel />
            </div>
        </div>
    );
};
