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
                            "flex items-center justify-between p-3.5 rounded-xl border bg-background/80 backdrop-blur-sm transition-all duration-500",
                            idx === 0 ? "border-border shadow-lg" : "border-border/50",
                            "animate-in slide-in-from-top-2 fade-in"
                        )}
                        style={{ animationDelay: `${idx * 100}ms` }}
                    >
                        <div className="flex items-center gap-3">
                            <div className={cn(
                                "p-2 rounded-lg border",
                                isPositive ? "bg-emerald-500/10 border-emerald-500/20" : "bg-red-500/10 border-red-500/20"
                            )}>
                                <Icon size={14} className={isPositive ? "text-emerald-400" : "text-red-400"} />
                            </div>
                            <div>
                                <p className="text-sm font-medium text-foreground">{sig.label}</p>
                                <p className="text-[11px] text-muted-foreground font-mono flex items-center gap-1">
                                    <Clock size={10} />{sig.time}
                                </p>
                            </div>
                        </div>
                        <span className={cn(
                            "text-xs font-bold px-2.5 py-1 rounded-full border",
                            isPositive
                                ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                                : "bg-red-500/10 text-red-400 border-red-500/20"
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
    <div className="p-6 rounded-xl border border-[#40372e] border-dashed bg-transparent transition-all duration-300">
        <div className="p-3 rounded-lg border border-[#ffedd7]/20 w-fit mb-4 text-[#ffedd7]">
            <Icon size={24} />
        </div>
        <h3 className="text-lg font-bold text-[#ffedd7] mb-2">{title}</h3>
        <p className="text-sm text-[#6c5f51] leading-relaxed">{description}</p>
    </div>
);

/* ─── Solution Card ────────────────────────────────────────────── */

const SolutionCard = ({ icon: Icon, title, description }: { icon: any; title: string; description: string; color: string }) => {
    return (
        <div className="p-6 rounded-xl border border-[#40372e] border-dashed bg-transparent transition-all duration-300">
            <div className="p-3 rounded-lg border border-[#dc5000]/30 text-[#dc5000] w-fit mb-4">
                <Icon size={24} />
            </div>
            <h3 className="text-lg font-bold text-[#ffedd7] mb-2">{title}</h3>
            <p className="text-sm text-[#6c5f51] leading-relaxed">{description}</p>
        </div>
    );
};

/* ─── Stat Card ────────────────────────────────────────────────── */

const StatCard = ({ value, suffix, label }: { value: number; suffix: string; label: string }) => (
    <div className="text-center p-6 bg-transparent">
        <div className="text-4xl md:text-5xl font-black text-[#ffedd7] tracking-tighter">
            <AnimatedNumber target={value} />
            <span className="text-[#dc5000]">{suffix}</span>
        </div>
        <p className="text-xs text-[#6c5f51] mt-2 font-mono uppercase tracking-wider">{label}</p>
    </div>
);

/* ─── Main Landing Page ────────────────────────────────────────── */

export const MarketingHome: React.FC = () => {
    const { setView, isAuthenticated } = useApp();
    const { theme, toggleTheme } = useTheme();

    return (
        <div className="min-h-screen bg-[#100904] text-[#ffedd7] overflow-hidden selection:bg-[#dc5000]/30 font-sans">
            
            {/* ═══ Navigation ═══ */}
            <nav className="sticky top-0 z-50 bg-[#100904] border-b border-[#40372e]">
                <div className="max-w-7xl mx-auto px-6 lg:px-8 flex items-center justify-between h-16">
                    <div className="flex items-center gap-2 text-base font-bold tracking-tight text-[#ffedd7]">
                        <MapPin size={18} className="text-[#ffedd7] stroke-[1.5]" />
                        anyWays
                    </div>
                    <div className="hidden md:flex items-center gap-6 text-xs uppercase tracking-wider text-[#ffedd7]">
                        <a href="#problem" className="hover:text-[#dc5000] transition-colors">Problem</a>
                        <a href="#solution" className="hover:text-[#dc5000] transition-colors">Solution</a>
                        <a href="#demo" className="hover:text-[#dc5000] transition-colors">Demo</a>
                        <button onClick={() => setView('pricing')} className="hover:text-[#dc5000] transition-colors">Pricing</button>
                    </div>
                    <div className="flex items-center gap-3">
                        <button
                            onClick={toggleTheme}
                            className="p-2 text-[#ffedd7]/60 hover:text-[#ffedd7] hover:bg-[#382416]/50 rounded-xl transition-all"
                            title={`Switch theme`}
                        >
                            {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
                        </button>
                        {isAuthenticated ? (
                            <button
                                onClick={() => setView('dashboard')}
                                className="text-xs font-bold bg-[#382416] text-[#ffedd7] border border-[#ffedd7]/10 hover:border-[#ffedd7]/30 px-5 py-2 rounded-[36px] transition-all hover:opacity-90"
                            >
                                Go to Dashboard
                            </button>
                        ) : (
                            <>
                                <button
                                    onClick={() => setView('login')}
                                    className="text-xs font-medium text-[#ffedd7]/80 hover:text-[#ffedd7] transition-colors px-4 py-2"
                                >
                                    Log in
                                </button>
                                <button
                                    onClick={() => setView('register')}
                                    className="text-xs font-bold bg-[#382416] text-[#ffedd7] border border-[#ffedd7]/10 hover:border-[#ffedd7]/30 px-5 py-2 rounded-[36px] transition-all hover:opacity-90"
                                >
                                    Start Free
                                </button>
                            </>
                        )}
                    </div>
                </div>
            </nav>

            {/* ═══ HERO ═══ */}
            <section className="relative min-h-[100vh] flex flex-col justify-center px-6 lg:px-8 overflow-hidden bg-[#100904]">
                {/* Video Background */}
                <video autoPlay loop muted playsInline className="absolute inset-0 w-full h-full object-cover z-0 opacity-20 mix-blend-screen pointer-events-none">
                    <source src="https://res.cloudinary.com/dfonotyfb/video/upload/v1775585556/dds3_1_rqhg7x.mp4" type="video/mp4" />
                </video>
                
                <motion.div 
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 1, ease: "easeOut" }}
                    className="max-w-5xl mx-auto text-center relative z-10 pt-20"
                >
                    {/* Badge */}
                    <motion.div 
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.2, duration: 0.8 }}
                        className="inline-flex items-center gap-2.5 px-4 py-1.5 rounded-full border border-[#ffedd7]/30 text-[#ffedd7] text-[10px] font-mono uppercase tracking-[0.2em] mb-10 bg-transparent"
                    >
                        <div className="w-1.5 h-1.5 rounded-full bg-[#dc5000]" />
                        Enterprise Intelligence
                    </motion.div>

                    {/* Headline */}
                    <h1 className="text-4xl md:text-[51px] font-black tracking-tight leading-[0.9] mb-8 text-[#ffedd7] uppercase">
                        Operational truth.<br/>
                        <span className="text-[#6c5f51]">
                            Before dispatch.
                        </span>
                    </h1>

                    {/* Subheadline */}
                    <p className="text-sm md:text-[18px] text-[#ffedd7] max-w-3xl mx-auto leading-[1.2] mb-12 font-medium">
                        Real-time logistics intelligence powered by live signals, foot traffic, and on-ground verification. Built for scale.
                    </p>

                    {/* CTAs */}
                    <motion.div 
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.4, duration: 0.8 }}
                        className="flex flex-col sm:flex-row items-center justify-center gap-6"
                    >
                        <button
                            onClick={() => isAuthenticated ? setView('dashboard') : setView('register')}
                            className="flex items-center justify-center gap-2 border border-[#dc5000] text-[#dc5000] hover:bg-[#dc5000]/10 font-bold px-8 py-3 rounded-[9999px] text-sm transition-all duration-300 w-full sm:w-auto bg-transparent"
                        >
                            Deploy Engine
                            <ArrowRight size={16} />
                        </button>
                        <button
                            onClick={() => setView('pricing')}
                            className="flex items-center justify-center gap-2 text-[#ffedd7] hover:text-[#dc5000] hover:border-[#dc5000] font-medium px-8 py-3 rounded-[22.5px] border border-[#ffedd7] transition-all duration-300 w-full sm:w-auto bg-transparent"
                        >
                            View Architecture
                        </button>
                    </motion.div>
                </motion.div>

                {/* Sticky scroll prompt */}
                <div className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1.5 opacity-80 animate-pulse text-[10px] font-mono uppercase text-[#ffedd7] tracking-widest pointer-events-none">
                    <span>Scroll to continue</span>
                    <svg className="w-4 h-4 animate-bounce text-[#ffedd7]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                    </svg>
                </div>
            </section>

            {/* ═══ STATS BAR ═══ */}
            <section className="border-y border-[#40372e] border-dashed bg-transparent">
                <div className="max-w-5xl mx-auto grid grid-cols-2 md:grid-cols-4 divide-x divide-[#40372e] divide-dashed">
                    <StatCard value={23} suffix="%" label="Failed deliveries in India" />
                    <StatCard value={40} suffix="%" label="Due to wrong addresses" />
                    <StatCard value={85} suffix="₹" label="Avg. cost per failed delivery" />
                    <StatCard value={3} suffix="x" label="ROI with anyWays" />
                </div>
            </section>

            {/* ═══ PROBLEM ═══ */}
            <section id="problem" className="py-24 px-6 lg:px-8 bg-[#100904]">
                <div className="max-w-6xl mx-auto">
                    <div className="text-center mb-16">
                        <p className="text-[#dc5000] text-xs font-mono uppercase tracking-[0.2em] mb-3">The Problem</p>
                        <h2 className="text-3xl md:text-[41px] font-black text-[#ffedd7] leading-[1] mb-4 uppercase">
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
            <section id="solution" className="py-24 px-6 lg:px-8 bg-[#100904] border-y border-[#40372e] border-dashed">
                <div className="max-w-6xl mx-auto">
                    <div className="text-center mb-16">
                        <p className="text-[#dc5000] text-xs font-mono uppercase tracking-[0.2em] mb-3">The Solution</p>
                        <h2 className="text-3xl md:text-[41px] font-black text-[#ffedd7] leading-[1] mb-4 uppercase">
                            Verify every location before dispatch
                        </h2>
                        <p className="text-sm text-[#6c5f51] max-w-2xl mx-auto leading-relaxed">
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
            <section id="demo" className="py-24 px-6 lg:px-8 bg-[#100904]">
                <div className="max-w-6xl mx-auto">
                    <div className="text-center mb-16">
                        <p className="text-[#dc5000] text-xs font-mono uppercase tracking-[0.2em] mb-3">See It In Action</p>
                        <h2 className="text-3xl md:text-[41px] font-black text-[#ffedd7] leading-[1] mb-4 uppercase">
                            Watch the score change live
                        </h2>
                        <p className="text-sm text-[#6c5f51] max-w-2xl mx-auto leading-relaxed">
                            As real-world signals come in, the confidence score updates instantly.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
                        {/* Left: Score Display */}
                        <div className="bg-[#100904] border border-[#40372e] border-dashed rounded-xl p-8 flex flex-col items-center">
                            <p className="text-[10px] text-[#6c5f51] uppercase tracking-[0.2em] font-mono mb-6">Confidence Score</p>
                            <div className="relative w-40 h-40 mb-6">
                                <svg width="160" height="160" className="transform -rotate-90">
                                    <circle cx="80" cy="80" r="68" fill="none" className="stroke-[#40372e]" strokeWidth="2" />
                                    <circle
                                        cx="80" cy="80" r="68" fill="none"
                                        stroke="#dc5000" strokeWidth="2" strokeLinecap="round"
                                        strokeDasharray={2 * Math.PI * 68}
                                        strokeDashoffset={2 * Math.PI * 68 * (1 - 0.78)}
                                        className="transition-all duration-[2s] ease-out"
                                    />
                                </svg>
                                <div className="absolute inset-0 flex flex-col items-center justify-center">
                                    <span className="text-5xl font-black text-[#ffedd7] font-mono">78</span>
                                    <span className="text-[10px] uppercase tracking-[0.25em] text-[#6c5f51] font-bold mt-1 font-mono">Score</span>
                                </div>
                            </div>
                            <div className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#382416] border border-[#ffedd7]/20 text-[#ffedd7]">
                                <span className="w-1.5 h-1.5 rounded-full bg-[#dc5000]" />
                                <span className="text-[10px] font-bold uppercase tracking-widest font-mono">Likely Valid</span>
                            </div>
                            <p className="text-xs text-[#6c5f51] mt-4 text-center max-w-[240px] leading-relaxed">
                                Score updates as signals arrive. Use this to decide if a delivery is safe.
                            </p>
                        </div>

                        {/* Right: Live Feed */}
                        <div className="bg-[#100904] border border-[#40372e] border-dashed rounded-xl overflow-hidden">
                            <div className="px-6 py-4 border-b border-[#40372e] border-dashed flex items-center justify-between">
                                <div className="flex items-center gap-2 text-[#ffedd7]">
                                    <Activity size={16} />
                                    <span className="text-xs font-bold uppercase tracking-wider font-mono">Live Signal Feed</span>
                                </div>
                                <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#382416] border border-[#ffedd7]/20">
                                    <span className="w-1.5 h-1.5 rounded-full bg-[#dc5000] animate-pulse" />
                                    <span className="text-[9px] font-bold text-[#ffedd7] uppercase tracking-widest font-mono">Live</span>
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
            <section className="py-24 px-6 lg:px-8 bg-[#100904] border-y border-[#40372e] border-dashed">
                <div className="max-w-4xl mx-auto">
                    <div className="text-center mb-16">
                        <p className="text-[#dc5000] text-xs font-mono uppercase tracking-[0.2em] mb-3">How It Works</p>
                        <h2 className="text-3xl md:text-[41px] font-black text-[#ffedd7] leading-[1] uppercase">
                            Three simple steps
                        </h2>
                    </div>

                    <div className="space-y-0">
                        {[
                            { step: '01', title: 'Send us a place', desc: 'Pass a place ID or address to our API. We start collecting signals immediately.' },
                            { step: '02', title: 'We verify it', desc: 'Our engine checks foot traffic, menus, business hours, pickup data, and social signals.' },
                            { step: '03', title: 'Get a confidence score', desc: 'You get a 0-100 score in real-time. Use it to block, flag, or approve deliveries.' },
                        ].map((item) => (
                            <div key={item.step} className="flex items-start gap-6 py-8 border-b border-[#40372e] border-dashed last:border-0">
                                <span className="text-2xl font-black text-[#dc5000]/60 shrink-0 w-12 font-mono">{item.step}</span>
                                <div>
                                    <h3 className="text-lg font-bold text-[#ffedd7] mb-1">{item.title}</h3>
                                    <p className="text-sm text-[#6c5f51] leading-relaxed">{item.desc}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ═══ TRUST ═══ */}
            <section className="py-24 px-6 lg:px-8 bg-[#100904]">
                <div className="max-w-4xl mx-auto text-center">
                    <h2 className="text-3xl md:text-[41px] font-black text-[#ffedd7] leading-[1] mb-12 uppercase">
                        Trust the data, not the map
                    </h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-left">
                        <div className="p-6 rounded-xl bg-transparent border border-[#40372e] border-dashed">
                            <div className="flex items-center gap-2 mb-2">
                                <CheckCircle2 size={16} className="text-[#dc5000] shrink-0" />
                                <h3 className="font-bold text-[#ffedd7] text-sm">Updated every second</h3>
                            </div>
                            <p className="text-xs text-[#6c5f51] ml-6 leading-relaxed">Live signals mean your verification is never stale. We continuously process data to keep you informed.</p>
                        </div>
                        <div className="p-6 rounded-xl bg-transparent border border-[#40372e] border-dashed">
                            <div className="flex items-center gap-2 mb-2">
                                <CheckCircle2 size={16} className="text-[#dc5000] shrink-0" />
                                <h3 className="font-bold text-[#ffedd7] text-sm">Works without manual verification</h3>
                            </div>
                            <p className="text-xs text-[#6c5f51] ml-6 leading-relaxed">No more calling the customer or guessing the location. Let automated confidence scoring do the work for you.</p>
                        </div>
                    </div>
                </div>
            </section>

            {/* ═══ CTA ═══ */}
            <section className="py-24 px-6 lg:px-8 border-t border-[#40372e] border-dashed bg-[#100904]">
                <div className="max-w-3xl mx-auto text-center">
                    <h2 className="text-3xl md:text-[41px] font-black text-[#ffedd7] leading-[1] mb-10 uppercase">
                        Plug into your delivery system in minutes
                    </h2>
                    <button
                        onClick={() => isAuthenticated ? setView('dashboard') : setView('register')}
                        className="inline-flex items-center gap-2 bg-[#382416] text-[#ffedd7] border border-[#ffedd7]/10 hover:border-[#ffedd7]/30 hover:opacity-90 font-bold px-10 py-5 rounded-[36px] transition-all text-lg"
                    >
                        Start verifying places
                        <ArrowRight size={20} />
                    </button>
                </div>
            </section>

            {/* ═══ Footer ═══ */}
            <footer className="border-t border-[#40372e] border-dashed py-8 px-6 lg:px-8 bg-[#100904]">
                <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-[#6c5f51]">
                    <div className="flex items-center gap-2 font-bold text-[#ffedd7] text-sm">
                        <MapPin size={16} className="text-[#ffedd7] stroke-[1.5]" />
                        anyWays
                    </div>
                    <p>© 2026 anyWays. Real-time place intelligence for Indian logistics.</p>
                    <div className="flex items-center gap-6 font-mono text-[10px]">
                        <a href="#" className="hover:text-[#dc5000] transition-colors">API Docs</a>
                        <button onClick={() => setView('pricing')} className="hover:text-[#dc5000] transition-colors">Pricing</button>
                        <button onClick={() => setView('login')} className="hover:text-[#dc5000] transition-colors">Dashboard</button>
                    </div>
                </div>
            </footer>
        </div>
    );
};

export default MarketingHome;
