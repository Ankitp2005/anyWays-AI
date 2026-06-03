import React, { useEffect, useState } from 'react';
import { Activity, AlertTriangle, CheckCircle, Info, TrendingDown, TrendingUp } from 'lucide-react';
import { cn } from '../../utils/cn';
import { supabase } from '../../lib/supabaseClient';

export interface SystemHealthData {
    status: 'HEALTHY' | 'WARNING' | 'DEGRADED';
    accuracy: number;
    drift_score: number;
    confidence: 'LOW' | 'MEDIUM' | 'HIGH';
    last_updated: string;
    alerts: Array<{
        id: string;
        alert_type: string;
        severity: string;
        message: string;
        created_at: string;
    }>;
}

export const SystemHealthPanel: React.FC = () => {
    const [health, setHealth] = useState<SystemHealthData | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchHealth = async () => {
            try {
                const { data: { session } } = await supabase.auth.getSession();
                const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/system-health`;
                
                const response = await fetch(url, {
                    headers: {
                        'Authorization': `Bearer ${session?.access_token || import.meta.env.VITE_SUPABASE_ANON_KEY}`
                    }
                });
                
                if (response.ok) {
                    const json = await response.json();
                    if (json.success) {
                        setHealth(json.data);
                    }
                }
            } catch (err) {
                console.error("Failed to fetch system health", err);
            } finally {
                setLoading(false);
            }
        };

        fetchHealth();
        // Poll every 5 minutes
        const interval = setInterval(fetchHealth, 300000);
        return () => clearInterval(interval);
    }, []);

    if (loading || !health) {
        return (
            <div className="bg-[#07080a] border border-[#363739] rounded-[11px] p-6 shadow-subtle-4 flex items-center justify-center h-48">
                <span className="w-8 h-8 border-4 border-[#e6e6e6] border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    const statusColors = {
        HEALTHY: "border-white/10 text-[#ffffff] bg-[#1b1c1e] shadow-subtle-2",
        WARNING: "border-[#ff6363]/40 text-[#ff6363] bg-[#452324]/20 shadow-subtle-2",
        DEGRADED: "border-[#ff6363]/40 text-[#ff6363] bg-[#452324]/20 shadow-subtle-2"
    };

    const StatusIcon = health.status === 'HEALTHY' ? CheckCircle : AlertTriangle;

    return (
        <div className="bg-[#07080a] border border-[#363739] rounded-[11px] p-6 shadow-subtle-4">
            <div className="flex items-center justify-between mb-6">
                <h3 className="font-semibold text-xs font-mono uppercase text-[#6a6b6c] tracking-[0.04em] flex items-center gap-2">
                    <Activity size={18} className="text-[#ff6363]" />
                    Model Health & Drift
                </h3>
                <div className={cn("flex items-center gap-1.5 px-2 py-0.5 rounded-[6px] text-[10px] font-bold border uppercase tracking-wider font-mono", statusColors[health.status])}>
                    <StatusIcon size={12} />
                    {health.status}
                </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="p-4 rounded-[8px] bg-[#111214] border border-white/5 shadow-subtle-2">
                    <p className="text-[11px] text-[#6a6b6c] font-mono uppercase tracking-[0.04em] mb-1">Model Accuracy</p>
                    <div className="flex items-end gap-2">
                        <h4 className="text-2xl font-bold font-mono text-[#ffffff] tracking-tight">
                            {(health.accuracy * 100).toFixed(1)}%
                        </h4>
                    </div>
                </div>
                <div className="p-4 rounded-[8px] bg-[#111214] border border-white/5 shadow-subtle-2">
                    <p className="text-[11px] text-[#6a6b6c] font-mono uppercase tracking-[0.04em] mb-1">Drift Score</p>
                    <div className="flex items-end gap-2">
                        <h4 className={cn("text-2xl font-bold font-mono tracking-tight", 
                            health.drift_score > 0.15 ? "text-[#ff6363]" : "text-[#ffffff]"
                        )}>
                            {health.drift_score.toFixed(3)}
                        </h4>
                        {health.drift_score > 0.15 ? <TrendingUp size={16} className="text-[#ff6363] mb-1 shrink-0" /> : <TrendingDown size={16} className="text-[#59d499] mb-1 shrink-0" />}
                    </div>
                </div>
            </div>

            {health.alerts && health.alerts.length > 0 ? (
                <div className="space-y-2">
                    <p className="text-[10px] font-bold text-[#6a6b6c] uppercase tracking-wider mb-2 font-mono">Active Alerts</p>
                    {health.alerts.map(alert => (
                        <div key={alert.id} className="flex items-start gap-3 p-3 rounded-[8px] bg-[#452324]/20 border border-[#ff6363]/30 text-[#ff6363]">
                            <AlertTriangle size={16} className="mt-0.5 shrink-0" />
                            <div>
                                <h5 className="text-[11px] font-bold uppercase tracking-wider font-mono">{alert.alert_type}</h5>
                                <p className="text-xs opacity-90 mt-0.5">{alert.message}</p>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="flex items-center gap-2 p-3 rounded-[8px] bg-[#1b1c1e] border border-white/5 text-[#ffffff] shadow-subtle-2">
                    <CheckCircle size={16} className="text-[#59d499]" />
                    <span className="text-xs font-medium">No active anomalies detected.</span>
                </div>
            )}

            <div className="mt-4 flex items-center justify-between text-[10px] text-[#6a6b6c] font-mono">
                <span className="flex items-center gap-1">
                    <Info size={12} />
                    Confidence: <span className="font-bold text-[#ffffff]">{health.confidence}</span>
                </span>
                <span>Updated: {new Date(health.last_updated).toLocaleString()}</span>
            </div>
        </div>
    );
};
