import React, { useEffect, useState, useMemo, Suspense } from 'react';
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
    <div className={cn("rounded-[11px] border border-[#363739] bg-[#07080a] shadow-subtle-4", height, "flex items-center justify-center")}>
        <div className="flex flex-col items-center gap-3">
            <span className="w-8 h-8 border-2 border-[#e6e6e6] border-t-transparent rounded-full animate-spin" />
            <span className="text-xs text-[#6a6b6c] font-mono">Loading module…</span>
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
                    "rounded-[11px] border border-[#ff6363]/40 bg-[#452324]/10 flex flex-col items-center justify-center gap-2 p-6 shadow-subtle-4",
                    this.props.fallbackHeight || "h-48"
                )}>
                    <AlertTriangle size={20} className="text-[#ff6363]" />
                    <p className="text-sm font-bold text-[#ff6363]">
                        {this.props.moduleName || 'Module'} failed to load
                    </p>
                    <p className="text-xs text-[#6a6b6c] max-w-md text-center font-mono">
                        {this.state.error?.message || 'An unexpected error occurred'}
                    </p>
                    <button
                        onClick={() => this.setState({ hasError: false })}
                        className="mt-2 px-3 py-1.5 text-xs font-bold rounded-[8px] border border-[#454647] hover:border-white/40 transition-colors text-[#9c9c9d] hover:text-white bg-transparent shadow-subtle-2"
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
        <div id={id} className="border border-[#363739] rounded-[11px] overflow-hidden bg-[#07080a] shadow-subtle-4">
            {/* Header — clickable only on mobile when mobileOnly */}
            <button
                onClick={() => setIsOpen(o => !o)}
                className={cn(
                    "w-full flex items-center justify-between px-5 py-4 text-left transition-colors",
                    "hover:bg-white/5",
                    mobileOnly ? "lg:hidden" : ""
                )}
            >
                <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center w-8 h-8 rounded-[8px] border border-white/5 text-[#ffffff] bg-[#1b1c1e] shadow-subtle-2">
                        {icon}
                    </div>
                    <span className="font-bold text-sm text-[#ffffff] uppercase tracking-wider font-sans">{title}</span>
                    {badge}
                </div>
                <ChevronDown
                    size={16}
                    className={cn(
                        "text-[#6a6b6c] transition-transform duration-300",
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
            "inline-flex items-center gap-2 px-2 py-0.5 rounded-[6px] text-[10px] font-mono font-medium uppercase tracking-[0.04em] border shadow-subtle-2",
            isOpen
                ? "border-white/10 text-[#ffffff] bg-[#1b1c1e]"
                : "border-[#ff6363]/40 text-[#ff6363] bg-[#452324]/20"
        )}>
            <span className={cn(
                "w-1.5 h-1.5 rounded-full",
                isOpen ? "bg-[#59d499]" : "bg-[#ff6363]"
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
            <div className="flex flex-col items-center justify-center h-64 text-[#6a6b6c]">
                <span className="w-8 h-8 border-4 border-[#e6e6e6] border-t-transparent rounded-full animate-spin mb-4" />
                <p className="font-mono text-xs">Loading details...</p>
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
        ? "text-white"
        : confidenceScore >= 50
            ? "text-[#9c9c9d]"
            : "text-[#ff6363]";

    const scoreBarColor = confidenceScore >= 80
        ? "bg-white"
        : confidenceScore >= 50
            ? "bg-[#9c9c9d]"
            : "bg-[#ff6363]";

    return (
        <div className="space-y-6">
            <button
                id="back-to-places-btn"
                onClick={onBack}
                className="mb-6 flex items-center gap-2 text-xs font-mono text-[#6a6b6c] hover:text-[#ffffff] transition-colors group"
            >
                <ArrowLeft size={14} className="transition-transform group-hover:-translate-x-1" />
                Back to Places
            </button>

            {/* ────────────────────────────────────────────────── */}
            {/* TOP ROW: Place Summary + Score + Status Badge     */}
            {/* Desktop: 3 columns  |  Tablet: 2+1  |  Mobile: 1 */}
            {/* ────────────────────────────────────────────────── */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                {/* Place Summary Card */}
                <div className="md:col-span-2 bg-[#07080a] border border-[#363739] rounded-[11px] p-5 md:p-6 flex flex-col justify-between shadow-subtle-4">
                    <div>
                        <div className="flex flex-wrap items-center gap-3 mb-2">
                            <div className="flex items-center justify-center w-10 h-10 rounded-[8px] border border-white/5 text-[#ff6363] bg-[#1b1c1e] shadow-subtle-2">
                                <MapPin size={20} />
                            </div>
                            <h1 id="place-name" className="text-2xl md:text-3xl font-semibold tracking-tight text-[#ffffff]">{place.name}</h1>
                            
                            {/* Derived Status */}
                            {place.derived_status && (
                                <div className={cn(
                                    "px-2 py-0.5 rounded-[6px] text-[10px] font-mono font-medium uppercase tracking-[0.04em] border w-fit shadow-subtle-2",
                                    place.derived_status === 'LIKELY_OPEN' ? "bg-[#1b1c1e] text-[#ffffff] border-white/10" :
                                    place.derived_status === 'UNCERTAIN' ? "bg-[#452324]/10 text-[#ff6363]/80 border-[#ff6363]/20" :
                                    "bg-[#452324]/20 text-[#ff6363] border-[#ff6363]/40"
                                )}>
                                    {place.derived_status.replace(/_/g, ' ')}
                                </div>
                            )}

                            {/* Secondary Original Status */}
                            <div className="opacity-40 scale-75 origin-left">
                                <StatusBadge status={place.status} />
                            </div>

                            {isCurrentlyClosed && place.derived_status !== 'LIKELY_CLOSED' && (
                                <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-[6px] border border-[#ff6363]/40 text-[#ff6363] bg-[#452324]/20 text-[10px] font-mono font-medium animate-pulse shadow-subtle-2">
                                    <AlertTriangle size={14} />
                                    Suspicious behavior detected
                                </div>
                            )}
                        </div>

                        {/* Warning banner on mismatch */}
                        {place.status === 'OPEN' && place.derived_status === 'LIKELY_CLOSED' && (
                            <div className="mb-4 p-3 rounded-[8px] border border-[#ff6363]/40 bg-[#452324]/20 flex items-start gap-3 animate-in fade-in slide-in-from-top-2 text-[#ff6363] shadow-subtle-4">
                                <AlertTriangle className="text-[#ff6363] shrink-0 mt-0.5" size={18} />
                                <div>
                                    <p className="text-xs font-bold uppercase tracking-wider font-mono">Critical Intelligence Mismatch</p>
                                    <p className="text-[10px] opacity-80 leading-tight">Database state is OPEN, but real-time probability has collapsed. High risk of delivery failure.</p>
                                </div>
                            </div>
                        )}
                        <div className="flex flex-wrap items-center gap-3 text-sm text-[#6a6b6c] ml-[52px]">
                            <span className="font-mono bg-[#1b1c1e] border border-white/5 px-1.5 py-0.5 rounded-[6px] text-xs text-[#ffffff] shadow-subtle-2">{place.id}</span>
                            <span className="font-sans text-xs">{place.address || 'Address not registered'}</span>
                        </div>
                    </div>

                    {/* Action buttons + Validation timestamp */}
                    <div className="flex flex-wrap items-center justify-between gap-3 mt-5">
                        <div className="flex items-center gap-2 flex-wrap">
                            {place.last_validated_at && (
                                <div className={cn(
                                    "flex items-center gap-1.5 px-2 py-0.5 rounded-[6px] text-[10px] font-mono font-medium uppercase tracking-[0.04em] border shadow-subtle-2 bg-[#1b1c1e]",
                                    isStale
                                        ? "border-[#ff6363]/30 text-[#ff6363] bg-[#452324]/10"
                                        : "border-white/10 text-white"
                                )}>
                                    <Clock size={12} />
                                    {isStale ? `Stale (${lastValidatedText})` : `Verified ${lastValidatedText}`}
                                </div>
                            )}
                        </div>
                        <div className="flex gap-2">
                            <button className="px-4 py-2 border border-[#454647] rounded-[8px] text-xs font-bold hover:border-white/40 transition-colors bg-transparent text-[#9c9c9d] hover:text-white cursor-pointer shadow-subtle-2 font-sans">
                                Request Re-verify
                            </button>
                            <button className="px-5 py-2 bg-[#e6e6e6] text-[#2f3031] hover:opacity-90 rounded-[8px] text-xs font-bold transition-all cursor-pointer shadow-subtle font-sans">
                                Edit Metadata
                            </button>
                        </div>
                    </div>
                </div>

                {/* Current Score & Probability Card */}
                <div className="bg-[#07080a] border border-[#363739] rounded-[11px] p-5 md:p-6 flex flex-col justify-center items-center relative overflow-hidden shadow-subtle-4">
                    <div className="flex items-center gap-1.5 mb-3 relative z-10 group cursor-help">
                        <h3 className="font-bold text-xs uppercase tracking-wider text-[#6a6b6c] text-center">
                            Success Probability <br />
                            <span className="font-mono text-[9px] opacity-75 font-normal tracking-normal lowercase">
                                (Score: {confidenceScore})
                            </span>
                        </h3>
                        
                        {/* Hover Tooltip */}
                        <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 w-64 p-2.5 bg-[#1b1c1e] border border-[#363739] rounded-[8px] shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 text-xs text-white text-center shadow-subtle-4">
                            Real-world success probability mapped from historical delivery data (95% confidence).
                            <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-[#1b1c1e] border-b border-r border-[#363739] rotate-45" />
                        </div>
                    </div>
                    <span className={cn("text-5xl font-semibold font-mono tracking-tighter relative z-10", scoreColor)}>
                        <AnimatedScore score={Math.round((place.success_probability || (confidenceScore / 100)) * 100)} />
                        <span className="text-xl">%</span>
                    </span>

                    {/* Score bar / Confidence Band */}
                    <div className="w-full mt-4 relative z-10">
                        <div className="flex justify-between text-[10px] text-[#6a6b6c] mb-1 font-mono">
                            <span>{place.confidence_interval ? Math.round(place.confidence_interval[0] * 100) : 0}%</span>
                            <span>{place.confidence_interval ? Math.round(place.confidence_interval[1] * 100) : 100}%</span>
                        </div>
                        <div className="h-1.5 w-full bg-[#1b1c1e] rounded-full overflow-hidden relative">
                            {/* Confidence Interval Band */}
                            {place.confidence_interval && (
                                <div 
                                    className="absolute h-full bg-white/5 rounded-full"
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
                            <p className="text-[9px] text-[#6a6b6c] font-mono uppercase tracking-wider">95% Confidence Band</p>
                            {place.reliability === 'LOW' && (
                                <div className="flex items-center gap-1 text-[9px] text-[#ff6363] font-bold uppercase tracking-wider font-mono">
                                    <AlertTriangle size={10} />
                                    <span>Low confidence</span>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Expected Value & Decision Panel */}
                    {place.recommended_action && (
                        <div className="w-full mt-5 pt-4 border-t border-[#1b1c1e] relative z-10">
                            <div className="flex items-start gap-3">
                                <div className={cn(
                                    "flex-shrink-0 w-8 h-8 rounded-[8px] flex items-center justify-center border bg-[#1b1c1e] shadow-subtle-2",
                                    place.recommended_action === 'DELIVER' ? "border-white/10 text-white" :
                                    place.recommended_action === 'RETRY' ? "border-white/5 text-[#9c9c9d]" :
                                    "border-[#ff6363]/30 text-[#ff6363]"
                                )}>
                                    {place.recommended_action === 'DELIVER' ? <CheckCircle2 size={16} className="text-[#59d499]" /> :
                                     place.recommended_action === 'RETRY' ? <Clock size={16} className="text-[#9c9c9d]" /> :
                                     <AlertTriangle size={16} className="text-[#ff6363]" />}
                                </div>
                                <div>
                                    <h4 className="text-xs font-semibold uppercase tracking-wider flex items-center gap-2 text-white">
                                        Recommended: {place.recommended_action.charAt(0) + place.recommended_action.slice(1).toLowerCase()}
                                        <span className={cn(
                                            "text-[9px] font-mono px-1.5 py-0.5 rounded-[6px] border border-white/5 bg-[#1b1c1e] text-white shadow-subtle-2"
                                        )}>
                                            EV: {place.expected_value > 0 ? '+' : ''}{place.expected_value}
                                        </span>
                                    </h4>
                                    <p className="text-[11px] text-[#6a6b6c] mt-1 leading-relaxed">
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
                <div className="mb-4 bg-[#07080a] border border-[#363739] rounded-[11px] p-4 md:p-5 shadow-subtle-4" id="collapse-control-panel">
                    <div className="flex items-center justify-between mb-3">
                        <h3 className="text-xs font-bold uppercase tracking-widest text-[#ffffff] flex items-center gap-2">
                            <Shield size={14} className="text-[#ff6363]" />
                            Collapse Control Authority
                        </h3>
                        <div className={cn(
                            "flex items-center gap-1.5 px-2 py-0.5 rounded-[6px] text-[10px] font-mono font-medium uppercase tracking-[0.04em] border shadow-subtle-2",
                            place.collapse_allowed
                                ? "bg-transparent text-[#ff6363] border-[#ff6363]/40"
                                : "bg-[#1b1c1e] text-white border-white/10"
                        )}>
                            {place.collapse_allowed ? "⚠ COLLAPSE PERMITTED" : "✓ FLOOR ENFORCED"}
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        {/* Consensus Score Gauge */}
                        <div className="p-3 rounded-[8px] border border-white/5 bg-[#111214] shadow-subtle-2">
                            <p className="text-[10px] text-[#6a6b6c] font-mono mb-1.5 uppercase tracking-wider">Signal Consensus</p>
                            <div className="flex items-center gap-3">
                                <div className="h-1.5 flex-1 bg-[#1b1c1e] rounded-full overflow-hidden">
                                    <div
                                        className={cn(
                                            "h-full rounded-full transition-all duration-500",
                                            (place.signal_consensus_score ?? 0) >= 0.8 ? "bg-[#ff6363]" : "bg-white"
                                        )}
                                        style={{ width: `${Math.round((place.signal_consensus_score ?? 0) * 100)}%` }}
                                    />
                                </div>
                                <span className="text-sm font-semibold font-mono text-white">
                                    {((place.signal_consensus_score ?? 0) * 100).toFixed(0)}%
                                </span>
                            </div>
                            <p className="text-[9px] text-[#6a6b6c] mt-1 leading-normal">
                                {(place.signal_consensus_score ?? 0) >= 0.8
                                    ? "Strong closure consensus across sources"
                                    : (place.signal_consensus_score ?? 0) >= 0.4
                                        ? "Moderate evidence — monitoring"
                                        : "Weak or conflicting signals — floor active"}
                            </p>
                        </div>

                        {/* Collapse Reason */}
                        <div className="p-3 rounded-[8px] border border-white/5 bg-[#111214] shadow-subtle-2">
                            <p className="text-[10px] text-[#6a6b6c] font-mono mb-1.5 uppercase tracking-wider">Verdict Reason</p>
                            <p className={cn(
                                "text-xs font-bold font-mono",
                                place.collapse_reason === 'validated_closure_detected' ? "text-[#ff6363]" : "text-[#9c9c9d]"
                            )}>
                                {(place.collapse_reason ?? '').replace(/_/g, ' ').toUpperCase()}
                            </p>
                            <p className="text-[9px] text-[#6a6b6c] mt-1.5 leading-normal">
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
                        <div className="p-3 rounded-[8px] border border-white/5 bg-[#111214] shadow-subtle-2">
                            <p className="text-[10px] text-[#6a6b6c] font-mono mb-1.5 uppercase tracking-wider">Score Floor</p>
                            <div className="flex items-baseline gap-2">
                                <span className={cn(
                                    "text-2xl font-bold font-mono",
                                    place.collapse_allowed ? "text-[#ff6363]" : "text-white"
                                )}>
                                    {place.collapse_allowed ? "0" : "20"}
                                </span>
                                <span className="text-[10px] text-[#6a6b6c] font-mono">minimum allowed</span>
                            </div>
                            <p className="text-[9px] text-[#6a6b6c] mt-1.5 leading-normal">
                                {place.collapse_allowed
                                    ? "Evidence threshold met — unrestricted scoring"
                                    : "Protected — score cannot fall below floor without consensus"
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
                        <div className="p-0 bg-transparent h-[360px]">
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
                            <span className="flex items-center gap-1 text-[10px] font-bold text-[#ff6363]">
                                <span className="w-1.5 h-1.5 rounded-full bg-[#ff6363] animate-pulse" />
                                LIVE
                            </span>
                        }
                        defaultOpen={true}
                    >
                        <div className="p-0 bg-transparent h-[300px]">
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
                        <div className="p-5 bg-transparent">
                            {signalBreakdown.length > 0 ? (
                                <div className="space-y-4">
                                    {signalBreakdown.map((item, idx) => (
                                        <div key={idx}>
                                            <div className="flex justify-between text-sm mb-1.5">
                                                <span className="text-white font-normal">{item.type}</span>
                                                <span className="text-[#6a6b6c] font-mono text-xs">{item.percentage}% ({item.count})</span>
                                            </div>
                                            <div className="h-1.5 w-full bg-[#1b1c1e] rounded-full overflow-hidden">
                                                <div
                                                    className="h-full bg-white rounded-full transition-all duration-700 ease-out"
                                                    style={{ width: `${item.percentage}%` }}
                                                />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-sm text-[#6a6b6c] italic font-mono">Not enough data for breakdown.</p>
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
                        <div className="bg-transparent text-white rounded-b-[11px] overflow-hidden">
                            <div className="px-4 py-2.5 bg-transparent border-b border-[#1b1c1e] flex items-center justify-between">
                                <span className="text-[10px] font-mono text-[#6a6b6c] uppercase tracking-wider">JSON</span>
                                <Copy size={12}
                                    className="text-[#6a6b6c] hover:text-white cursor-pointer transition-colors"
                                    onClick={() => {
                                        navigator.clipboard.writeText(jsonSnippet);
                                        toast.success('Copied to clipboard');
                                    }}
                                />
                            </div>
                            <div className="p-4 overflow-x-auto bg-[#111214]">
                                <pre className="text-xs font-mono leading-relaxed text-white">
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
                    <span className="text-[10px] font-mono text-white border border-white/10 px-2 py-0.5 rounded-[6px] bg-[#1b1c1e] shadow-subtle-2">
                        {confidenceScore} pts
                    </span>
                }
                defaultOpen={true}
            >
                <div className="p-0 bg-transparent">
                    <SafeModule height="h-[320px]" name="Score Breakdown">
                        <ScoreBreakdown placeId={place.id} currentScore={confidenceScore} />
                    </SafeModule>
                </div>
            </AccordionSection>
        </div>
    );
};
