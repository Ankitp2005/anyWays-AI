import React, { useEffect, useState, useMemo, lazy, Suspense } from 'react';
import api from '../services/api';
import {
    ArrowLeft, CheckCircle2, AlertTriangle, Terminal, Copy, Clock,
    MapPin, ChevronDown, Activity, Shield, Wifi
} from 'lucide-react';
import { cn } from '../utils/cn';
import toast from 'react-hot-toast';
import { formatDistanceToNow } from 'date-fns';

/* ─── Standard imports for heavy modules (fixes HMR context loss) ──────────────── */
import { ConfidenceTimeline } from './dashboard/ConfidenceTimeline';
import { LiveSignalFeed } from './dashboard/LiveSignalFeed';
import { ScoreBreakdown } from './dashboard/ScoreBreakdown';
import { useLiveSignals } from '../hooks/useLiveSignals';
import { 
    captureOperationalError, 
    ErrorCategory, 
    generateTraceContext 
} from '../lib/observability';

/* ─── Skeleton loader ──────────────────────────────────────── */
const SectionSkeleton = ({ height = 'h-64' }: { height?: string }) => (
    <div className={cn("rounded-xl border border-border bg-card/50", height, "flex items-center justify-center")}>
        <div className="flex flex-col items-center gap-3">
            <span className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
            <span className="text-xs text-muted-foreground">Loading module…</span>
        </div>
    </div>
);

/* ─── Error Boundary ───────────────────────────────────────── */
interface ErrorBoundaryState { hasError: boolean; error?: Error }

class ModuleErrorBoundary extends React.Component<
    { children: React.ReactNode; fallbackHeight?: string; moduleName?: string },
    ErrorBoundaryState
> {
    constructor(props: any) {
        super(props);
        this.state = { hasError: false };
    }

    static getDerivedStateFromError(error: Error): ErrorBoundaryState {
        return { hasError: true, error };
    }

    render() {
        if (this.state.hasError) {
            return (
                <div className={cn(
                    "rounded-xl border border-destructive/30 bg-destructive/5 flex flex-col items-center justify-center gap-2 p-6",
                    this.props.fallbackHeight || "h-48"
                )}>
                    <AlertTriangle size={20} className="text-destructive" />
                    <p className="text-sm font-medium text-destructive">
                        {this.props.moduleName || 'Module'} failed to load
                    </p>
                    <p className="text-xs text-muted-foreground max-w-md text-center">
                        {this.state.error?.message || 'An unexpected error occurred'}
                    </p>
                    <button
                        onClick={() => this.setState({ hasError: false })}
                        className="mt-2 px-3 py-1 text-xs font-medium rounded-md border border-border hover:bg-secondary transition-colors"
                    >
                        Retry
                    </button>
                </div>
            );
        }
        return this.props.children;
    }
}

/* ─── Safe lazy module wrapper ─────────────────────────────── */
const SafeModule: React.FC<{
    children: React.ReactNode;
    height?: string;
    name?: string;
}> = ({ children, height = 'h-64', name }) => (
    <ModuleErrorBoundary fallbackHeight={height} moduleName={name}>
        <Suspense fallback={<SectionSkeleton height={height} />}>
            {children}
        </Suspense>
    </ModuleErrorBoundary>
);
interface AccordionSectionProps {
    id: string;
    title: string;
    icon: React.ReactNode;
    badge?: React.ReactNode;
    defaultOpen?: boolean;
    children: React.ReactNode;
    /** Only render accordion behavior below this breakpoint; above it, always show open */
    mobileOnly?: boolean;
}

const AccordionSection: React.FC<AccordionSectionProps> = ({
    id, title, icon, badge, defaultOpen = true, children, mobileOnly = true
}) => {
    const [isOpen, setIsOpen] = useState(defaultOpen);

    return (
        <div id={id} className="border border-border rounded-xl overflow-hidden bg-card/30 backdrop-blur-sm">
            {/* Header — clickable only on mobile when mobileOnly */}
            <button
                onClick={() => setIsOpen(o => !o)}
                className={cn(
                    "w-full flex items-center justify-between px-5 py-4 text-left transition-colors",
                    "hover:bg-secondary/30",
                    mobileOnly ? "lg:hidden" : ""
                )}
            >
                <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary/10 text-primary">
                        {icon}
                    </div>
                    <span className="font-semibold text-sm text-foreground">{title}</span>
                    {badge}
                </div>
                <ChevronDown
                    size={16}
                    className={cn(
                        "text-muted-foreground transition-transform duration-300",
                        isOpen && "rotate-180"
                    )}
                />
            </button>

            {/* Desktop: always visible, no accordion */}
            {mobileOnly && (
                <div className="hidden lg:block p-0">
                    {children}
                </div>
            )}

            {/* Mobile/Tablet: accordion */}
            <div
                className={cn(
                    mobileOnly ? "lg:hidden" : "",
                    isOpen ? "accordion-content-open" : "accordion-content-closed pointer-events-none"
                )}
            >
                {children}
            </div>
        </div>
    );
};

/* ─── Status Badge ─────────────────────────────────────────── */
const StatusBadge = ({ status }: { status: string }) => {
    const isOpen = status === 'OPEN';
    return (
        <div className={cn(
            "inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider border",
            isOpen
                ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
                : "bg-red-500/10 text-red-500 border-red-500/20"
        )}>
            <span className={cn(
                "w-2 h-2 rounded-full",
                isOpen ? "bg-emerald-500 animate-pulse" : "bg-red-500"
            )} />
            {status.replace(/_/g, ' ')}
        </div>
    );
};

/* ─── Animated Score Display ───────────────────────────────── */
const AnimatedScore = ({ score }: { score: number }) => {
    const [displayValue, setDisplayValue] = useState(0);

    useEffect(() => {
        let start = 0;
        const end = score;
        const duration = 1200;
        const startTime = performance.now();
        let raf: number;

        const animate = (now: number) => {
            const elapsed = now - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const ease = 1 - Math.pow(1 - progress, 4);
            setDisplayValue(Math.round(start + (end - start) * ease));
            if (progress < 1) raf = requestAnimationFrame(animate);
        };

        raf = requestAnimationFrame(animate);
        return () => cancelAnimationFrame(raf);
    }, [score]);

    return <span>{displayValue}</span>;
};

/* ─── Main Component ───────────────────────────────────────── */

interface PlaceDetailsProps {
    placeId: string;
    onBack: () => void;
}

export const PlaceDetails: React.FC<PlaceDetailsProps> = ({ placeId, onBack }) => {
    const [place, setPlace] = useState<any | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchDetails = async () => {
            try {
                const data = await api.places.getPlace(placeId);
                setPlace(data);
            } catch (error: any) {
                // Log to Sentry
                const { traceId, correlationId } = generateTraceContext();
                captureOperationalError(error, {
                    category: ErrorCategory.INTELLIGENCE_FAILURE,
                    severity: 'error',
                    placeId,
                    traceId,
                    correlationId,
                    message: error.message
                });
                
                toast.error('Failed to load place details');
                onBack();
            } finally {
                setLoading(false);
            }
        };
        fetchDetails();
    }, [placeId, onBack]);

    // Data Processing for Visualizations
    const { signalBreakdown } = useMemo(() => {
        if (!place) return { signalBreakdown: [] };

        // Signal Breakdown
        const signals = place.validation_signals || [];
        const typeCounts = signals.reduce((acc: any, s: any) => {
            acc[s.signal_type] = (acc[s.signal_type] || 0) + 1;
            return acc;
        }, {});
        
        const totalSignals = signals.length || 1;
        const breakdown = Object.entries(typeCounts).map(([type, count]: [string, any]) => ({
            type: type.replace(/_/g, ' '),
            rawType: type,
            count,
            percentage: Math.round((count / totalSignals) * 100)
        })).sort((a, b) => b.count - a.count);

        return { signalBreakdown: breakdown };
    }, [place]);

    /* ── Hooks ── */
    const { events } = useLiveSignals(place?.id ?? null);

    /* ── Loading state ── */
    if (loading || !place) {
        return (
            <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
                <span className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4" />
                <p>Loading details...</p>
            </div>
        );
    }

    /* ── Derived values ── */
    const latestClosedIndex = events.findIndex(e => e.signal_type === 'CLOSED_DETECTED');
    const strongPositivesSinceClosed = latestClosedIndex >= 0 
        ? events.slice(0, latestClosedIndex).filter(e => e.confidence_delta >= 5).length
        : 0;
    const isCurrentlyClosed = latestClosedIndex >= 0 && strongPositivesSinceClosed < 2;

    const confidenceScore = place.confidence_score ?? 0;
    let lastValidatedText = 'Never validated';
    let isStale = false;
    
    if (place.last_validated_at) {
        const d = new Date(place.last_validated_at);
        if (!isNaN(d.getTime())) {
            lastValidatedText = formatDistanceToNow(d, { addSuffix: true });
            isStale = (Date.now() - d.getTime()) > 30 * 86400000;
        }
    }

    const jsonSnippet = JSON.stringify({
        place_id: place.id,
        name: place.name,
        status: place.status,
        confidence: confidenceScore,
        last_validated: place.last_validated_at,
        signals_count: (place.validation_signals || []).length
    }, null, 2);

    const scoreColor = confidenceScore >= 80
        ? "text-emerald-500"
        : confidenceScore >= 50
            ? "text-orange-500"
            : "text-red-500";

    const scoreBarColor = confidenceScore >= 80
        ? "bg-emerald-500"
        : confidenceScore >= 50
            ? "bg-orange-500"
            : "bg-red-500";

    /* ── Render ── */
    return (
        <div className="animate-in" id="trust-intelligence-dashboard">
            {/* ────────────────────────────────────────────────── */}
            {/* BACK BUTTON                                       */}
            {/* ────────────────────────────────────────────────── */}
            <button
                id="back-to-places-btn"
                onClick={onBack}
                className="mb-6 flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors group"
            >
                <ArrowLeft size={16} className="transition-transform group-hover:-translate-x-1" />
                Back to Places
            </button>

            {/* ────────────────────────────────────────────────── */}
            {/* TOP ROW: Place Summary + Score + Status Badge     */}
            {/* Desktop: 3 columns  |  Tablet: 2+1  |  Mobile: 1 */}
            {/* ────────────────────────────────────────────────── */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                {/* Place Summary Card */}
                <div className="md:col-span-2 bg-card border border-border rounded-xl p-5 md:p-6 shadow-sm flex flex-col justify-between">
                    <div>
                        <div className="flex flex-wrap items-center gap-3 mb-2">
                            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-primary/10 text-primary">
                                <MapPin size={20} />
                            </div>
                            <h1 id="place-name" className="text-2xl md:text-3xl font-bold tracking-tight">{place.name}</h1>
                            
                            {/* Task 3: Prominent Derived Status */}
                            {place.derived_status && (
                                <div className={cn(
                                    "px-3.5 py-1.5 rounded-full text-xs font-black uppercase tracking-widest border shadow-sm",
                                    place.derived_status === 'LIKELY_OPEN' ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" :
                                    place.derived_status === 'UNCERTAIN' ? "bg-amber-500/10 text-amber-500 border-amber-500/20" :
                                    "bg-red-600/10 text-red-600 border-red-600/20"
                                )}>
                                    {place.derived_status.replace(/_/g, ' ')}
                                </div>
                            )}

                            {/* Secondary Original Status */}
                            <div className="opacity-40 scale-75 origin-left">
                                <StatusBadge status={place.status} />
                            </div>

                            {isCurrentlyClosed && place.derived_status !== 'LIKELY_CLOSED' && (
                                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-500/10 border border-red-500/20 text-red-500 text-xs font-bold animate-pulse">
                                    <AlertTriangle size={14} />
                                    ⚠️ Suspicious behavior detected
                                </div>
                            )}
                        </div>

                        {/* Task 3: Warning banner on mismatch */}
                        {place.status === 'OPEN' && place.derived_status === 'LIKELY_CLOSED' && (
                            <div className="mb-4 p-3 rounded-xl bg-red-600/10 border border-red-600/20 flex items-start gap-3 animate-in fade-in slide-in-from-top-2">
                                <AlertTriangle className="text-red-600 shrink-0 mt-0.5" size={18} />
                                <div>
                                    <p className="text-xs font-black text-red-600 uppercase tracking-tight">Critical Intelligence Mismatch</p>
                                    <p className="text-[10px] text-red-600/80 leading-tight">Database state is OPEN, but real-time probability has collapsed. High risk of delivery failure.</p>
                                </div>
                            </div>
                        )}
                        <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground ml-[52px]">
                            <span className="font-mono bg-secondary px-1.5 py-0.5 rounded text-xs">{place.id}</span>
                            <span>{place.address || 'Address not registered'}</span>
                        </div>
                    </div>

                    {/* Action buttons + Validation timestamp */}
                    <div className="flex flex-wrap items-center justify-between gap-3 mt-5">
                        <div className="flex items-center gap-2 flex-wrap">
                            {place.last_validated_at && (
                                <div className={cn(
                                    "flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border",
                                    isStale
                                        ? "bg-red-50 text-red-600 border-red-200 dark:bg-red-900/20 dark:border-red-800"
                                        : "bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:border-green-800"
                                )}>
                                    <Clock size={12} />
                                    {isStale ? `Stale (${lastValidatedText})` : `Verified ${lastValidatedText}`}
                                </div>
                            )}
                        </div>
                        <div className="flex gap-2">
                            <button className="px-3 py-1.5 border border-border rounded-lg text-xs font-medium hover:bg-secondary transition-colors">
                                Request Re-verify
                            </button>
                            <button className="px-3 py-1.5 bg-primary text-primary-foreground rounded-lg text-xs font-medium hover:bg-primary/90 transition-colors">
                                Edit Metadata
                            </button>
                        </div>
                    </div>
                </div>

                {/* Current Score & Probability Card */}
                <div className="bg-card border border-border rounded-xl p-5 md:p-6 shadow-sm flex flex-col justify-center items-center relative overflow-hidden">
                    {/* Subtle ambient glow */}
                    <div className={cn(
                        "absolute -top-10 -right-10 w-32 h-32 rounded-full blur-3xl opacity-20 pointer-events-none",
                        confidenceScore >= 80 ? "bg-emerald-500" : confidenceScore >= 50 ? "bg-orange-500" : "bg-red-500"
                    )} />

                    <div className="flex items-center gap-1.5 mb-3 relative z-10 group cursor-help">
                        <h3 className="font-semibold text-sm text-muted-foreground text-center">
                            Success Probability <br />
                            <span className="font-normal text-[10px] opacity-75">
                                (Score: {confidenceScore})
                            </span>
                        </h3>
                        
                        {/* Hover Tooltip */}
                        <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 w-64 p-2.5 bg-zinc-900 border border-zinc-800 rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 text-xs text-zinc-300 text-center">
                            Real-world success probability mapped from historical delivery data (95% confidence).
                            <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-zinc-900 border-b border-r border-zinc-800 rotate-45" />
                        </div>
                    </div>
                    <span className={cn("text-5xl font-black font-mono tracking-tighter relative z-10", scoreColor)}>
                        <AnimatedScore score={Math.round((place.success_probability || (confidenceScore / 100)) * 100)} />
                        <span className="text-xl">%</span>
                    </span>

                    {/* Score bar / Confidence Band */}
                    <div className="w-full mt-4 relative z-10">
                        <div className="flex justify-between text-[10px] text-muted-foreground mb-1 font-mono">
                            <span>{place.confidence_interval ? Math.round(place.confidence_interval[0] * 100) : 0}%</span>
                            <span>{place.confidence_interval ? Math.round(place.confidence_interval[1] * 100) : 100}%</span>
                        </div>
                        <div className="h-2 w-full bg-secondary rounded-full overflow-hidden relative">
                            {/* Confidence Interval Band */}
                            {place.confidence_interval && (
                                <div 
                                    className="absolute h-full bg-primary/20 rounded-full"
                                    style={{ 
                                        left: `${Math.max(0, place.confidence_interval[0] * 100)}%`, 
                                        width: `${Math.min(100, (place.confidence_interval[1] - place.confidence_interval[0]) * 100)}%` 
                                    }}
                                />
                            )}
                            {/* Exact Probability Point */}
                            <div
                                className={cn("absolute h-full w-2 rounded-full transform -translate-x-1/2", scoreBarColor)}
                                style={{ left: `${Math.round((place.success_probability || (confidenceScore / 100)) * 100)}%` }}
                            />
                        </div>
                        
                        <div className="flex items-center justify-between mt-2">
                            <p className="text-[10px] text-muted-foreground">95% Confidence Band</p>
                            {place.reliability === 'LOW' && (
                                <div className="flex items-center gap-1 text-[10px] text-orange-500 font-medium">
                                    <AlertTriangle size={10} />
                                    <span>Low confidence (limited data)</span>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Expected Value & Decision Panel */}
                    {place.recommended_action && (
                        <div className="w-full mt-5 pt-4 border-t border-border relative z-10">
                            <div className="flex items-start gap-3">
                                <div className={cn(
                                    "flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center",
                                    place.recommended_action === 'DELIVER' ? "bg-emerald-500/20 text-emerald-500" :
                                    place.recommended_action === 'RETRY' ? "bg-orange-500/20 text-orange-500" :
                                    "bg-red-500/20 text-red-500"
                                )}>
                                    {place.recommended_action === 'DELIVER' ? <CheckCircle2 size={16} /> :
                                     place.recommended_action === 'RETRY' ? <Clock size={16} /> :
                                     <AlertTriangle size={16} />}
                                </div>
                                <div>
                                    <h4 className="text-sm font-bold flex items-center gap-2">
                                        Recommended: {place.recommended_action.charAt(0) + place.recommended_action.slice(1).toLowerCase()}
                                        <span className={cn(
                                            "text-[10px] font-mono px-1.5 py-0.5 rounded border border-border",
                                            place.expected_value > 0 ? "bg-emerald-500/10 text-emerald-400" : "bg-red-500/10 text-red-400"
                                        )}>
                                            EV: {place.expected_value > 0 ? '+' : ''}{place.expected_value}
                                        </span>
                                    </h4>
                                    <p className="text-[11px] text-muted-foreground mt-1 leading-relaxed">
                                        {place.reasoning}
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* ────────────────────────────────────────────────── */}
            {/* COLLAPSE CONTROL PANEL (Rule 5: UI Transparency)  */}
            {/* ────────────────────────────────────────────────── */}
            {place.collapse_reason && (
                <div className="mb-4 bg-card border border-border rounded-xl p-4 md:p-5 shadow-sm" id="collapse-control-panel">
                    <div className="flex items-center justify-between mb-3">
                        <h3 className="text-xs font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                            <Shield size={14} className="text-primary" />
                            Collapse Control Authority
                        </h3>
                        <div className={cn(
                            "flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border",
                            place.collapse_allowed
                                ? "bg-red-500/10 text-red-500 border-red-500/20"
                                : "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
                        )}>
                            {place.collapse_allowed ? "⚠ COLLAPSE PERMITTED" : "✓ FLOOR ENFORCED"}
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        {/* Consensus Score Gauge */}
                        <div className="p-3 rounded-lg bg-secondary/30 border border-border/50">
                            <p className="text-[10px] text-muted-foreground font-medium mb-1.5">Signal Consensus</p>
                            <div className="flex items-center gap-3">
                                <div className="h-2 flex-1 bg-secondary rounded-full overflow-hidden">
                                    <div
                                        className={cn(
                                            "h-full rounded-full transition-all duration-500",
                                            (place.signal_consensus_score ?? 0) >= 0.8 ? "bg-red-500" :
                                            (place.signal_consensus_score ?? 0) >= 0.4 ? "bg-amber-500" :
                                            "bg-emerald-500"
                                        )}
                                        style={{ width: `${Math.round((place.signal_consensus_score ?? 0) * 100)}%` }}
                                    />
                                </div>
                                <span className="text-sm font-black font-mono">
                                    {((place.signal_consensus_score ?? 0) * 100).toFixed(0)}%
                                </span>
                            </div>
                            <p className="text-[9px] text-muted-foreground mt-1">
                                {(place.signal_consensus_score ?? 0) >= 0.8
                                    ? "Strong closure consensus across sources"
                                    : (place.signal_consensus_score ?? 0) >= 0.4
                                        ? "Moderate evidence — monitoring"
                                        : "Weak or conflicting signals — floor active"}
                            </p>
                        </div>

                        {/* Collapse Reason */}
                        <div className="p-3 rounded-lg bg-secondary/30 border border-border/50">
                            <p className="text-[10px] text-muted-foreground font-medium mb-1.5">Verdict Reason</p>
                            <p className={cn(
                                "text-xs font-bold font-mono",
                                place.collapse_reason === 'validated_closure_detected' ? "text-red-500" :
                                place.collapse_reason === 'decay_override_no_activity' ? "text-amber-500" :
                                place.collapse_reason === 'partial_evidence_uncertain' ? "text-orange-400" :
                                "text-emerald-500"
                            )}>
                                {(place.collapse_reason ?? '').replace(/_/g, ' ').toUpperCase()}
                            </p>
                            <p className="text-[9px] text-muted-foreground mt-1.5 leading-tight">
                                {place.collapse_reason === 'validated_closure_detected'
                                    ? "≥3 closure signals from ≥2 trusted API keys confirmed"
                                    : place.collapse_reason === 'decay_override_no_activity'
                                        ? "No signals in 48+ hours — stale data override"
                                        : place.collapse_reason === 'partial_evidence_uncertain'
                                            ? "1–2 closure signals or mixed evidence — clamped to 20–40"
                                            : "Insufficient multi-source consensus to allow score collapse"
                                }
                            </p>
                        </div>

                        {/* Protection Status */}
                        <div className="p-3 rounded-lg bg-secondary/30 border border-border/50">
                            <p className="text-[10px] text-muted-foreground font-medium mb-1.5">Score Floor</p>
                            <div className="flex items-baseline gap-2">
                                <span className={cn(
                                    "text-2xl font-black font-mono",
                                    place.collapse_allowed ? "text-red-500" : "text-emerald-500"
                                )}>
                                    {place.collapse_allowed ? "0" : "20"}
                                </span>
                                <span className="text-[10px] text-muted-foreground">minimum allowed</span>
                            </div>
                            <p className="text-[9px] text-muted-foreground mt-1.5 leading-tight">
                                {place.collapse_allowed
                                    ? "Evidence threshold met — unrestricted scoring"
                                    : "Protected — score cannot fall below floor without multi-source consensus"
                                }
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* ────────────────────────────────────────────────── */}
            {/* MIDDLE: Timeline + Sidebar (Live Feed + API)      */}
            {/* Desktop: 3-col grid  |  Tablet/Mobile: stacked    */}
            {/* ────────────────────────────────────────────────── */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
                {/* Confidence Timeline — spans 2 cols on desktop */}
                <div className="lg:col-span-2">
                    <AccordionSection
                        id="section-confidence-timeline"
                        title="Confidence Timeline"
                        icon={<Activity size={16} />}
                        defaultOpen={true}
                    >
                        <div className="p-0">
                            <SafeModule height="h-[360px]" name="Timeline">
                                <ConfidenceTimeline placeId={place.id} />
                            </SafeModule>
                        </div>
                    </AccordionSection>
                </div>

                {/* Right Sidebar — Live Signal Feed + extras */}
                <div className="space-y-4">
                    {/* Live Signal Feed */}
                    <AccordionSection
                        id="section-live-feed"
                        title="Live Signal Feed"
                        icon={<Wifi size={16} />}
                        badge={
                            <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-500">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                LIVE
                            </span>
                        }
                        defaultOpen={true}
                    >
                        <div className="p-0">
                            <SafeModule height="h-[300px]" name="Live Feed">
                                <LiveSignalFeed placeId={place.id} />
                            </SafeModule>
                        </div>
                    </AccordionSection>

                    {/* Signal Distribution */}
                    <AccordionSection
                        id="section-signal-distribution"
                        title="Signal Distribution"
                        icon={<Shield size={16} />}
                        defaultOpen={false}
                    >
                        <div className="p-5">
                            {signalBreakdown.length > 0 ? (
                                <div className="space-y-4">
                                    {signalBreakdown.map((item, idx) => (
                                        <div key={idx}>
                                            <div className="flex justify-between text-sm mb-1.5">
                                                <span className="text-foreground font-medium">{item.type}</span>
                                                <span className="text-muted-foreground font-mono text-xs">{item.percentage}% ({item.count})</span>
                                            </div>
                                            <div className="h-1.5 w-full bg-secondary rounded-full overflow-hidden">
                                                <div
                                                    className="h-full bg-primary rounded-full transition-all duration-700 ease-out"
                                                    style={{ width: `${item.percentage}%` }}
                                                />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-sm text-muted-foreground italic">Not enough data for breakdown.</p>
                            )}
                        </div>
                    </AccordionSection>

                    {/* API Export Preview */}
                    <AccordionSection
                        id="section-api-preview"
                        title="API Export Preview"
                        icon={<Terminal size={16} />}
                        defaultOpen={false}
                    >
                        <div className="bg-zinc-950 text-zinc-50 rounded-b-xl overflow-hidden">
                            <div className="px-4 py-2.5 bg-zinc-900 border-b border-zinc-800 flex items-center justify-between">
                                <span className="text-[10px] font-medium text-zinc-400 uppercase tracking-wider">JSON</span>
                                <Copy size={12}
                                    className="text-zinc-500 hover:text-zinc-300 cursor-pointer transition-colors"
                                    onClick={() => {
                                        navigator.clipboard.writeText(jsonSnippet);
                                        toast.success('Copied to clipboard');
                                    }}
                                />
                            </div>
                            <div className="p-4 overflow-x-auto">
                                <pre className="text-xs font-mono leading-relaxed text-zinc-300">
                                    {jsonSnippet}
                                </pre>
                            </div>
                        </div>
                    </AccordionSection>
                </div>
            </div>

            {/* ────────────────────────────────────────────────── */}
            {/* BOTTOM: Score Explanation Panel (full width)       */}
            {/* ────────────────────────────────────────────────── */}
            <AccordionSection
                id="section-score-breakdown"
                title="Score Explanation"
                icon={<Activity size={16} />}
                badge={
                    <span className="text-[10px] font-mono text-muted-foreground bg-secondary px-2 py-0.5 rounded-full">
                        {confidenceScore} pts
                    </span>
                }
                defaultOpen={true}
            >
                <div className="p-0">
                    <SafeModule height="h-[320px]" name="Score Breakdown">
                        <ScoreBreakdown placeId={place.id} currentScore={confidenceScore} />
                    </SafeModule>
                </div>
            </AccordionSection>
        </div>
    );
};
