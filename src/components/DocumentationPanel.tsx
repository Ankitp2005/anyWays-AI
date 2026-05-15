import React, { useState } from 'react';
import { BookOpen, Key, MapPin, Activity, Shield, Zap } from 'lucide-react';
import { cn } from '../utils/cn';

type DocSection = 'intro' | 'auth' | 'places' | 'signals' | 'webhooks';

export const DocumentationPanel: React.FC = () => {
    const [activeSection, setActiveSection] = useState<DocSection>('intro');

    const navItems: { id: DocSection; label: string; icon: React.ElementType }[] = [
        { id: 'intro', label: 'Introduction', icon: BookOpen },
        { id: 'auth', label: 'Authentication', icon: Key },
        { id: 'places', label: 'Places API', icon: MapPin },
        { id: 'signals', label: 'Validation Signals', icon: Activity },
        { id: 'webhooks', label: 'Webhooks', icon: Zap },
    ];

    return (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 h-[calc(100vh-100px)] flex flex-col md:flex-row gap-8">
            
            {/* Left Sidebar Navigation */}
            <div className="w-full md:w-64 shrink-0 flex flex-col gap-2">
                <div className="mb-4">
                    <h1 className="text-2xl font-bold tracking-tight">API Reference</h1>
                    <p className="text-sm text-muted-foreground mt-1">Integrate anyWays intelligence into your logistics platform.</p>
                </div>

                <nav className="space-y-1">
                    {navItems.map((item) => (
                        <button
                            key={item.id}
                            onClick={() => setActiveSection(item.id)}
                            className={cn(
                                "w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-lg transition-all",
                                activeSection === item.id
                                    ? "bg-primary text-primary-foreground shadow-sm"
                                    : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                            )}
                        >
                            <item.icon size={16} />
                            {item.label}
                        </button>
                    ))}
                </nav>
            </div>

            {/* Right Content Area */}
            <div className="flex-1 overflow-y-auto pr-4 scrollbar-thin">
                <div className="bg-card border border-border rounded-2xl p-8 shadow-sm">
                    {activeSection === 'intro' && (
                        <div className="space-y-6">
                            <div className="flex items-center gap-3 border-b border-border pb-4">
                                <div className="p-2 bg-blue-500/10 text-blue-500 rounded-lg">
                                    <BookOpen size={24} />
                                </div>
                                <div>
                                    <h2 className="text-xl font-bold text-foreground">Welcome to anyWays API</h2>
                                    <p className="text-sm text-muted-foreground">The authoritative ground-truth intelligence platform.</p>
                                </div>
                            </div>
                            
                            <div className="prose prose-sm dark:prose-invert max-w-none text-muted-foreground">
                                <p>
                                    The anyWays API is a RESTful interface that allows your logistics platform to integrate real-time 
                                    ground-truth intelligence, place validation, and dynamic confidence scoring into your routing engines.
                                </p>
                                <h3 className="text-foreground font-semibold mt-6 mb-2">Base URL</h3>
                                <div className="bg-secondary/50 p-3 rounded-lg border border-border font-mono text-xs text-foreground flex items-center gap-2">
                                    <span className="text-muted-foreground">GET</span> https://api.anyways.ai/v1
                                </div>

                                <h3 className="text-foreground font-semibold mt-6 mb-2">Core Capabilities</h3>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                                    <div className="p-4 border border-border rounded-xl bg-background">
                                        <Shield size={20} className="text-primary mb-2" />
                                        <h4 className="font-bold text-foreground">Place Validation</h4>
                                        <p className="text-xs mt-1">Verify business status, precise lat/lng, and operating hours dynamically.</p>
                                    </div>
                                    <div className="p-4 border border-border rounded-xl bg-background">
                                        <Activity size={20} className="text-orange-500 mb-2" />
                                        <h4 className="font-bold text-foreground">Signal Processing</h4>
                                        <p className="text-xs mt-1">Ingest fleet data to automatically adjust confidence scores using exponential decay.</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeSection === 'auth' && (
                        <div className="space-y-6">
                            <div className="flex items-center gap-3 border-b border-border pb-4">
                                <div className="p-2 bg-purple-500/10 text-purple-500 rounded-lg">
                                    <Key size={24} />
                                </div>
                                <div>
                                    <h2 className="text-xl font-bold text-foreground">Authentication</h2>
                                    <p className="text-sm text-muted-foreground">Secure your requests with Bearer tokens.</p>
                                </div>
                            </div>

                            <div className="space-y-4 text-sm text-muted-foreground">
                                <p>All API requests must be authenticated using an API key provided in the HTTP `Authorization` header.</p>
                                
                                <div className="bg-[#0D1117] text-gray-300 p-4 rounded-xl font-mono text-xs overflow-x-auto border border-border shadow-inner">
                                    <span className="text-purple-400">Authorization:</span> Bearer <span className="text-green-400">any_test_12345abcdef</span>
                                </div>

                                <div className="p-4 bg-orange-500/10 border border-orange-500/20 rounded-xl flex gap-3 text-orange-700 dark:text-orange-400">
                                    <Shield size={18} className="shrink-0 mt-0.5" />
                                    <p className="text-xs leading-relaxed">
                                        <strong>Keep your keys safe.</strong> Do not expose your API keys in client-side code (like frontend React apps). Always route requests through your own secure backend.
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeSection === 'places' && (
                        <div className="space-y-6">
                            <div className="flex items-center gap-3 border-b border-border pb-4">
                                <div className="p-2 bg-emerald-500/10 text-emerald-500 rounded-lg">
                                    <MapPin size={24} />
                                </div>
                                <div>
                                    <h2 className="text-xl font-bold text-foreground">Places API</h2>
                                    <p className="text-sm text-muted-foreground">Retrieve and manage physical locations.</p>
                                </div>
                            </div>

                            <div className="space-y-6">
                                {/* Endpoint Block */}
                                <div className="border border-border rounded-xl overflow-hidden">
                                    <div className="bg-secondary/30 p-3 border-b border-border flex items-center gap-3">
                                        <span className="bg-green-500/20 text-green-600 dark:text-green-400 px-2 py-1 rounded text-xs font-bold tracking-wider">GET</span>
                                        <code className="text-sm font-semibold text-foreground">/v1/places/:id</code>
                                    </div>
                                    <div className="p-4 text-sm text-muted-foreground">
                                        <p className="mb-4">Retrieves the latest intelligence and confidence score for a specific place.</p>
                                        <h4 className="font-semibold text-foreground mb-2 text-xs uppercase tracking-wider">Example Response</h4>
                                        <pre className="bg-[#0D1117] text-gray-300 p-4 rounded-lg font-mono text-xs overflow-x-auto">
{`{
  "id": "plc_8f7d92a",
  "name": "Sunshine Public School",
  "status": "OPEN",
  "confidence_score": 85,
  "coordinates": {
    "lat": 34.0522,
    "lng": -118.2437
  },
  "last_validated_at": "2026-05-15T14:30:00Z"
}`}
                                        </pre>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeSection === 'signals' && (
                        <div className="space-y-6">
                            <div className="flex items-center gap-3 border-b border-border pb-4">
                                <div className="p-2 bg-orange-500/10 text-orange-500 rounded-lg">
                                    <Activity size={24} />
                                </div>
                                <div>
                                    <h2 className="text-xl font-bold text-foreground">Validation Signals</h2>
                                    <p className="text-sm text-muted-foreground">Ingest reality into the confidence engine.</p>
                                </div>
                            </div>

                            <div className="space-y-6">
                                <p className="text-sm text-muted-foreground">
                                    Push telemetry from your delivery fleets (GPS dwell times, OCR scans, app check-ins) to automatically update place confidence scores.
                                </p>

                                {/* Endpoint Block */}
                                <div className="border border-border rounded-xl overflow-hidden">
                                    <div className="bg-secondary/30 p-3 border-b border-border flex items-center gap-3">
                                        <span className="bg-blue-500/20 text-blue-600 dark:text-blue-400 px-2 py-1 rounded text-xs font-bold tracking-wider">POST</span>
                                        <code className="text-sm font-semibold text-foreground">/v1/signals</code>
                                    </div>
                                    <div className="p-4 text-sm text-muted-foreground">
                                        <h4 className="font-semibold text-foreground mb-2 text-xs uppercase tracking-wider">Request Body</h4>
                                        <pre className="bg-[#0D1117] text-gray-300 p-4 rounded-lg font-mono text-xs overflow-x-auto">
{`{
  "place_id": "plc_8f7d92a",
  "signal_type": "GPS_ARRIVAL_VERIFIED",
  "confidence_impact": 15,
  "signal_value": {
    "driver_id": "drv_99",
    "dwell_time_seconds": 120,
    "accuracy_meters": 4.5
  }
}`}
                                        </pre>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeSection === 'webhooks' && (
                        <div className="space-y-6">
                            <div className="flex items-center gap-3 border-b border-border pb-4">
                                <div className="p-2 bg-pink-500/10 text-pink-500 rounded-lg">
                                    <Zap size={24} />
                                </div>
                                <div>
                                    <h2 className="text-xl font-bold text-foreground">Webhooks</h2>
                                    <p className="text-sm text-muted-foreground">Real-time alerts for critical score collapses.</p>
                                </div>
                            </div>

                            <div className="space-y-4 text-sm text-muted-foreground">
                                <p>Register webhook endpoints to receive immediate HTTP POST requests when important events occur in your places portfolio.</p>
                                
                                <div className="mt-6 border border-border rounded-xl overflow-hidden">
                                    <div className="bg-secondary/30 px-4 py-2 border-b border-border">
                                        <h4 className="font-semibold text-foreground text-xs uppercase tracking-wider">Supported Events</h4>
                                    </div>
                                    <ul className="divide-y divide-border">
                                        <li className="p-4 flex gap-4">
                                            <code className="text-xs font-bold text-primary shrink-0">place.confidence_collapse</code>
                                            <span className="text-xs">Triggered when a place's confidence score drops below 40 due to consecutive negative validation signals.</span>
                                        </li>
                                        <li className="p-4 flex gap-4">
                                            <code className="text-xs font-bold text-primary shrink-0">place.status_changed</code>
                                            <span className="text-xs">Triggered when a place status flips from OPEN to CLOSED or vice-versa.</span>
                                        </li>
                                    </ul>
                                </div>
                            </div>
                        </div>
                    )}

                </div>
            </div>
        </div>
    );
};
