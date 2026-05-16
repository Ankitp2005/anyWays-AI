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
    <div className="group p-6 rounded-2xl bg-red-500/5 border border-red-500/10 hover:border-red-500/20 transition-all duration-300 hover:-translate-y-1">
        <div className="p-3 rounded-xl bg-red-500/10 w-fit mb-4">
            <Icon size={24} className="text-red-400" />
        </div>
        <h3 className="text-lg font-bold text-foreground mb-2">{title}</h3>
        <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>
    </div>
);

/* ─── Solution Card ────────────────────────────────────────────── */

const SolutionCard = ({ icon: Icon, title, description, color }: { icon: any; title: string; description: string; color: string }) => {
    const colorMap: Record<string, string> = {
        emerald: "bg-emerald-500/10 border-emerald-500/10 hover:border-emerald-500/20 text-emerald-400",
        blue: "bg-blue-500/10 border-blue-500/10 hover:border-blue-500/20 text-blue-400",
        violet: "bg-violet-500/10 border-violet-500/10 hover:border-violet-500/20 text-violet-400",
    };

    return (
        <div className={cn("group p-6 rounded-2xl border transition-all duration-300 hover:-translate-y-1", colorMap[color]?.split(' ').slice(1).join(' ') || "border-border")}>
            <div className={cn("p-3 rounded-xl w-fit mb-4", colorMap[color]?.split(' ')[0])}>
                <Icon size={24} className={colorMap[color]?.split(' ').pop()} />
            </div>
            <h3 className="text-lg font-bold text-foreground mb-2">{title}</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>
        </div>
    );
};

/* ─── Stat Card ────────────────────────────────────────────────── */

const StatCard = ({ value, suffix, label }: { value: number; suffix: string; label: string }) => (
    <div className="text-center p-6">
        <div className="text-4xl md:text-5xl font-black text-foreground tracking-tighter">
            <AnimatedNumber target={value} />
            <span className="text-emerald-500">{suffix}</span>
        </div>
        <p className="text-sm text-muted-foreground mt-2 font-medium">{label}</p>
    </div>
);

/* ─── Main Landing Page ────────────────────────────────────────── */

export const MarketingHome: React.FC = () => {
    const { setView, isAuthenticated } = useApp();
    const { theme, toggleTheme } = useTheme();

    return (
        <div className="min-h-screen bg-background text-foreground overflow-hidden transition-colors duration-300">
            
            {/* ═══ Navigation ═══ */}
            <nav className="sticky top-0 z-50 backdrop-blur-xl bg-background/80 border-b border-border">
                <div className="max-w-7xl mx-auto px-6 lg:px-8 flex items-center justify-between h-16">
                    <div className="flex items-center gap-2 text-xl font-bold tracking-tight text-foreground">
                        <MapPin size={20} className="text-emerald-500" />
                        anyWays
                    </div>
                    <div className="hidden md:flex items-center gap-8 text-sm font-medium text-muted-foreground">
                        <a href="#problem" className="hover:text-foreground transition-colors">Problem</a>
                        <a href="#solution" className="hover:text-foreground transition-colors">Solution</a>
                        <a href="#demo" className="hover:text-foreground transition-colors">Demo</a>
                        <button onClick={() => setView('pricing')} className="hover:text-foreground transition-colors">Pricing</button>
                    </div>
                    <div className="flex items-center gap-3">
                        <button
                            onClick={toggleTheme}
                            className="p-2 text-muted-foreground hover:text-foreground hover:bg-secondary rounded-xl transition-all"
                            title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
                        >
                            {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
                        </button>
                        {isAuthenticated ? (
                            <button
                                onClick={() => setView('dashboard')}
                                className="text-sm font-bold bg-emerald-500 hover:bg-emerald-600 text-white px-5 py-2.5 rounded-xl transition-all hover:scale-105"
                            >
                                Go to Dashboard
                            </button>
                        ) : (
                            <>
                                <button
                                    onClick={() => setView('login')}
                                    className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors px-4 py-2"
                                >
                                    Log in
                                </button>
                                <button
                                    onClick={() => setView('register')}
                                    className="text-sm font-bold bg-emerald-500 hover:bg-emerald-600 text-white px-5 py-2.5 rounded-xl transition-all hover:scale-105"
                                >
                                    Start Free
                                </button>
                            </>
                        )}
                    </div>
                </div>
            </nav>

            {/* ═══ HERO ═══ */}
            <section className="relative min-h-[100vh] flex flex-col justify-center px-6 lg:px-8 overflow-hidden bg-background">
                {/* Video Background */}
                <video autoPlay loop muted playsInline className="absolute inset-0 w-full h-full object-cover z-0 opacity-50 mix-blend-screen dark:opacity-50 dark:mix-blend-screen mix-blend-multiply opacity-20">
                    <source src="https://res.cloudinary.com/dfonotyfb/video/upload/v1775585556/dds3_1_rqhg7x.mp4" type="video/mp4" />
                </video>
                <div className="absolute inset-0 bg-gradient-to-b from-background/40 via-background/60 to-background z-0" />
                <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 mix-blend-overlay z-0 pointer-events-none" />
                
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
                        className="inline-flex items-center gap-3 px-6 py-2.5 rounded-full bg-secondary border border-border text-foreground text-xs font-semibold uppercase tracking-[0.2em] mb-10 backdrop-blur-xl shadow-2xl"
                    >
                        <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_10px_rgba(16,185,129,0.8)]" />
                        Enterprise Intelligence
                    </motion.div>

                    {/* Headline */}
                    <h1 className="text-5xl md:text-7xl lg:text-[6rem] font-black tracking-tighter leading-[1.05] mb-8 text-foreground drop-shadow-2xl">
                        Operational truth.<br/>
                        <span className="text-transparent bg-clip-text bg-gradient-to-b from-zinc-800 to-zinc-400 dark:from-zinc-100 dark:to-zinc-600">
                            Before dispatch.
                        </span>
                    </h1>

                    {/* Subheadline */}
                    <p className="text-lg md:text-2xl text-muted-foreground max-w-3xl mx-auto leading-relaxed mb-12 font-light tracking-wide">
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
                            className="group relative flex items-center justify-center gap-3 bg-foreground text-background font-semibold px-10 py-4 rounded-full text-lg transition-all duration-300 hover:scale-105 hover:bg-foreground/90 w-full sm:w-auto shadow-lg"
                        >
                            Deploy Engine
                            <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
                        </button>
                        <button
                            onClick={() => setView('pricing')}
                            className="flex items-center justify-center gap-2 text-muted-foreground hover:text-foreground font-medium px-10 py-4 rounded-full border border-border hover:bg-secondary transition-all duration-300 backdrop-blur-md w-full sm:w-auto"
                        >
                            View Architecture
                        </button>
                    </motion.div>
                </motion.div>
            </section>

            {/* ═══ STATS BAR ═══ */}
            <section className="border-y border-border bg-secondary/30">
                <div className="max-w-5xl mx-auto grid grid-cols-2 md:grid-cols-4 divide-x divide-border">
                    <StatCard value={23} suffix="%" label="Failed deliveries in India" />
                    <StatCard value={40} suffix="%" label="Due to wrong addresses" />
                    <StatCard value={85} suffix="₹" label="Avg. cost per failed delivery" />
                    <StatCard value={3} suffix="x" label="ROI with anyWays" />
                </div>
            </section>

            {/* ═══ PROBLEM ═══ */}
            <section id="problem" className="py-24 px-6 lg:px-8">
                <div className="max-w-6xl mx-auto">
                    <div className="text-center mb-16">
                        <p className="text-red-400 text-sm font-bold uppercase tracking-widest mb-3">The Problem</p>
                        <h2 className="text-4xl md:text-5xl font-black tracking-tighter mb-4">
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
            <section id="solution" className="py-24 px-6 lg:px-8 bg-secondary/30 border-y border-border">
                <div className="max-w-6xl mx-auto">
                    <div className="text-center mb-16">
                        <p className="text-emerald-500 text-sm font-bold uppercase tracking-widest mb-3">The Solution</p>
                        <h2 className="text-4xl md:text-5xl font-black tracking-tighter mb-4">
                            Verify every location before dispatch
                        </h2>
                        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
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
            <section id="demo" className="py-24 px-6 lg:px-8">
                <div className="max-w-6xl mx-auto">
                    <div className="text-center mb-16">
                        <p className="text-blue-500 text-sm font-bold uppercase tracking-widest mb-3">See It In Action</p>
                        <h2 className="text-4xl md:text-5xl font-black tracking-tighter mb-4">
                            Watch the score change live
                        </h2>
                        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                            As real-world signals come in, the confidence score updates instantly.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
                        {/* Left: Score Display */}
                        <div className="bg-card border border-border rounded-2xl p-8 flex flex-col items-center">
                            <p className="text-sm text-muted-foreground uppercase tracking-widest font-bold mb-6">Confidence Score</p>
                            <div className="relative w-40 h-40 mb-6">
                                <svg width="160" height="160" className="transform -rotate-90">
                                    <circle cx="80" cy="80" r="68" fill="none" className="stroke-border" strokeWidth="10" />
                                    <circle
                                        cx="80" cy="80" r="68" fill="none"
                                        stroke="url(#demoGradient)" strokeWidth="10" strokeLinecap="round"
                                        strokeDasharray={2 * Math.PI * 68}
                                        strokeDashoffset={2 * Math.PI * 68 * (1 - 0.78)}
                                        className="transition-all duration-[2s] ease-out"
                                    />
                                    <defs>
                                        <linearGradient id="demoGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                                            <stop offset="0%" stopColor="#34d399" />
                                            <stop offset="100%" stopColor="#6ee7b7" />
                                        </linearGradient>
                                    </defs>
                                </svg>
                                <div className="absolute inset-0 flex flex-col items-center justify-center">
                                    <span className="text-5xl font-black text-foreground">78</span>
                                    <span className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-semibold mt-1">Score</span>
                                </div>
                            </div>
                            <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                                <span className="text-xs font-bold text-emerald-500 uppercase tracking-wider">Likely Valid</span>
                            </div>
                            <p className="text-xs text-muted-foreground mt-4 text-center max-w-[240px]">
                                Score updates as signals arrive. Use this to decide if a delivery is safe.
                            </p>
                        </div>

                        {/* Right: Live Feed */}
                        <div className="bg-card border border-border rounded-2xl overflow-hidden">
                            <div className="px-6 py-4 border-b border-border flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <Activity size={16} className="text-blue-500" />
                                    <span className="text-sm font-semibold">Live Signal Feed</span>
                                </div>
                                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
                                    <span className="text-[9px] font-bold text-emerald-500 uppercase tracking-widest">Live</span>
                                </div>
                            </div>
                            <div className="p-4">
                                <DemoFeed />
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* ═══ HOW IT WORKS ═══ */}
            <section className="py-24 px-6 lg:px-8 bg-secondary/30 border-y border-border">
                <div className="max-w-4xl mx-auto">
                    <div className="text-center mb-16">
                        <p className="text-amber-500 text-sm font-bold uppercase tracking-widest mb-3">How It Works</p>
                        <h2 className="text-4xl md:text-5xl font-black tracking-tighter">
                            Three simple steps
                        </h2>
                    </div>

                    <div className="space-y-0">
                        {[
                            { step: '01', title: 'Send us a place', desc: 'Pass a place ID or address to our API. We start collecting signals immediately.' },
                            { step: '02', title: 'We verify it', desc: 'Our engine checks foot traffic, menus, business hours, pickup data, and social signals.' },
                            { step: '03', title: 'Get a confidence score', desc: 'You get a 0-100 score in real-time. Use it to block, flag, or approve deliveries.' },
                        ].map((item) => (
                            <div key={item.step} className="flex items-start gap-6 py-8 border-b border-border last:border-0">
                                <span className="text-3xl font-black text-muted-foreground/30 shrink-0 w-12">{item.step}</span>
                                <div>
                                    <h3 className="text-xl font-bold text-foreground mb-1">{item.title}</h3>
                                    <p className="text-muted-foreground">{item.desc}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ═══ TRUST ═══ */}
            <section className="py-24 px-6 lg:px-8">
                <div className="max-w-4xl mx-auto text-center">
                    <h2 className="text-4xl md:text-5xl font-black tracking-tighter mb-12">
                        Trust the data, not the map
                    </h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-left">
                        <div className="p-6 rounded-2xl bg-secondary/50 border border-border">
                            <div className="flex items-center gap-2 mb-2">
                                <CheckCircle2 size={18} className="text-emerald-500 shrink-0" />
                                <h3 className="font-bold text-foreground">Updated every second</h3>
                            </div>
                            <p className="text-sm text-muted-foreground ml-7">Live signals mean your verification is never stale. We continuously process data to keep you informed.</p>
                        </div>
                        <div className="p-6 rounded-2xl bg-secondary/50 border border-border">
                            <div className="flex items-center gap-2 mb-2">
                                <CheckCircle2 size={18} className="text-emerald-500 shrink-0" />
                                <h3 className="font-bold text-foreground">Works without manual verification</h3>
                            </div>
                            <p className="text-sm text-muted-foreground ml-7">No more calling the customer or guessing the location. Let automated confidence scoring do the work for you.</p>
                        </div>
                    </div>
                </div>
            </section>

            {/* ═══ CTA ═══ */}
            <section className="py-24 px-6 lg:px-8 border-t border-border">
                <div className="max-w-3xl mx-auto text-center">
                    <h2 className="text-4xl md:text-5xl font-black tracking-tighter mb-10">
                        Plug into your delivery system in minutes
                    </h2>
                    <button
                        onClick={() => isAuthenticated ? setView('dashboard') : setView('register')}
                        className="group inline-flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white font-bold px-10 py-5 rounded-2xl text-lg transition-all hover:scale-105 shadow-lg shadow-emerald-500/20"
                    >
                        Start verifying places
                        <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
                    </button>
                </div>
            </section>

            {/* ═══ Footer ═══ */}
            <footer className="border-t border-border py-8 px-6 lg:px-8">
                <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-2 font-bold text-foreground">
                        <MapPin size={16} className="text-emerald-500" />
                        anyWays
                    </div>
                    <p>© 2026 anyWays. Real-time place intelligence for Indian logistics.</p>
                    <div className="flex items-center gap-6">
                        <a href="#" className="hover:text-foreground transition-colors">API Docs</a>
                        <button onClick={() => setView('pricing')} className="hover:text-foreground transition-colors">Pricing</button>
                        <button onClick={() => setView('login')} className="hover:text-foreground transition-colors">Dashboard</button>
                    </div>
                </div>
            </footer>
        </div>
    );
};

export default MarketingHome;
