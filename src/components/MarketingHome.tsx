import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
    ArrowRight, MapPin, Shield, AlertTriangle, Activity, Eye, 
    XCircle, TrendingDown, CheckCircle2, Zap, 
    BarChart3, Clock, Sun, Moon
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useTheme } from '../context/ThemeContext';
import { cn } from '../utils/cn';

/* ─── Animated Counter ─────────────────────────────────────────── */

const AnimatedNumber = ({ target, duration = 2000 }: { target: number; duration?: number }) => {
    const [value, setValue] = useState(0);

    useEffect(() => {
        const start = performance.now();
        const animate = (now: number) => {
            const elapsed = now - start;
            const progress = Math.min(elapsed / duration, 1);
            const ease = 1 - Math.pow(1 - progress, 3);
            setValue(Math.round(target * ease));
            if (progress < 1) requestAnimationFrame(animate);
        };
        requestAnimationFrame(animate);
    }, [target, duration]);

    return <span>{value}</span>;
};

/* ─── Fake Signal Feed Demo ────────────────────────────────────── */

const demoSignals = [
    { type: 'PICKUP_LOCATION_VERIFIED', label: 'Pickup verified', delta: +18, time: '2s ago', icon: Shield, color: 'emerald' },
    { type: 'FOOT_TRAFFIC', label: 'Foot traffic detected', delta: +7, time: '5s ago', icon: Activity, color: 'blue' },
    { type: 'OCR_MENU', label: 'Menu detected via OCR', delta: +5, time: '8s ago', icon: Eye, color: 'violet' },
    { type: 'CLOSED_DETECTED', label: 'Closure detected', delta: -25, time: '12s ago', icon: XCircle, color: 'red' },
    { type: 'LOW_TRAFFIC', label: 'Low traffic observed', delta: -8, time: '15s ago', icon: TrendingDown, color: 'orange' },
];

const DemoFeed = () => {
    const [visibleCount, setVisibleCount] = useState(0);

    useEffect(() => {
        const interval = setInterval(() => {
            setVisibleCount(prev => {
                if (prev >= demoSignals.length) {
                    clearInterval(interval);
                    return prev;
                }
                return prev + 1;
            });
        }, 800);
        return () => clearInterval(interval);
    }, []);

    return (
        <div className="space-y-3">
            {demoSignals.slice(0, visibleCount).map((sig, idx) => {
                const Icon = sig.icon;
                const isPositive = sig.delta > 0;
                return (
                    <div
                        key={sig.type}
                        className={cn(
                            "flex items-center justify-between p-3.5 rounded-[11px] border bg-[#111214] transition-all duration-500",
                            idx === 0 ? "border-[#454647] shadow-subtle" : "border-[#1b1c1e]/50",
                            "animate-in slide-in-from-top-2 fade-in"
                        )}
                        style={{ animationDelay: `${idx * 100}ms` }}
                    >
                        <div className="flex items-center gap-3">
                            <div className={cn(
                                "p-2 rounded-[8px] border bg-transparent",
                                isPositive ? "border-white/10 text-white" : "border-[#ff6363]/40 text-[#ff6363]"
                            )}>
                                <Icon size={14} />
                            </div>
                            <div>
                                <p className="text-sm font-medium text-[#ffffff]">{sig.label}</p>
                                <p className="text-[11px] text-[#6a6b6c] font-mono flex items-center gap-1">
                                    <Clock size={10} />{sig.time}
                                </p>
                            </div>
                        </div>
                        <span className={cn(
                            "text-xs font-bold px-2.5 py-1 rounded-[22.5px] border bg-transparent",
                            isPositive
                                ? "text-white border-white/10"
                                : "text-[#ff6363] border-[#ff6363]/30"
                        )}>
                            {isPositive ? '+' : ''}{sig.delta}
                        </span>
                    </div>
                );
            })}
        </div>
    );
};

/* ─── Problem Card ─────────────────────────────────────────────── */

const ProblemCard = ({ icon: Icon, title, description }: { icon: any; title: string; description: string }) => (
    <div className="p-6 rounded-[16px] border border-[#363739] border-dashed bg-[#07080a] transition-all duration-300 shadow-subtle-4">
        <div className="p-3 rounded-[8px] border border-white/5 bg-[#1b1c1e] w-fit mb-4 text-[#ffffff]">
            <Icon size={24} />
        </div>
        <h3 className="text-lg font-bold text-[#ffffff] mb-2 uppercase tracking-wide">{title}</h3>
        <p className="text-sm text-[#6a6b6c] leading-relaxed">{description}</p>
    </div>
);

/* ─── Solution Card ────────────────────────────────────────────── */

const SolutionCard = ({ icon: Icon, title, description }: { icon: any; title: string; description: string; color: string }) => {
    return (
        <div className="p-6 rounded-[16px] border border-[#363739] border-dashed bg-[#07080a] transition-all duration-300 shadow-subtle-4">
            <div className="p-3 rounded-[8px] border border-[#ff6363]/20 text-[#ff6363] bg-[#452324]/20 w-fit mb-4">
                <Icon size={24} />
            </div>
            <h3 className="text-lg font-bold text-[#ffffff] mb-2 uppercase tracking-wide">{title}</h3>
            <p className="text-sm text-[#6a6b6c] leading-relaxed">{description}</p>
        </div>
    );
};

/* ─── Stat Card ────────────────────────────────────────────────── */

const StatCard = ({ value, suffix, label }: { value: number; suffix: string; label: string }) => (
    <div className="text-center p-6 bg-transparent">
        <div className="text-4xl md:text-5xl font-black text-[#ffffff] tracking-tighter">
            <AnimatedNumber target={value} />
            <span className="text-[#ff6363]">{suffix}</span>
        </div>
        <p className="text-[10px] text-[#6a6b6c] mt-2 font-mono uppercase tracking-wider">{label}</p>
    </div>
);

/* ─── Main Landing Page ────────────────────────────────────────── */

export const MarketingHome: React.FC = () => {
    const { setView, isAuthenticated } = useApp();
    const { theme, toggleTheme } = useTheme();

    return (
        <div className="min-h-screen bg-[#040506] text-[#ffffff] overflow-hidden selection:bg-[#ff6363]/30 font-sans">
            
            {/* ═══ Navigation ═══ */}
            <nav className="sticky top-4 z-50 max-w-[740px] mx-auto px-4">
                <div className="bg-[#07080a] border border-[#1b1c1e] shadow-subtle-4 rounded-[11px] px-6 flex items-center justify-between h-[52px]">
                    <div className="flex items-center gap-2 text-sm font-semibold tracking-tight text-[#ffffff]">
                        <MapPin size={16} className="text-[#ff6363] stroke-[1.5]" />
                        anyWays
                    </div>
                    <div className="hidden md:flex items-center gap-6 text-[13px] text-[#9c9c9d]">
                        <a href="#problem" className="hover:text-[#ffffff] transition-colors duration-200">Problem</a>
                        <a href="#solution" className="hover:text-[#ffffff] transition-colors duration-200">Solution</a>
                        <a href="#demo" className="hover:text-[#ffffff] transition-colors duration-200">Demo</a>
                        <button onClick={() => setView('pricing')} className="hover:text-[#ffffff] transition-colors duration-200">Pricing</button>
                    </div>
                    <div className="flex items-center gap-3">
                        <button
                            onClick={toggleTheme}
                            className="p-1.5 text-[#9c9c9d] hover:text-[#ffffff] hover:bg-white/5 rounded-[8px] transition-all duration-200"
                            title={`Switch theme`}
                        >
                            {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
                        </button>
                        {isAuthenticated ? (
                            <button
                                onClick={() => setView('dashboard')}
                                className="text-xs font-medium bg-[#e6e6e6] text-[#2f3031] px-3.5 py-1.5 rounded-[8px] transition-all hover:opacity-90 font-sans"
                            >
                                Dashboard
                            </button>
                        ) : (
                            <>
                                <button
                                    onClick={() => setView('login')}
                                    className="text-xs font-medium text-[#9c9c9d] hover:text-[#ffffff] transition-colors duration-200 px-2 py-1"
                                >
                                    Log in
                                </button>
                                <button
                                    onClick={() => setView('register')}
                                    className="text-xs font-bold bg-[#e6e6e6] text-[#2f3031] px-3.5 py-1.5 rounded-[8px] transition-all hover:opacity-90 font-sans"
                                >
                                    Start Free
                                </button>
                            </>
                        )}
                    </div>
                </div>
            </nav>

            {/* ═══ HERO ═══ */}
            <section className="relative min-h-[90vh] flex flex-col justify-center px-6 lg:px-8 overflow-hidden bg-[#040506]">
                {/* Radial Glow Atmosphere */}
                <div className="absolute inset-0 bg-[radial-gradient(84.6%_73.49%_at_50%_26.51%,rgba(4,63,150,0.35),rgba(6,18,37,0.1))] pointer-events-none z-0" />
                
                {/* Video Background */}
                <video autoPlay loop muted playsInline className="absolute inset-0 w-full h-full object-cover z-0 opacity-10 mix-blend-screen pointer-events-none">
                    <source src="https://res.cloudinary.com/dfonotyfb/video/upload/v1775585556/dds3_1_rqhg7x.mp4" type="video/mp4" />
                </video>
                
                <motion.div 
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, ease: [0.23, 1, 0.32, 1] }}
                    className="max-w-5xl mx-auto text-center relative z-10 pt-16"
                >
                    {/* Badge */}
                    <motion.div 
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.1, duration: 0.4 }}
                        className="inline-flex items-center gap-2 px-3 py-1 rounded-[6px] border border-white/5 text-[#ffffff] text-[11px] font-medium tracking-[0.04em] mb-8 bg-[#1b1c1e] shadow-subtle-2"
                    >
                        <div className="w-1.5 h-1.5 rounded-full bg-[#ff6363]" />
                        <span className="font-mono">v1.104.14 — India Dispatch</span>
                    </motion.div>

                    {/* Headline */}
                    <h1 className="text-4xl md:text-[64px] font-semibold tracking-[-0.13em] leading-[1] mb-6 text-[#ffffff] uppercase font-sans">
                        Operational truth.<br/>
                        <span className="text-[#6a6b6c]">
                            Before dispatch.
                        </span>
                    </h1>

                    {/* Subheadline */}
                    <p className="text-sm md:text-[18px] text-[#9c9c9d] max-w-3xl mx-auto leading-[1.4] mb-10 font-normal">
                        Real-time logistics intelligence powered by live signals, foot traffic, and on-ground verification. Built for scale.
                    </p>

                    {/* CTAs */}
                    <motion.div 
                        initial={{ opacity: 0, y: 15 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2, duration: 0.4 }}
                        className="flex flex-col sm:flex-row items-center justify-center gap-4"
                    >
                        <button
                            onClick={() => isAuthenticated ? setView('dashboard') : setView('register')}
                            className="flex items-center justify-center gap-2 bg-[#e6e6e6] text-[#2f3031] hover:opacity-90 font-bold px-6 py-2.5 rounded-[8px] text-sm transition-all duration-200 w-full sm:w-auto font-sans"
                        >
                            Deploy Engine
                            <ArrowRight size={14} />
                        </button>
                        <button
                            onClick={() => setView('pricing')}
                            className="flex items-center justify-center gap-2 text-[#9c9c9d] hover:text-[#ffffff] hover:border-white/40 font-medium px-6 py-2.5 rounded-[8px] border border-[#454647] bg-transparent transition-all duration-200 w-full sm:w-auto font-sans"
                        >
                            View Architecture
                        </button>
                    </motion.div>
                </motion.div>

                {/* Sticky scroll prompt */}
                <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1.5 opacity-60 text-[10px] font-mono uppercase text-[#9c9c9d] tracking-widest pointer-events-none">
                    <span>Scroll to continue</span>
                    <svg className="w-3.5 h-3.5 animate-bounce text-[#9c9c9d]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                    </svg>
                </div>
            </section>

            {/* ═══ STATS BAR ═══ */}
            <section className="border-y border-[#1b1c1e] bg-[#07080a] shadow-subtle-4">
                <div className="max-w-5xl mx-auto grid grid-cols-2 md:grid-cols-4 divide-x divide-[#1b1c1e]">
                    <StatCard value={23} suffix="%" label="Failed deliveries in India" />
                    <StatCard value={40} suffix="%" label="Due to wrong addresses" />
                    <StatCard value={85} suffix="₹" label="Avg. cost per failed delivery" />
                    <StatCard value={3} suffix="x" label="ROI with anyWays" />
                </div>
            </section>

            {/* ═══ PROBLEM ═══ */}
            <section id="problem" className="py-20 px-6 lg:px-8 bg-[#040506]">
                <div className="max-w-6xl mx-auto">
                    <div className="text-center mb-12">
                        <p className="text-[#ff6363] text-xs font-mono uppercase tracking-[0.2em] mb-2">The Problem</p>
                        <h2 className="text-3xl md:text-[32px] font-semibold text-[#ffffff] tracking-[-0.06em] leading-[1.2] mb-4 uppercase">
                            30% of delivery failures happen because locations are wrong, closed, or inactive.
                        </h2>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <ProblemCard
                            icon={MapPin}
                            title="Fake Locations"
                            description="Customers enter wrong pins, fake addresses, or locations that don't exist. Your rider wastes 20 minutes finding them."
                        />
                        <ProblemCard
                            icon={XCircle}
                            title="Closed Stores"
                            description="Restaurant listed as open but actually shut down 3 months ago. Your order gets cancelled, customer gets frustrated."
                        />
                        <ProblemCard
                            icon={AlertTriangle}
                            title="Wrong Pins"
                            description="Map pin is 500 meters away from the actual location. Rider calls, customer can't explain. Delivery fails."
                        />
                    </div>
                </div>
            </section>

            {/* ═══ SOLUTION ═══ */}
            <section id="solution" className="py-20 px-6 lg:px-8 bg-[#040506] border-y border-[#1b1c1e] relative">
                {/* Purple Atmosphere Glow */}
                <div className="absolute inset-0 bg-[radial-gradient(86.88%_75.47%_at_50%_24.53%,rgba(82,48,145,0.15),rgba(26,11,51,0.02))] pointer-events-none z-0" />
                
                <div className="max-w-6xl mx-auto relative z-10">
                    <div className="text-center mb-12">
                        <p className="text-[#ff6363] text-xs font-mono uppercase tracking-[0.2em] mb-2">The Solution</p>
                        <h2 className="text-3xl md:text-[32px] font-semibold text-[#ffffff] tracking-[-0.06em] leading-[1.2] mb-4 uppercase">
                            Verify every location before dispatch
                        </h2>
                        <p className="text-sm text-[#9c9c9d] max-w-2xl mx-auto leading-relaxed">
                            anyWays collects real-world signals from multiple sources to give you a confidence score for every place.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <SolutionCard
                            icon={Shield}
                            title="Live Signals"
                            description="We monitor foot traffic, pickup data, and menu scans directly from the ground."
                            color="emerald"
                        />
                        <SolutionCard
                            icon={BarChart3}
                            title="Confidence Score"
                            description="Know instantly if a location is active with our 0-100 score system."
                            color="blue"
                        />
                        <SolutionCard
                            icon={Zap}
                            title="Real-Time Updates"
                            description="Get alerted the second a location closes or stops receiving traffic."
                            color="violet"
                        />
                    </div>
                </div>
            </section>

            {/* ═══ DEMO ═══ */}
            <section id="demo" className="py-20 px-6 lg:px-8 bg-[#040506]">
                <div className="max-w-6xl mx-auto">
                    <div className="text-center mb-12">
                        <p className="text-[#9c9c9d] text-xs font-mono uppercase tracking-[0.2em] mb-2">See It In Action</p>
                        <h2 className="text-3xl md:text-[32px] font-semibold text-[#ffffff] tracking-[-0.06em] leading-[1.2] mb-4 uppercase">
                            Watch the score change live
                        </h2>
                        <p className="text-sm text-[#6a6b6c] max-w-2xl mx-auto leading-relaxed">
                            As real-world signals come in, the confidence score updates instantly.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
                        {/* Left: Score Display */}
                        <div className="bg-[#07080a] border border-[#363739] rounded-[16px] p-8 flex flex-col items-center shadow-subtle-4">
                            <p className="text-[11px] text-[#6a6b6c] uppercase tracking-[0.073em] font-mono mb-6">Confidence Score</p>
                            <div className="relative w-40 h-40 mb-6">
                                <svg width="160" height="160" className="transform -rotate-90">
                                    <circle cx="80" cy="80" r="68" fill="none" className="stroke-[#1b1c1e]" strokeWidth="3" />
                                    <circle
                                        cx="80" cy="80" r="68" fill="none"
                                        stroke="#ff6363" strokeWidth="3" strokeLinecap="round"
                                        strokeDasharray={2 * Math.PI * 68}
                                        strokeDashoffset={2 * Math.PI * 68 * (1 - 0.78)}
                                        className="transition-all duration-[2s] ease-out"
                                    />
                                </svg>
                                <div className="absolute inset-0 flex flex-col items-center justify-center">
                                    <span className="text-5xl font-semibold text-[#ffffff] font-mono tracking-tight">78</span>
                                    <span className="text-[10px] uppercase tracking-[0.25em] text-[#6a6b6c] font-bold mt-1 font-mono">Score</span>
                                </div>
                            </div>
                            <div className="flex items-center gap-2 px-3 py-1 rounded-[6px] bg-[#1b1c1e] border border-white/5 text-[#ffffff] shadow-subtle-2">
                                <span className="w-1.5 h-1.5 rounded-full bg-[#59d499]" />
                                <span className="text-[10px] font-medium uppercase tracking-[0.04em] font-mono">Likely Valid</span>
                            </div>
                            <p className="text-xs text-[#6a6b6c] mt-4 text-center max-w-[240px] leading-relaxed">
                                Score updates as signals arrive. Use this to decide if a delivery is safe.
                            </p>
                        </div>

                        {/* Right: Live Feed */}
                        <div className="bg-[#07080a] border border-[#363739] rounded-[16px] overflow-hidden shadow-subtle-4">
                            <div className="px-6 py-4 border-b border-[#1b1c1e] flex items-center justify-between">
                                <div className="flex items-center gap-2 text-[#ffffff]">
                                    <Activity size={16} className="text-[#ff6363]" />
                                    <span className="text-xs font-bold uppercase tracking-wider font-mono">Live Signal Feed</span>
                                </div>
                                <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-[6px] bg-[#1b1c1e] border border-white/5 shadow-subtle-2">
                                    <span className="w-1.5 h-1.5 rounded-full bg-[#ff6363] animate-pulse" />
                                    <span className="text-[9px] font-bold text-[#ffffff] uppercase tracking-widest font-mono">Live</span>
                                </div>
                            </div>
                            <div className="p-4 bg-transparent">
                                <DemoFeed />
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* ═══ HOW IT WORKS ═══ */}
            <section className="py-20 px-6 lg:px-8 bg-[#040506] border-y border-[#1b1c1e]">
                <div className="max-w-4xl mx-auto">
                    <div className="text-center mb-12">
                        <p className="text-[#ff6363] text-xs font-mono uppercase tracking-[0.2em] mb-2">How It Works</p>
                        <h2 className="text-3xl md:text-[32px] font-semibold text-[#ffffff] tracking-[-0.06em] leading-[1.2] uppercase">
                            Three simple steps
                        </h2>
                    </div>

                    <div className="space-y-0">
                        {[
                            { step: '01', title: 'Send us a place', desc: 'Pass a place ID or address to our API. We start collecting signals immediately.' },
                            { step: '02', title: 'We verify it', desc: 'Our engine checks foot traffic, menus, business hours, pickup data, and social signals.' },
                            { step: '03', title: 'Get a confidence score', desc: 'You get a 0-100 score in real-time. Use it to block, flag, or approve deliveries.' },
                        ].map((item) => (
                            <div key={item.step} className="flex items-start gap-6 py-6 border-b border-[#1b1c1e] last:border-0">
                                <span className="text-xl font-bold text-[#ff6363]/60 shrink-0 w-12 font-mono">{item.step}</span>
                                <div>
                                    <h3 className="text-base font-semibold text-[#ffffff] mb-1">{item.title}</h3>
                                    <p className="text-sm text-[#6a6b6c] leading-relaxed">{item.desc}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ═══ TRUST ═══ */}
            <section className="py-20 px-6 lg:px-8 bg-[#040506]">
                <div className="max-w-4xl mx-auto text-center">
                    <h2 className="text-3xl md:text-[32px] font-semibold text-[#ffffff] tracking-[-0.06em] leading-[1.2] mb-10 uppercase">
                        Trust the data, not the map
                    </h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-left">
                        <div className="p-6 rounded-[11px] bg-[#07080a] border border-[#363739] shadow-subtle-4">
                            <div className="flex items-center gap-2 mb-2">
                                <CheckCircle2 size={16} className="text-[#ff6363] shrink-0" />
                                <h3 className="font-bold text-[#ffffff] text-sm">Updated every second</h3>
                            </div>
                            <p className="text-xs text-[#6a6b6c] ml-6 leading-relaxed">Live signals mean your verification is never stale. We continuously process data to keep you informed.</p>
                        </div>
                        <div className="p-6 rounded-[11px] bg-[#07080a] border border-[#363739] shadow-subtle-4">
                            <div className="flex items-center gap-2 mb-2">
                                <CheckCircle2 size={16} className="text-[#ff6363] shrink-0" />
                                <h3 className="font-bold text-[#ffffff] text-sm">Works without manual verification</h3>
                            </div>
                            <p className="text-xs text-[#6a6b6c] ml-6 leading-relaxed">No more calling the customer or guessing the location. Let automated confidence scoring do the work for you.</p>
                        </div>
                    </div>
                </div>
            </section>

            {/* ═══ CTA ═══ */}
            <section className="py-20 px-6 lg:px-8 border-t border-[#1b1c1e] bg-[#040506]">
                <div className="max-w-3xl mx-auto text-center">
                    <h2 className="text-3xl md:text-[32px] font-semibold text-[#ffffff] tracking-[-0.06em] leading-[1.2] mb-8 uppercase">
                        Plug into your delivery system in minutes
                    </h2>
                    <button
                        onClick={() => isAuthenticated ? setView('dashboard') : setView('register')}
                        className="inline-flex items-center gap-2 bg-[#e6e6e6] text-[#2f3031] hover:opacity-90 font-bold px-8 py-3.5 rounded-[8px] transition-all duration-200 text-base font-sans shadow-subtle"
                    >
                        Start verifying places
                        <ArrowRight size={18} />
                    </button>
                </div>
            </section>

            {/* ═══ Footer ═══ */}
            <footer className="border-t border-[#1b1c1e] py-8 px-6 lg:px-8 bg-[#040506]">
                <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-[#6a6b6c]">
                    <div className="flex items-center gap-2 font-bold text-[#ffffff] text-sm">
                        <MapPin size={16} className="text-[#ff6363] stroke-[1.5]" />
                        anyWays
                    </div>
                    <p>© 2026 anyWays. Real-time place intelligence for Indian logistics.</p>
                    <div className="flex items-center gap-6 font-mono text-[10px] text-[#9c9c9d]">
                        <a href="#" className="hover:text-[#ffffff] transition-colors duration-200">API Docs</a>
                        <button onClick={() => setView('pricing')} className="hover:text-[#ffffff] transition-colors duration-200">Pricing</button>
                        <button onClick={() => setView('login')} className="hover:text-[#ffffff] transition-colors duration-200">Dashboard</button>
                    </div>
                </div>
            </footer>
        </div>
    );
};

export default MarketingHome;
