import React from 'react';
import { useApp } from '../context/AppContext';
import { MapPin, ShieldCheck, Zap, ArrowRight, Activity, Code } from 'lucide-react';

export const MarketingHome: React.FC = () => {
    const { setView } = useApp();

    return (
        <div className="min-h-screen bg-background text-foreground font-sans">
            {/* Navigation */}
            <nav className="border-b border-border bg-background/80 backdrop-blur-md sticky top-0 z-50">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className="bg-primary text-primary-foreground p-1.5 rounded-lg">
                            <MapPin size={20} />
                        </div>
                        <span className="font-bold text-xl tracking-tight">anyWays</span>
                        <span className="hidden sm:inline-flex px-2 py-0.5 rounded-full bg-secondary text-xs font-medium text-secondary-foreground ml-2">
                            Place Intelligence
                        </span>
                    </div>
                    <div className="flex items-center gap-4">
                        <a href="#" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors hidden sm:block">Documentation</a>
                        <a href="#" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors hidden sm:block">Pricing</a>
                        <button
                            onClick={() => setView('dashboard')}
                            className="bg-primary text-primary-foreground px-4 py-2 rounded-md text-sm font-medium hover:bg-primary/90 transition-colors flex items-center gap-2"
                        >
                            Developer Console
                            <ArrowRight size={16} />
                        </button>
                    </div>
                </div>
            </nav>

            {/* Hero Section */}
            <section className="relative pt-20 pb-32 overflow-hidden">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
                    <div className="text-center max-w-3xl mx-auto">
                        <h1 className="text-5xl sm:text-6xl font-extrabold tracking-tight text-foreground mb-6">
                            Ground Truth for <span className="text-primary block sm:inline">AI Agents</span>
                        </h1>
                        <p className="text-xl text-muted-foreground mb-10 leading-relaxed">
                            Enable your AI systems to understand, validate, and act on real-world places.
                            Infrastructure for copilots, robotics, and logistics—not just map pins.
                        </p>
                        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                            <button
                                onClick={() => setView('dashboard')}
                                className="w-full sm:w-auto bg-foreground text-background px-8 py-3.5 rounded-md font-semibold hover:bg-foreground/90 transition-colors flex items-center justify-center gap-2"
                            >
                                Start Building
                                <Code size={18} />
                            </button>
                            <button className="w-full sm:w-auto border border-input bg-background/50 backdrop-blur px-8 py-3.5 rounded-md font-semibold hover:bg-accent transition-colors">
                                View Documentation
                            </button>
                        </div>
                    </div>
                </div>

                {/* Background Grid Decoration */}
                <div className="absolute inset-0 z-0 opacity-[0.03] pointer-events-none"
                    style={{ backgroundImage: `linear-gradient(#000 1px, transparent 1px), linear-gradient(90deg, #000 1px, transparent 1px)`, backgroundSize: '40px 40px' }}>
                </div>
            </section>

            {/* Features / Value Prop */}
            <section className="py-24 bg-secondary/20 border-y border-border">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="grid md:grid-cols-3 gap-12">
                        {/* Feature 1 */}
                        <div className="bg-card p-8 rounded-xl border border-border shadow-sm">
                            <div className="bg-blue-100 dark:bg-blue-900/30 w-12 h-12 rounded-lg flex items-center justify-center text-blue-600 dark:text-blue-400 mb-6">
                                <Activity size={24} />
                            </div>
                            <h3 className="text-xl font-bold mb-3">Live Signal Monitoring</h3>
                            <p className="text-muted-foreground leading-relaxed">
                                Don't rely on stale static data. We monitor foot traffic, digital footprints, and operational signals to confirm a place is alive and active.
                            </p>
                        </div>

                        {/* Feature 2 */}
                        <div className="bg-card p-8 rounded-xl border border-border shadow-sm">
                            <div className="bg-green-100 dark:bg-green-900/30 w-12 h-12 rounded-lg flex items-center justify-center text-green-600 dark:text-green-400 mb-6">
                                <ShieldCheck size={24} />
                            </div>
                            <h3 className="text-xl font-bold mb-3">Confidence & Validation</h3>
                            <p className="text-muted-foreground leading-relaxed">
                                Every data point comes with a confidence score. Know exactly when to trust the data and when to dispatch a human verifier.
                            </p>
                        </div>

                        {/* Feature 3 */}
                        <div className="bg-card p-8 rounded-xl border border-border shadow-sm">
                            <div className="bg-purple-100 dark:bg-purple-900/30 w-12 h-12 rounded-lg flex items-center justify-center text-purple-600 dark:text-purple-400 mb-6">
                                <Zap size={24} />
                            </div>
                            <h3 className="text-xl font-bold mb-3">Action-Ready APIs</h3>
                            <p className="text-muted-foreground leading-relaxed">
                                Standardized schemas for menus, hours, and entrances. Designed for LLM function calling and automated logistics workflows.
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            {/* API Preview Section */}
            <section className="py-24">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="grid lg:grid-cols-2 gap-16 items-center">
                        <div>
                            <h2 className="text-3xl font-bold mb-6">Built for Developers, <br />Optimized for Agents</h2>
                            <p className="text-lg text-muted-foreground mb-8">
                                Our API returns structured, validated intelligence. No more guessing if a restaurant is actually open or if the entrance is accessible.
                            </p>

                            <ul className="space-y-4">
                                <li className="flex items-center gap-3">
                                    <div className="bg-accent rounded-full p-1"><ArrowRight size={14} /></div>
                                    <span className="font-medium">Real-time "Open/Closed" verification</span>
                                </li>
                                <li className="flex items-center gap-3">
                                    <div className="bg-accent rounded-full p-1"><ArrowRight size={14} /></div>
                                    <span className="font-medium">Entrance precise geolocation (for robots)</span>
                                </li>
                                <li className="flex items-center gap-3">
                                    <div className="bg-accent rounded-full p-1"><ArrowRight size={14} /></div>
                                    <span className="font-medium">Confidence scores for every field</span>
                                </li>
                            </ul>

                            <div className="mt-10">
                                <button className="text-primary font-semibold hover:underline flex items-center gap-2">
                                    Explore API Reference <ArrowRight size={16} />
                                </button>
                            </div>
                        </div>

                        <div className="bg-zinc-900 rounded-lg shadow-2xl overflow-hidden border border-zinc-700">
                            <div className="flex items-center justify-between px-4 py-2 bg-zinc-800 border-b border-zinc-700">
                                <div className="flex gap-1.5">
                                    <div className="w-3 h-3 rounded-full bg-red-500" />
                                    <div className="w-3 h-3 rounded-full bg-yellow-500" />
                                    <div className="w-3 h-3 rounded-full bg-green-500" />
                                </div>
                                <div className="text-xs text-zinc-400 font-mono">GET /v1/places/validate</div>
                            </div>
                            <div className="p-6 overflow-x-auto">
                                <pre className="text-sm font-mono text-zinc-300">
                                    {`{
  "place_id": "pl_849201",
  "name": "Chai Point - Indiranagar",
  "status": {
    "state": "OPEN",
    "confidence": 0.98,
    "last_checked": "2024-10-24T14:30:00Z"
  },
  "metadata": {
    "entrances": [
      {
        "lat": 12.9716, 
        "lng": 77.6412,
        "type": "main_delivery"
      }
    ],
    "payment_methods": ["UPI", "Cash", "Cards"]
  }
}`}
                                </pre>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer className="bg-secondary/20 py-12 border-t border-border mt-12">
                <div className="max-w-7xl mx-auto px-4 text-center">
                    <div className="flex items-center justify-center gap-2 mb-4 opacity-70">
                        <MapPin size={24} />
                        <span className="font-bold text-xl">anyWays</span>
                    </div>
                    <p className="text-muted-foreground text-sm">
                        &copy; 2026 anyWays Intelligence. All rights reserved.
                    </p>
                </div>
            </footer>
        </div>
    );
};
