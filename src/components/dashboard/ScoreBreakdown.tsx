import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useLiveSignals } from '../../hooks/useLiveSignals';
import { cn } from '../../utils/cn';
import { formatDistanceToNow } from 'date-fns';
import { ChevronDown, ChevronUp, Filter, TrendingUp, TrendingDown, Shield, Zap, Eye, AlertTriangle, Activity, XCircle, CheckCircle2, Clock } from 'lucide-react';

/* ─── Types ───────────────────────────────────────────────────── */

interface ScoreBreakdownProps {
    placeId: string;
    currentScore: number;
}

type ImpactCategory = 'Strong Positive' | 'Moderate Positive' | 'Weak Positive' | 'Negative' | 'Observed (no impact)';

interface CategoryMeta {
    label: ImpactCategory;
    icon: React.ReactNode;
    gradient: string;
    badgeBg: string;
    badgeText: string;
    badgeBorder: string;
    ringColor: string;
    glowColor: string;
}

/* ─── Impact Category Logic ───────────────────────────────────── */

const getCategoryMeta = (delta: number): CategoryMeta => {
    if (delta >= 15) return {
        label: 'Strong Positive',
        icon: <Shield size={12} />,
        gradient: 'from-emerald-500/20 to-emerald-500/5',
        badgeBg: 'bg-emerald-500/15',
        badgeText: 'text-emerald-400',
        badgeBorder: 'border-emerald-500/25',
        ringColor: '#34d399',
        glowColor: 'shadow-emerald-500/20',
    };
    if (delta >= 5) return {
        label: 'Moderate Positive',
        icon: <TrendingUp size={12} />,
        gradient: 'from-blue-500/20 to-blue-500/5',
        badgeBg: 'bg-blue-500/15',
        badgeText: 'text-blue-400',
        badgeBorder: 'border-blue-500/25',
        ringColor: '#60a5fa',
        glowColor: 'shadow-blue-500/20',
    };
    if (delta > 0) return {
        label: 'Weak Positive',
        icon: <Zap size={12} />,
        gradient: 'from-amber-500/20 to-amber-500/5',
        badgeBg: 'bg-amber-500/15',
        badgeText: 'text-amber-400',
        badgeBorder: 'border-amber-500/25',
        ringColor: '#fbbf24',
        glowColor: 'shadow-amber-500/20',
    };
    if (delta < 0) return {
        label: 'Negative',
        icon: <AlertTriangle size={12} />,
        gradient: 'from-red-500/20 to-red-500/5',
        badgeBg: 'bg-red-500/15',
        badgeText: 'text-red-400',
        badgeBorder: 'border-red-500/25',
        ringColor: '#f87171',
        glowColor: 'shadow-red-500/20',
    };
    return {
        label: 'Observed (no impact)' as ImpactCategory,
        icon: <Eye size={12} />,
        gradient: 'from-zinc-500/20 to-zinc-500/5',
        badgeBg: 'bg-zinc-500/15',
        badgeText: 'text-zinc-400',
        badgeBorder: 'border-zinc-500/25',
        ringColor: '#a1a1aa',
        glowColor: 'shadow-zinc-500/20',
    };
};

/* ─── Signal type to icon mapping ─────────────────────────────── */

const getSignalIcon = (signalType: string) => {
    const t = signalType.toUpperCase();
    if (t === 'DECAY') return <Clock size={16} className="text-orange-400" />;
    if (t.includes('CLOSED')) return <XCircle size={16} className="text-red-500" />;
    if (t === 'LOW_TRAFFIC') return <TrendingDown size={16} className="text-orange-400" />;
    if (t.includes('PICKUP') || t.includes('LOCATION') || t.includes('VERIFIED')) return <Shield size={16} className="text-emerald-400" />;
    if (t.includes('FOOT') || t.includes('TRAFFIC')) return <Activity size={16} className="text-blue-400" />;
    if (t.includes('OCR') || t.includes('MENU')) return <Eye size={16} className="text-violet-400" />;
    if (t.includes('SOCIAL') || t.includes('CONFLICT') || t.includes('NEGATIVE')) return <AlertTriangle size={16} className="text-red-400" />;
    if (t.includes('DIGITAL')) return <Zap size={16} className="text-amber-400" />;
    return <TrendingUp size={16} className="text-zinc-400" />;
};

/* ─── Human-readable signal labels ────────────────────────────── */

const formatSignalLabel = (type: string): string => {
    switch (type) {
        case 'PICKUP_LOCATION_VERIFIED': return 'Pickup Location Verified';
        case 'FOOT_TRAFFIC': return 'Foot Traffic Detected';
        case 'OCR_MENU': return 'Menu Detected via OCR';
        case 'SOCIAL_SENTIMENT': return 'Social Sentiment';
        case 'HOURS_VERIFIED': return 'Hours Verified';
        case 'PHONE_VERIFIED': return 'Phone Verified';
        case 'CLOSED_DETECTED': return 'Closure Detected';
        case 'LOW_TRAFFIC': return 'Low Traffic Observed';
        case 'DECAY': return 'Confidence Decay (Inactivity)';
        default: return type.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase());
    }
};

/* ─── Skeleton Loader ─────────────────────────────────────────── */

const SkeletonRow = () => (
    <div className="flex items-center justify-between p-4 rounded-xl border border-white/[0.04] bg-white/[0.02] animate-pulse">
        <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-xl bg-white/[0.06]" />
            <div>
                <div className="h-3 w-28 bg-white/[0.08] rounded mb-2" />
                <div className="h-2 w-16 bg-white/[0.05] rounded" />
            </div>
        </div>
        <div className="h-5 w-24 bg-white/[0.06] rounded-full" />
    </div>
);

/* ─── Animated Counter ────────────────────────────────────────── */

const AnimatedCounter = ({ value }: { value: number }) => {
    const [displayValue, setDisplayValue] = useState(0);
    const prevValue = useRef(0);

    useEffect(() => {
        const start = prevValue.current;
        const end = value;
        prevValue.current = value;

        if (start === end) {
            setDisplayValue(end);
            return;
        }

        const duration = 1200;
        const startTime = performance.now();
        let raf: number;

        const animate = (now: number) => {
            const elapsed = now - startTime;
            const progress = Math.min(elapsed / duration, 1);
            // easeOutExpo
            const ease = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);

            setDisplayValue(Math.round(start + (end - start) * ease));

            if (progress < 1) {
                raf = requestAnimationFrame(animate);
            }
        };

        raf = requestAnimationFrame(animate);
        return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [value]);

    return <span>{displayValue}</span>;
};

/* ─── Score Ring ──────────────────────────────────────────────── */

const ScoreRing = ({ score }: { score: number }) => {
    const [animatedScore, setAnimatedScore] = useState(0);
    const radius = 54;
    const circumference = 2 * Math.PI * radius;

    useEffect(() => {
        const timeout = setTimeout(() => setAnimatedScore(score), 100);
        return () => clearTimeout(timeout);
    }, [score]);

    const offset = circumference - (animatedScore / 100) * circumference;

    const getScoreColor = (s: number) => {
        if (s >= 80) return { stroke: 'url(#scoreGradientHigh)', glow: '#34d399' };
        if (s >= 50) return { stroke: 'url(#scoreGradientMid)', glow: '#fb923c' };
        return { stroke: 'url(#scoreGradientLow)', glow: '#f87171' };
    };

    const colors = getScoreColor(score);

    return (
        <div className="relative flex items-center justify-center" style={{ width: 140, height: 140 }}>
            {/* Ambient glow */}
            <div
                className="absolute inset-0 rounded-full blur-2xl opacity-30 transition-all duration-1000"
                style={{ backgroundColor: colors.glow }}
            />

            <svg width="140" height="140" className="relative z-10">
                <defs>
                    <linearGradient id="scoreGradientHigh" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#34d399" />
                        <stop offset="100%" stopColor="#6ee7b7" />
                    </linearGradient>
                    <linearGradient id="scoreGradientMid" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#fb923c" />
                        <stop offset="100%" stopColor="#fbbf24" />
                    </linearGradient>
                    <linearGradient id="scoreGradientLow" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#f87171" />
                        <stop offset="100%" stopColor="#fca5a5" />
                    </linearGradient>
                </defs>

                <g transform="rotate(-90 70 70)">
                    {/* Track */}
                    <circle
                        cx="70" cy="70" r={radius}
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="8"
                        className="text-white/5"
                    />

                    {/* Progress */}
                    <circle
                        cx="70" cy="70" r={radius}
                        fill="none"
                        stroke={colors.stroke}
                        strokeWidth="8"
                        strokeLinecap="round"
                        strokeDasharray={circumference}
                        strokeDashoffset={offset}
                        className="transition-all duration-[1500ms] ease-out"
                    />
                </g>
            </svg>

            {/* Center label */}
            <div className="absolute inset-0 flex flex-col items-center justify-center z-20">
                <span className="text-4xl font-black text-white tracking-tighter leading-none">
                    <AnimatedCounter value={score} />
                </span>
                <span className="text-[10px] uppercase tracking-[0.2em] text-zinc-500 font-semibold mt-1">Score</span>
            </div>
        </div>
    );
};

/* ─── Signal Row ──────────────────────────────────────────────── */

interface SignalRowProps {
    evt: {
        id: string;
        signal_type: string;
        confidence_delta: number;
        created_at: string;
    };
    index: number;
}

const SignalRow: React.FC<SignalRowProps> = ({ evt, index }) => {
    const cat = getCategoryMeta(evt.confidence_delta);
    const [isVisible, setIsVisible] = useState(false);
    const rowRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const timer = setTimeout(() => setIsVisible(true), index * 60);
        return () => clearTimeout(timer);
    }, [index]);

    const timeLabel = (() => {
        const d = new Date(evt.created_at);
        return isNaN(d.getTime()) ? 'just now' : formatDistanceToNow(d, { addSuffix: true });
    })();

    return (
        <div
            ref={rowRef}
            className={cn(
                "group relative flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl border transition-all duration-500",
                "bg-gradient-to-r",
                cat.gradient,
                "border-white/[0.06] hover:border-white/[0.12]",
                "hover:shadow-lg",
                cat.glowColor,
                isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-3"
            )}
        >
            {/* Left: Delta + Info */}
            <div className="flex items-center gap-4 mb-2 sm:mb-0">
                {/* Delta badge */}
                <div className={cn(
                    "relative flex items-center justify-center w-14 h-14 rounded-xl border",
                    evt.confidence_delta >= 0
                        ? "bg-emerald-500/10 border-emerald-500/20"
                        : "bg-red-500/10 border-red-500/20"
                )}>
                    <span className={cn(
                        "text-lg font-black tracking-tighter",
                        evt.confidence_delta >= 0 ? "text-emerald-400" : "text-red-400"
                    )}>
                        {evt.confidence_delta > 0 ? '+' : ''}{evt.confidence_delta}
                    </span>
                </div>

                {/* Signal info */}
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                        {getSignalIcon(evt.signal_type)}
                        <p className="text-sm font-bold text-zinc-200 uppercase tracking-wide truncate">
                            {formatSignalLabel(evt.signal_type)}
                        </p>
                    </div>
                    <p className="text-xs text-zinc-500 font-mono">{timeLabel}</p>
                </div>
            </div>

            {/* Right: Severity badge */}
            <div className={cn(
                "inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.1em] px-3 py-1.5 rounded-full border",
                "backdrop-blur-sm transition-all duration-200",
                "group-hover:scale-105",
                evt.signal_type === 'CLOSED_DETECTED' ? 'bg-red-500/15 text-red-400 border-red-500/25 shadow-[0_0_15px_rgba(239,68,68,0.2)]' :
                evt.signal_type === 'LOW_TRAFFIC' ? 'bg-orange-500/15 text-orange-400 border-orange-500/25' :
                evt.confidence_delta < 0 ? 'bg-red-500/10 text-red-400 border-red-500/20' :
                'bg-emerald-500/15 text-emerald-400 border-emerald-500/25'
            )}>
                {evt.signal_type === 'CLOSED_DETECTED' || evt.signal_type === 'LOW_TRAFFIC' || evt.confidence_delta < 0 ? <AlertTriangle size={12} /> : <CheckCircle2 size={12} />}
                {evt.signal_type === 'CLOSED_DETECTED' ? 'CRITICAL' :
                 evt.signal_type === 'LOW_TRAFFIC' ? 'WARNING' :
                 evt.confidence_delta < 0 ? 'NEGATIVE' : 'INFO'}
            </div>

            {/* Hover highlight line */}
            <div className="absolute left-0 top-0 bottom-0 w-0.5 rounded-full bg-gradient-to-b from-transparent via-current to-transparent opacity-0 group-hover:opacity-40 transition-opacity duration-300" />
        </div>
    );
};

/* ─── Main Component ──────────────────────────────────────────── */

export const ScoreBreakdown: React.FC<ScoreBreakdownProps> = ({ placeId, currentScore }) => {
    const { events, status } = useLiveSignals(placeId);
    const isLoading = status !== 'LIVE' && events.length === 0;
    const [isExpanded, setIsExpanded] = useState(false);
    const [filterType, setFilterType] = useState<string>('ALL');
    const [isFilterOpen, setIsFilterOpen] = useState(false);

    const uniqueTypes = ['ALL', ...Array.from(new Set(events.map(e => e.signal_type)))];

    const filteredEvents = filterType === 'ALL'
        ? events.filter(e => e.confidence_delta !== 0)
        : events.filter(e => e.signal_type === filterType && e.confidence_delta !== 0);

    const sortedEvents = [...filteredEvents].sort((a, b) => {
        // Sort by negative (CRITICAL/WARNING) first
        if (a.confidence_delta < 0 && b.confidence_delta >= 0) return -1;
        if (b.confidence_delta < 0 && a.confidence_delta >= 0) return 1;
        // Then by created_at DESC (which is already the default order from events)
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

    const visibleEvents = isExpanded ? sortedEvents : sortedEvents.slice(0, 4);

    // Exact impact summary by signal type
    const impactSummary = useMemo(() => {
        const summary: Record<string, number> = {};
        events.forEach(e => {
            if (e.confidence_delta !== 0) {
                summary[e.signal_type] = (summary[e.signal_type] || 0) + e.confidence_delta;
            }
        });
        return Object.entries(summary).sort(([, a], [, b]) => Math.abs(b) - Math.abs(a));
    }, [events]);

    return (
        <div
            id="score-breakdown-card"
            className="relative bg-zinc-950/80 backdrop-blur-2xl border border-white/[0.06] rounded-2xl shadow-2xl overflow-hidden"
        >
            {/* ── Ambient lighting ── */}
            <div className="absolute -top-32 -right-32 w-64 h-64 bg-gradient-to-br from-violet-600/8 to-blue-500/8 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute -bottom-32 -left-32 w-64 h-64 bg-gradient-to-tr from-emerald-600/8 to-cyan-500/8 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />

            <div className="relative z-10 p-6 lg:p-8">
                {/* ── Header ── */}
                <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-6 mb-8">
                    <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500/20 to-blue-500/20 border border-violet-500/20">
                                <Activity size={16} className="text-violet-400" />
                            </div>
                            <h3 className="text-xl font-bold text-zinc-100">Score Breakdown</h3>
                        </div>
                        <p className="text-sm text-zinc-500 ml-11 mb-3">Net impact from recent validation signals</p>

                        {/* Exact Signal Impact Summary */}
                        <div className="flex flex-wrap gap-2 ml-11">
                            {impactSummary.map(([type, impact]) => {
                                const isPositive = impact > 0;
                                return (
                                    <span
                                        key={type}
                                        className={cn(
                                            "inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-md border backdrop-blur-sm",
                                            isPositive
                                                ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                                                : "bg-red-500/10 border-red-500/20 text-red-400"
                                        )}
                                    >
                                        <span className="font-bold">{isPositive ? '+' : ''}{impact}</span>
                                        <span className="text-zinc-300">from {formatSignalLabel(type)}</span>
                                    </span>
                                );
                            })}
                        </div>
                    </div>

                    {/* Score Ring */}
                    <div className="flex-shrink-0 self-center lg:self-start">
                        <ScoreRing score={currentScore} />
                    </div>
                </div>

                {/* ── Toolbar ── */}
                <div className="flex items-center justify-between mb-5">
                    <h4 className="text-sm font-semibold text-zinc-300 flex items-center gap-2">
                        <span className="inline-block w-1.5 h-1.5 rounded-full bg-violet-400 animate-pulse" />
                        Contributing Signals
                        <span className="text-xs font-mono text-zinc-600">({filteredEvents.length})</span>
                    </h4>

                    {/* Filter dropdown */}
                    <div className="relative">
                        <button
                            id="score-breakdown-filter-btn"
                            onClick={() => setIsFilterOpen(!isFilterOpen)}
                            className={cn(
                                "flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all duration-200",
                                isFilterOpen
                                    ? "bg-white/10 border-white/15 text-zinc-200"
                                    : "bg-white/5 border-white/[0.06] text-zinc-400 hover:text-zinc-200 hover:bg-white/10"
                            )}
                        >
                            <Filter size={12} />
                            {filterType === 'ALL' ? 'All Types' : filterType.replace(/_/g, ' ')}
                            <ChevronDown size={12} className={cn("transition-transform duration-200", isFilterOpen && "rotate-180")} />
                        </button>

                        {isFilterOpen && (
                            <div className="absolute right-0 top-full mt-1 w-52 bg-zinc-900/95 backdrop-blur-xl border border-white/10 rounded-xl shadow-2xl z-30 overflow-hidden py-1">
                                {uniqueTypes.map(t => (
                                    <button
                                        key={t}
                                        onClick={() => { setFilterType(t); setIsFilterOpen(false); }}
                                        className={cn(
                                            "w-full text-left px-4 py-2.5 text-xs font-medium transition-colors flex items-center gap-2.5",
                                            filterType === t
                                                ? "bg-violet-500/15 text-violet-300"
                                                : "text-zinc-400 hover:bg-white/5 hover:text-zinc-200"
                                        )}
                                    >
                                        {t !== 'ALL' && getSignalIcon(t)}
                                        {t === 'ALL' ? (
                                            <span className="flex items-center gap-2">
                                                <span className="w-4 h-4 flex items-center justify-center rounded bg-zinc-700/50">
                                                    <span className="text-[9px]">✦</span>
                                                </span>
                                                All Types
                                            </span>
                                        ) : (
                                            t.replace(/_/g, ' ')
                                        )}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* ── Signal List ── */}
                <div className="space-y-2.5">
                    {isLoading ? (
                        <div className="space-y-2.5">
                            {[...Array(4)].map((_, i) => <SkeletonRow key={i} />)}
                        </div>
                    ) : filteredEvents.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 text-zinc-500 border border-dashed border-white/[0.06] rounded-xl">
                            <Eye size={24} className="mb-3 text-zinc-600" />
                            <p className="text-sm font-medium">No validation signals yet</p>
                            <p className="text-xs text-zinc-600 mt-1">Signals will appear here as they are received</p>
                        </div>
                    ) : (
                        visibleEvents.map((evt, idx) => (
                            <SignalRow key={evt.id} evt={evt} index={idx} />
                        ))
                    )}
                </div>

                {/* ── Expand / Collapse ── */}
                {filteredEvents.length > 4 && (
                    <button
                        id="score-breakdown-expand-btn"
                        onClick={() => setIsExpanded(!isExpanded)}
                        className={cn(
                            "w-full flex items-center justify-center gap-2 text-xs font-semibold py-3 mt-4 rounded-xl border transition-all duration-300",
                            "bg-white/[0.03] border-white/[0.06] text-zinc-400",
                            "hover:bg-white/[0.06] hover:border-white/[0.10] hover:text-zinc-200",
                        )}
                    >
                        {isExpanded ? (
                            <>
                                <ChevronUp size={14} />
                                Collapse History
                            </>
                        ) : (
                            <>
                                <ChevronDown size={14} />
                                View All {filteredEvents.length} Signals
                            </>
                        )}
                    </button>
                )}
            </div>
        </div>
    );
};
