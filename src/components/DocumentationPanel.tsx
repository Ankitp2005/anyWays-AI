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
        <div className="animate-in fade-in h-[calc(100vh-120px)] grid grid-cols-1 md:grid-cols-[256px_1fr] gap-8">
            
            {/* Left Sidebar Navigation */}
            <div className="w-full flex flex-col gap-2">
                <div className="mb-4">
                    <h1 className="text-2xl font-semibold tracking-tight text-[#ffffff]">API Reference</h1>
                    <p className="text-xs text-[#6a6b6c] mt-1">Integrate anyWays intelligence into your logistics platform.</p>
                </div>

                <nav className="space-y-1.5">
                    {navItems.map((item) => (
                        <button
                            key={item.id}
                            onClick={() => setActiveSection(item.id)}
                            className={cn(
                                "w-full flex items-center gap-3 px-4 py-2 text-xs font-semibold rounded-[8px] border transition-all duration-200 cursor-pointer",
                                activeSection === item.id
                                    ? "bg-[#111214] text-white border-[#ff6363]/25 shadow-subtle-2"
                                    : "bg-transparent text-[#6a6b6c] border-transparent hover:text-white hover:bg-white/5"
                            )}
                        >
                            <item.icon size={14} className="shrink-0" />
                            {item.label}
                            {activeSection === item.id && (
                                <span className="w-1 h-1 rounded-full bg-[#ff6363] ml-auto shrink-0" />
                            )}
                        </button>
                    ))}
                </nav>
            </div>

            {/* Right Content Area */}
            <div className="overflow-y-auto pr-4 scrollbar-thin">
                <div className="bg-[#07080a] border border-[#363739] rounded-[11px] p-8 shadow-subtle-4">
                    {activeSection === 'intro' && (
                        <div className="space-y-6">
                            <div className="flex items-center gap-3 border-b border-[#1b1c1e] pb-4">
                                <div className="p-2.5 border border-white/5 text-[#ffffff] bg-[#1b1c1e] rounded-[8px] flex items-center justify-center w-12 h-12 shrink-0 shadow-subtle-2">
                                    <BookOpen size={20} />
                                </div>
                                <div>
                                    <h2 className="text-lg font-semibold text-[#ffffff] tracking-tight">Welcome to anyWays API</h2>
                                    <p className="text-xs text-[#6a6b6c]">The authoritative ground-truth intelligence platform.</p>
                                </div>
                            </div>
                            
                            <div className="text-white space-y-4 text-xs leading-relaxed">
                                <p>
                                    The anyWays API is a RESTful interface that allows your logistics platform to integrate real-time 
                                    ground-truth intelligence, place validation, and dynamic confidence scoring into your routing engines.
                                </p>
                                <h3 className="text-white font-semibold uppercase tracking-[0.04em] text-[10px] mt-6 mb-2 font-mono">Base URL</h3>
                                <div className="bg-[#111214] p-3 rounded-[8px] border border-white/5 font-mono text-xs text-white flex items-center gap-2 shadow-subtle-2">
                                    <span className="text-[#59d499] font-bold">GET</span> https://api.anyways.ai/v1
                                </div>

                                <h3 className="text-white font-semibold uppercase tracking-[0.04em] text-[10px] mt-6 mb-2 font-mono">Core Capabilities</h3>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                                    <div className="p-4 border border-white/5 rounded-[11px] bg-[#111214] shadow-subtle-2">
                                        <Shield size={18} className="text-[#ffffff] mb-2" />
                                        <h4 className="font-semibold text-sm uppercase tracking-wide text-white">Place Validation</h4>
                                        <p className="text-[11px] text-[#6a6b6c] mt-1">Verify business status, precise lat/lng, and operating hours dynamically.</p>
                                    </div>
                                    <div className="p-4 border border-white/5 rounded-[11px] bg-[#111214] shadow-subtle-2">
                                        <Activity size={18} className="text-[#ff6363] mb-2" />
                                        <h4 className="font-semibold text-sm uppercase tracking-wide text-white">Signal Processing</h4>
                                        <p className="text-[11px] text-[#6a6b6c] mt-1">Ingest fleet data to automatically adjust confidence scores using exponential decay.</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeSection === 'auth' && (
                        <div className="space-y-6">
                            <div className="flex items-center gap-3 border-b border-[#1b1c1e] pb-4">
                                <div className="p-2.5 border border-white/5 text-[#ffffff] bg-[#1b1c1e] rounded-[8px] flex items-center justify-center w-12 h-12 shrink-0 shadow-subtle-2">
                                    <Key size={20} />
                                </div>
                                <div>
                                    <h2 className="text-lg font-semibold text-[#ffffff] tracking-tight">Authentication</h2>
                                    <p className="text-xs text-[#6a6b6c]">Secure your requests with Bearer tokens.</p>
                                </div>
                            </div>

                            <div className="space-y-4 text-xs text-white leading-relaxed">
                                <p>All API requests must be authenticated using an API key provided in the HTTP `Authorization` header.</p>
                                
                                <div className="bg-[#111214] text-white p-4 rounded-[8px] font-mono text-xs overflow-x-auto border border-white/5 shadow-subtle-2">
                                    <span className="text-[#6a6b6c]">Authorization:</span> Bearer <span className="text-[#ff6363]">any_test_12345abcdef</span>
                                </div>

                                <div className="p-4 border border-[#ff6363]/40 rounded-[11px] bg-[#452324]/10 flex gap-3 text-[#ff6363] shadow-subtle-4">
                                    <Shield size={18} className="shrink-0 mt-0.5" />
                                    <p className="text-[11px] leading-relaxed">
                                        <strong>Keep your keys safe.</strong> Do not expose your API keys in client-side code (like frontend React apps). Always route requests through your own secure backend.
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeSection === 'places' && (
                        <div className="space-y-6">
                            <div className="flex items-center gap-3 border-b border-[#1b1c1e] pb-4">
                                <div className="p-2.5 border border-white/5 text-[#ffffff] bg-[#1b1c1e] rounded-[8px] flex items-center justify-center w-12 h-12 shrink-0 shadow-subtle-2">
                                    <MapPin size={20} />
                                </div>
                                <div>
                                    <h2 className="text-lg font-semibold text-[#ffffff] tracking-tight">Places API</h2>
                                    <p className="text-xs text-[#6a6b6c]">Retrieve and manage physical locations.</p>
                                </div>
                            </div>

                            <div className="space-y-6">
                                {/* Endpoint Block */}
                                <div className="border border-[#363739] rounded-[11px] overflow-hidden shadow-subtle-4">
                                    <div className="bg-[#111214] p-3 border-b border-[#1b1c1e] flex items-center gap-3">
                                        <span className="border border-white/10 text-[#ffffff] bg-[#1b1c1e] px-2 py-0.5 rounded-[6px] text-[10px] font-mono shadow-subtle-2">GET</span>
                                        <code className="text-xs font-mono font-bold text-white">/v1/places/:id</code>
                                    </div>
                                    <div className="p-4 text-xs text-white">
                                        <p className="mb-4">Retrieves the latest intelligence and confidence score for a specific place.</p>
                                        <h4 className="font-bold text-[#6a6b6c] mb-2 text-[10px] uppercase tracking-wider font-mono">Example Response</h4>
                                        <pre className="bg-[#111214] text-white p-4 rounded-[8px] font-mono text-xs overflow-x-auto border border-white/5 shadow-subtle-2">
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
                            <div className="flex items-center gap-3 border-b border-[#1b1c1e] pb-4">
                                <div className="p-2.5 border border-white/5 text-[#ffffff] bg-[#1b1c1e] rounded-[8px] flex items-center justify-center w-12 h-12 shrink-0 shadow-subtle-2">
                                    <Activity size={20} />
                                </div>
                                <div>
                                    <h2 className="text-lg font-semibold text-[#ffffff] tracking-tight">Validation Signals</h2>
                                    <p className="text-xs text-[#6a6b6c]">Ingest reality into the confidence engine.</p>
                                </div>
                            </div>

                            <div className="space-y-6">
                                <p className="text-xs text-white leading-relaxed">
                                    Push telemetry from your delivery fleets (GPS dwell times, OCR scans, app check-ins) to automatically update place confidence scores.
                                </p>

                                {/* Endpoint Block */}
                                <div className="border border-[#363739] rounded-[11px] overflow-hidden shadow-subtle-4">
                                    <div className="bg-[#111214] p-3 border-b border-[#1b1c1e] flex items-center gap-3">
                                        <span className="border border-[#ff6363]/30 text-[#ff6363] bg-[#452324]/20 px-2 py-0.5 rounded-[6px] text-[10px] font-mono shadow-subtle-2">POST</span>
                                        <code className="text-xs font-mono font-bold text-white">/v1/signals</code>
                                    </div>
                                    <div className="p-4 text-xs text-white">
                                        <h4 className="font-bold text-[#6a6b6c] mb-2 text-[10px] uppercase tracking-wider font-mono">Request Body</h4>
                                        <pre className="bg-[#111214] text-white p-4 rounded-[8px] font-mono text-xs overflow-x-auto border border-white/5 shadow-subtle-2">
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
                            <div className="flex items-center gap-3 border-b border-[#1b1c1e] pb-4">
                                <div className="p-2.5 border border-white/5 text-[#ffffff] bg-[#1b1c1e] rounded-[8px] flex items-center justify-center w-12 h-12 shrink-0 shadow-subtle-2">
                                    <Zap size={20} />
                                </div>
                                <div>
                                    <h2 className="text-lg font-semibold text-[#ffffff] tracking-tight">Webhooks</h2>
                                    <p className="text-xs text-[#6a6b6c]">Real-time alerts for critical score collapses.</p>
                                </div>
                            </div>

                            <div className="space-y-4 text-xs text-white leading-relaxed">
                                <p>Register webhook endpoints to receive immediate HTTP POST requests when important events occur in your places portfolio.</p>
                                
                                <div className="mt-6 border border-[#363739] rounded-[11px] overflow-hidden shadow-subtle-4">
                                    <div className="bg-[#111214] px-4 py-3 border-b border-[#1b1c1e]">
                                        <h4 className="font-semibold text-[#ffffff] text-[10px] uppercase tracking-wider font-mono">Supported Events</h4>
                                    </div>
                                    <ul className="divide-y divide-[#1b1c1e]">
                                        <li className="p-4 flex gap-4">
                                            <code className="text-xs font-mono font-bold text-[#ff6363] shrink-0">place.confidence_collapse</code>
                                            <span className="text-[11px] text-[#6a6b6c]">Triggered when a place's confidence score drops below 40 due to consecutive negative validation signals.</span>
                                        </li>
                                        <li className="p-4 flex gap-4">
                                            <code className="text-xs font-mono font-bold text-[#ff6363] shrink-0">place.status_changed</code>
                                            <span className="text-[11px] text-[#6a6b6c]">Triggered when a place status flips from OPEN to CLOSED or vice-versa.</span>
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
