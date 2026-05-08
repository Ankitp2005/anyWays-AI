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
            <div className="bg-card border border-border rounded-xl p-6 shadow-sm flex items-center justify-center h-48">
                <span className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    const statusColors = {
        HEALTHY: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
        WARNING: "bg-orange-500/10 text-orange-500 border-orange-500/20",
        DEGRADED: "bg-red-500/10 text-red-500 border-red-500/20"
    };

    const StatusIcon = health.status === 'HEALTHY' ? CheckCircle : 
                       health.status === 'WARNING' ? AlertTriangle : AlertTriangle;

    return (
        <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-6">
                <h3 className="font-bold flex items-center gap-2">
                    <Activity size={18} className="text-primary" />
                    Model Health & Drift
                </h3>
                <div className={cn("flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border uppercase tracking-wider", statusColors[health.status])}>
                    <StatusIcon size={14} />
                    {health.status}
                </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="p-4 rounded-lg bg-secondary/30 border border-border/50">
                    <p className="text-xs text-muted-foreground font-medium mb-1">Model Accuracy</p>
                    <div className="flex items-end gap-2">
                        <h4 className="text-2xl font-black font-mono">
                            {(health.accuracy * 100).toFixed(1)}%
                        </h4>
                    </div>
                </div>
                <div className="p-4 rounded-lg bg-secondary/30 border border-border/50">
                    <p className="text-xs text-muted-foreground font-medium mb-1">Drift Score</p>
                    <div className="flex items-end gap-2">
                        <h4 className={cn("text-2xl font-black font-mono", 
                            health.drift_score > 0.15 ? "text-orange-500" : "text-emerald-500"
                        )}>
                            {health.drift_score.toFixed(3)}
                        </h4>
                        {health.drift_score > 0.15 ? <TrendingUp size={16} className="text-orange-500 mb-1" /> : <TrendingDown size={16} className="text-emerald-500 mb-1" />}
                    </div>
                </div>
            </div>

            {health.alerts && health.alerts.length > 0 ? (
                <div className="space-y-2">
                    <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">Active Alerts</p>
                    {health.alerts.map(alert => (
                        <div key={alert.id} className="flex items-start gap-3 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400">
                            <AlertTriangle size={16} className="mt-0.5 shrink-0" />
                            <div>
                                <h5 className="text-xs font-bold uppercase tracking-wider">{alert.alert_type}</h5>
                                <p className="text-xs opacity-90 mt-0.5">{alert.message}</p>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400">
                    <CheckCircle size={16} />
                    <span className="text-sm font-medium">No active anomalies detected.</span>
                </div>
            )}

            <div className="mt-4 flex items-center justify-between text-[10px] text-muted-foreground">
                <span className="flex items-center gap-1">
                    <Info size={12} />
                    Confidence: <span className="font-bold">{health.confidence}</span>
                </span>
                <span>Updated: {new Date(health.last_updated).toLocaleString()}</span>
            </div>
        </div>
    );
};
