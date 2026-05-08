import React, { useEffect, useState } from 'react';
import { useLiveSignals } from '../../hooks/useLiveSignals';
import { formatDistanceToNowStrict } from 'date-fns';
import { Activity, Clock, Shield, Eye, AlertTriangle, Zap, TrendingUp, TrendingDown, RefreshCw, XCircle } from 'lucide-react';
import { cn } from '../../utils/cn';
import { motion, AnimatePresence } from 'framer-motion';

interface LiveSignalFeedProps {
    placeId: string;
}

/* ─── Mapping Utilities ───────────────────────────────────── */
const formatSignalLabel = (type: string): string => {
    switch (type) {
        case 'PICKUP_LOCATION_VERIFIED': return 'Pickup verified';
        case 'FOOT_TRAFFIC': return 'Foot traffic detected';
        case 'OCR_MENU': return 'Menu detected via OCR';
        case 'SOCIAL_CONFLICT': return 'Social conflict reported';
        case 'DIGITAL_ACTIVITY': return 'Digital activity detected';
        case 'CLOSED_DETECTED': return 'Closure detected';
        case 'LOW_TRAFFIC': return 'Low traffic observed';
        case 'DECAY': return 'Confidence decay (inactivity)';
        default: return type.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase());
    }
};

const getSignalIcon = (type: string) => {
    if (type === 'DECAY') return <Clock size={14} className="text-orange-400" />;
    if (type.includes('CLOSED')) return <XCircle size={14} className="text-red-500" />;
    if (type.includes('LOW_TRAFFIC')) return <TrendingDown size={14} className="text-orange-400" />;
    if (type.includes('VERIFIED') || type.includes('LOCATION')) return <Shield size={14} className="text-emerald-400" />;
    if (type.includes('TRAFFIC')) return <Activity size={14} className="text-blue-400" />;
    if (type.includes('OCR') || type.includes('MENU')) return <Eye size={14} className="text-violet-400" />;
    if (type.includes('CONFLICT') || type.includes('NEGATIVE')) return <AlertTriangle size={14} className="text-red-400" />;
    if (type.includes('DIGITAL')) return <Zap size={14} className="text-amber-400" />;
    return <TrendingUp size={14} className="text-zinc-400" />;
};

/* ─── Relative Time Hook ──────────────────────────────────── */
const useRelativeTime = (dateStr: string) => {
    const [timeAgo, setTimeAgo] = useState('');

    useEffect(() => {
        const updateTime = () => {
            const d = new Date(dateStr);
            if (isNaN(d.getTime())) {
                setTimeAgo('just now');
                return;
            }
            const seconds = Math.floor((Date.now() - d.getTime()) / 1000);
            if (seconds < 5) {
                setTimeAgo('just now');
            } else if (seconds < 60) {
                setTimeAgo(`${seconds}s ago`);
            } else if (seconds < 3600) {
                setTimeAgo(`${Math.floor(seconds / 60)}m ago`);
            } else {
                setTimeAgo(formatDistanceToNowStrict(d, { addSuffix: true }));
            }
        };

        updateTime();
        // Update every 5 seconds to keep relative time accurate without trashing the CPU
        const interval = setInterval(updateTime, 5000);
        return () => clearInterval(interval);
    }, [dateStr]);

    return timeAgo;
};

const SignalItem = ({ event, isNewest = false }: { event: any; isNewest?: boolean }) => {
    const timeAgo = useRelativeTime(event.created_at);
    
    // Severity levels
    const isCritical = event.signal_type === 'CLOSED_DETECTED';
    const isWarning = event.signal_type === 'LOW_TRAFFIC';
    const severity = isCritical ? 'CRITICAL' : isWarning ? 'WARNING' : 'INFO';
    
    const isPositive = event.confidence_delta > 0;
    const isNeutral = event.confidence_delta === 0;
    const isNegative = event.confidence_delta < 0;

    const highlightColor = isCritical ? 'rgba(239,68,68,0.8)' : isWarning ? 'rgba(249,115,22,0.8)' : isPositive ? 'rgba(16,185,129,0.4)' : isNeutral ? 'rgba(161,161,170,0.3)' : 'rgba(239,68,68,0.4)';
    
    return (
        <motion.div
            layout
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{
                opacity: 1, y: 0, scale: 1,
                boxShadow: isNewest
                    ? [
                        `0 0 0 0px transparent`,
                        `0 0 12px 3px ${highlightColor}`,
                        `0 0 0 0px transparent`
                      ]
                    : '0 0 0 0px transparent',
            }}
            exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.2 } }}
            transition={{
                type: "spring", stiffness: 500, damping: 30, mass: 1,
                boxShadow: isNewest ? { duration: 2, ease: 'easeOut' } : undefined,
            }}
            className={cn(
                "group relative p-3.5 rounded-xl bg-card border hover:border-border shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden",
                isNewest ? 'border-primary/40' : 'border-border/50'
            )}
        >
            {/* Subtle glassmorphic background glow depending on impact */}
            <div className={cn(
                "absolute inset-0 opacity-0 group-hover:opacity-10 transition-opacity duration-300 pointer-events-none",
                isCritical ? "bg-red-600 opacity-5" : isWarning ? "bg-orange-500 opacity-5" : isPositive ? "bg-emerald-500" : isNeutral ? "bg-zinc-500" : "bg-red-500"
            )} />

            <div className="flex items-start justify-between gap-3 relative z-10">
                <div className="flex items-start gap-3">
                    <div className={cn(
                        "mt-0.5 p-2 rounded-lg flex items-center justify-center border",
                        isCritical ? "bg-red-500/20 border-red-500/50" :
                        isWarning ? "bg-orange-500/20 border-orange-500/50" :
                        isPositive ? "bg-emerald-500/10 border-emerald-500/20" : 
                        isNeutral ? "bg-zinc-500/10 border-zinc-500/20" : 
                        "bg-red-500/10 border-red-500/20"
                    )}>
                        {getSignalIcon(event.signal_type)}
                    </div>
                    <div>
                        <p className={cn(
                            "text-sm font-medium leading-tight",
                            isCritical ? "text-red-500" : isWarning ? "text-orange-500" : isNegative ? "text-red-400" : "text-foreground"
                        )}>
                            {formatSignalLabel(event.signal_type)}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                            <span className={cn(
                                "text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider",
                                isCritical ? "bg-red-500 text-white" : isWarning ? "bg-orange-500 text-white" : "bg-zinc-800 text-zinc-300"
                            )}>
                                {severity}
                            </span>
                            <p className="text-[11px] text-muted-foreground flex items-center gap-1.5 font-mono">
                                <Clock size={10} />
                                {timeAgo}
                            </p>
                        </div>
                    </div>
                </div>

                <div className="flex flex-col items-end">
                    <span className={cn(
                        "text-[10px] font-bold px-2 py-0.5 rounded-full border tracking-wide",
                        isPositive ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" : 
                        isNeutral ? "bg-zinc-500/10 text-zinc-500 border-zinc-500/20" : 
                        "bg-red-500/10 text-red-500 border-red-500/20"
                    )}>
                        {isNeutral ? 'Observed (no impact)' : `${isPositive ? '+' : ''}${event.confidence_delta}`}
                    </span>
                    <span className="text-[10px] text-muted-foreground mt-1.5 whitespace-nowrap">
                        Score: <span className="font-mono text-foreground font-medium">{event.score_after}</span>
                    </span>
                </div>
            </div>
        </motion.div>
    );
};

export const LiveSignalFeed: React.FC<LiveSignalFeedProps> = ({ placeId }) => {
    const { events, status } = useLiveSignals(placeId);

    const groupedItems = React.useMemo(() => {
        const groups: Array<{ type: 'single'; event: any; id: string } | { type: 'group'; events: any[]; id: string }> = [];
        let currentGroup: any[] = [];

        // Sort events to move critical/warning signals to the top
        const sortedEvents = [...events].sort((a, b) => {
            const getSeverityScore = (type: string) => {
                if (type === 'CLOSED_DETECTED') return 3;
                if (type === 'LOW_TRAFFIC') return 2;
                return 1;
            };
            const sevA = getSeverityScore(a.signal_type);
            const sevB = getSeverityScore(b.signal_type);
            
            // If severities differ, sort by severity (higher first)
            if (sevA !== sevB) {
                return sevB - sevA;
            }
            
            // Otherwise, sort chronologically (newest first)
            return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        });

        for (let i = 0; i < sortedEvents.length; i++) {
            const evt = sortedEvents[i];
            if (currentGroup.length === 0) {
                currentGroup.push(evt);
                continue;
            }

            const lastEvtTime = new Date(currentGroup[currentGroup.length - 1].created_at).getTime();
            const thisEvtTime = new Date(evt.created_at).getTime();
            const diffSec = Math.abs(lastEvtTime - thisEvtTime) / 1000;

            if (diffSec <= 5) {
                currentGroup.push(evt);
            } else {
                if (currentGroup.length >= 3) {
                    groups.push({ type: 'group', events: currentGroup, id: `group-${currentGroup[0].id}` });
                } else {
                    groups.push(...currentGroup.map(e => ({ type: 'single' as const, event: e, id: e.id })));
                }
                currentGroup = [evt];
            }
        }
        
        if (currentGroup.length >= 3) {
            groups.push({ type: 'group', events: currentGroup, id: `group-${currentGroup[0].id}` });
        } else {
            groups.push(...currentGroup.map(e => ({ type: 'single' as const, event: e, id: e.id })));
        }

        return groups;
    }, [events]);

    return (
        <div className="bg-card/40 backdrop-blur-xl border border-border rounded-xl shadow-sm flex flex-col h-full max-h-[600px] overflow-hidden">
            {/* Header */}
            <div className="px-5 py-4 border-b border-border/50 bg-card/80 backdrop-blur-md sticky top-0 z-20 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                    <div className="p-1.5 bg-primary/10 text-primary rounded-md">
                        <Activity size={16} />
                    </div>
                    <h3 className="font-semibold text-sm text-foreground">Live Feed</h3>
                </div>
                <div className="flex items-center gap-2">
                    {status === 'RECONNECTING' && (
                        <RefreshCw size={12} className="text-yellow-500 animate-spin" />
                    )}
                    <div className={cn(
                        "flex items-center gap-1.5 px-2.5 py-1 rounded-full border bg-background/50 backdrop-blur-sm",
                        status === 'LIVE' ? "border-emerald-500/20" : 
                        status === 'RECONNECTING' ? "border-yellow-500/20" : "border-red-500/20"
                    )}>
                        <span className={cn(
                            "w-1.5 h-1.5 rounded-full",
                            status === 'LIVE' ? "bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.8)]" : 
                            status === 'RECONNECTING' ? "bg-yellow-500" : "bg-red-500"
                        )} />
                        <span className={cn(
                            "text-[9px] font-bold tracking-widest uppercase",
                            status === 'LIVE' ? "text-emerald-500" : 
                            status === 'RECONNECTING' ? "text-yellow-500" : "text-red-500"
                        )}>
                            {status}
                        </span>
                    </div>
                </div>
            </div>
            
            {/* Feed List */}
            <div className="flex-1 overflow-y-auto p-4 scrollbar-thin scrollbar-thumb-border hover:scrollbar-thumb-muted-foreground/50 scrollbar-track-transparent">
                {groupedItems.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 text-center text-muted-foreground animate-in fade-in">
                        <div className="w-12 h-12 rounded-full border border-dashed border-border flex items-center justify-center mb-3">
                            <Activity size={20} className="opacity-30" />
                        </div>
                        <p className="text-sm font-medium text-foreground">No signals yet</p>
                        <p className="text-xs mt-1 max-w-[200px]">Waiting for real-world events to trigger...</p>
                    </div>
                ) : (
                    <div className="flex flex-col gap-2.5">
                        <AnimatePresence initial={false} mode="popLayout">
                            {groupedItems.map((item, idx) => {
                                if (item.type === 'group') {
                                    return (
                                        <motion.div
                                            key={item.id}
                                            layout
                                            initial={{ opacity: 0, y: -20, scale: 0.95 }}
                                            animate={{ opacity: 1, y: 0, scale: 1 }}
                                            className="p-3 rounded-xl bg-secondary/30 border border-border/50 flex items-center justify-between"
                                        >
                                            <div className="flex items-center gap-2">
                                                <div className="flex -space-x-2">
                                                    <div className="w-6 h-6 rounded-full bg-zinc-800 border-2 border-zinc-950 z-20 flex items-center justify-center">
                                                        <Zap size={10} className="text-zinc-400" />
                                                    </div>
                                                    <div className="w-6 h-6 rounded-full bg-zinc-800 border-2 border-zinc-950 z-10 flex items-center justify-center">
                                                        <Activity size={10} className="text-zinc-400" />
                                                    </div>
                                                    <div className="w-6 h-6 rounded-full bg-zinc-800 border-2 border-zinc-950 z-0 flex items-center justify-center text-[9px] font-bold text-zinc-300">
                                                        +{item.events.length - 2}
                                                    </div>
                                                </div>
                                                <span className="text-sm font-medium ml-1">
                                                    {item.events.length} signals received
                                                </span>
                                            </div>
                                            <span className="text-[10px] text-muted-foreground">Burst detected</span>
                                        </motion.div>
                                    );
                                }
                                return <SignalItem key={item.id} event={item.event} isNewest={idx === 0} />;
                            })}
                        </AnimatePresence>
                    </div>
                )}
            </div>
        </div>
    );
};
