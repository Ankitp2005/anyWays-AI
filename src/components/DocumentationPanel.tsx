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
        <div className="animate-in fade-in h-[calc(100vh-100px)] flex flex-col md:flex-row gap-8">
            
            {/* Left Sidebar Navigation */}
            <div className="w-full md:w-64 shrink-0 flex flex-col gap-2">
                <div className="mb-4">
                    <h1 className="text-2xl font-black uppercase tracking-tight text-[#ffedd7]">API Reference</h1>
                    <p className="text-xs text-[#6c5f51] mt-1">Integrate anyWays intelligence into your logistics platform.</p>
                </div>

                <nav className="space-y-1.5">
                    {navItems.map((item) => (
                        <button
                            key={item.id}
                            onClick={() => setActiveSection(item.id)}
                            className={cn(
                                "w-full flex items-center gap-3 px-4 py-2.5 text-xs font-bold uppercase tracking-wider rounded-[22.5px] border transition-all cursor-pointer",
                                activeSection === item.id
                                    ? "bg-[#382416] text-[#ffedd7] border-[#ffedd7]/15"
                                    : "bg-transparent text-[#6c5f51] border-transparent hover:text-[#ffedd7] hover:bg-[#382416]/20"
                            )}
                        >
                            <item.icon size={14} className="shrink-0" />
                            {item.label}
                        </button>
                    ))}
                </nav>
            </div>

            {/* Right Content Area */}
            <div className="flex-1 overflow-y-auto pr-4 scrollbar-thin">
                <div className="bg-[#100904] border border-[#40372e] border-dashed rounded-xl p-8">
                    {activeSection === 'intro' && (
                        <div className="space-y-6">
                            <div className="flex items-center gap-3 border-b border-[#40372e] border-dashed pb-4">
                                <div className="p-2.5 border border-[#ffedd7]/20 text-[#ffedd7] bg-transparent rounded-xl flex items-center justify-center w-12 h-12 shrink-0">
                                    <BookOpen size={20} />
                                </div>
                                <div>
                                    <h2 className="text-lg font-black uppercase tracking-tight text-[#ffedd7]">Welcome to anyWays API</h2>
                                    <p className="text-xs text-[#6c5f51]">The authoritative ground-truth intelligence platform.</p>
                                </div>
                            </div>
                            
                            <div className="text-[#ffedd7] space-y-4 text-xs leading-relaxed">
                                <p>
                                    The anyWays API is a RESTful interface that allows your logistics platform to integrate real-time 
                                    ground-truth intelligence, place validation, and dynamic confidence scoring into your routing engines.
                                </p>
                                <h3 className="text-[#ffedd7] font-bold uppercase tracking-wider text-[10px] mt-6 mb-2 font-mono">Base URL</h3>
                                <div className="bg-[#100904]/40 p-3 rounded-none border border-[#40372e] font-mono text-xs text-[#ffedd7] flex items-center gap-2">
                                    <span className="text-[#dc5000] font-bold">GET</span> https://api.anyways.ai/v1
                                </div>

                                <h3 className="text-[#ffedd7] font-bold uppercase tracking-wider text-[10px] mt-6 mb-2 font-mono">Core Capabilities</h3>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                                    <div className="p-4 border border-[#40372e] border-dashed rounded-xl bg-transparent">
                                        <Shield size={18} className="text-[#ffedd7] mb-2" />
                                        <h4 className="font-bold text-sm uppercase tracking-wide text-[#ffedd7]">Place Validation</h4>
                                        <p className="text-[11px] text-[#6c5f51] mt-1">Verify business status, precise lat/lng, and operating hours dynamically.</p>
                                    </div>
                                    <div className="p-4 border border-[#40372e] border-dashed rounded-xl bg-transparent">
                                        <Activity size={18} className="text-[#dc5000] mb-2" />
                                        <h4 className="font-bold text-sm uppercase tracking-wide text-[#ffedd7]">Signal Processing</h4>
                                        <p className="text-[11px] text-[#6c5f51] mt-1">Ingest fleet data to automatically adjust confidence scores using exponential decay.</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeSection === 'auth' && (
                        <div className="space-y-6">
                            <div className="flex items-center gap-3 border-b border-[#40372e] border-dashed pb-4">
                                <div className="p-2.5 border border-[#ffedd7]/20 text-[#ffedd7] bg-transparent rounded-xl flex items-center justify-center w-12 h-12 shrink-0">
                                    <Key size={20} />
                                </div>
                                <div>
                                    <h2 className="text-lg font-black uppercase tracking-tight text-[#ffedd7]">Authentication</h2>
                                    <p className="text-xs text-[#6c5f51]">Secure your requests with Bearer tokens.</p>
                                </div>
                            </div>

                            <div className="space-y-4 text-xs text-[#ffedd7] leading-relaxed">
                                <p>All API requests must be authenticated using an API key provided in the HTTP `Authorization` header.</p>
                                
                                <div className="bg-[#100904]/40 text-[#ffedd7] p-4 rounded-none font-mono text-xs overflow-x-auto border border-[#40372e]">
                                    <span className="text-[#6c5f51]">Authorization:</span> Bearer <span className="text-[#dc5000]">any_test_12345abcdef</span>
                                </div>

                                <div className="p-4 border border-[#dc5000]/40 rounded-xl flex gap-3 text-[#dc5000] bg-transparent">
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
                            <div className="flex items-center gap-3 border-b border-[#40372e] border-dashed pb-4">
                                <div className="p-2.5 border border-[#ffedd7]/20 text-[#ffedd7] bg-transparent rounded-xl flex items-center justify-center w-12 h-12 shrink-0">
                                    <MapPin size={20} />
                                </div>
                                <div>
                                    <h2 className="text-lg font-black uppercase tracking-tight text-[#ffedd7]">Places API</h2>
                                    <p className="text-xs text-[#6c5f51]">Retrieve and manage physical locations.</p>
                                </div>
                            </div>

                            <div className="space-y-6">
                                {/* Endpoint Block */}
                                <div className="border border-[#40372e] border-dashed rounded-xl overflow-hidden">
                                    <div className="bg-transparent p-3 border-b border-[#40372e] border-dashed flex items-center gap-3">
                                        <span className="border border-[#ffedd7]/30 text-[#ffedd7] px-2.5 py-0.5 rounded-[22.5px] text-[10px] font-mono font-bold tracking-wider">GET</span>
                                        <code className="text-xs font-mono font-bold text-[#ffedd7]">/v1/places/:id</code>
                                    </div>
                                    <div className="p-4 text-xs text-[#ffedd7]">
                                        <p className="mb-4">Retrieves the latest intelligence and confidence score for a specific place.</p>
                                        <h4 className="font-bold text-[#6c5f51] mb-2 text-[10px] uppercase tracking-wider font-mono">Example Response</h4>
                                        <pre className="bg-[#100904]/40 text-[#ffedd7] p-4 rounded-none font-mono text-xs overflow-x-auto border border-[#40372e]">
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
                            <div className="flex items-center gap-3 border-b border-[#40372e] border-dashed pb-4">
                                <div className="p-2.5 border border-[#ffedd7]/20 text-[#ffedd7] bg-transparent rounded-xl flex items-center justify-center w-12 h-12 shrink-0">
                                    <Activity size={20} />
                                </div>
                                <div>
                                    <h2 className="text-lg font-black uppercase tracking-tight text-[#ffedd7]">Validation Signals</h2>
                                    <p className="text-xs text-[#6c5f51]">Ingest reality into the confidence engine.</p>
                                </div>
                            </div>

                            <div className="space-y-6">
                                <p className="text-xs text-[#ffedd7] leading-relaxed">
                                    Push telemetry from your delivery fleets (GPS dwell times, OCR scans, app check-ins) to automatically update place confidence scores.
                                </p>

                                {/* Endpoint Block */}
                                <div className="border border-[#40372e] border-dashed rounded-xl overflow-hidden">
                                    <div className="bg-transparent p-3 border-b border-[#40372e] border-dashed flex items-center gap-3">
                                        <span className="border border-[#dc5000]/40 text-[#dc5000] px-2.5 py-0.5 rounded-[22.5px] text-[10px] font-mono font-bold tracking-wider">POST</span>
                                        <code className="text-xs font-mono font-bold text-[#ffedd7]">/v1/signals</code>
                                    </div>
                                    <div className="p-4 text-xs text-[#ffedd7]">
                                        <h4 className="font-bold text-[#6c5f51] mb-2 text-[10px] uppercase tracking-wider font-mono">Request Body</h4>
                                        <pre className="bg-[#100904]/40 text-[#ffedd7] p-4 rounded-none font-mono text-xs overflow-x-auto border border-[#40372e]">
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
                            <div className="flex items-center gap-3 border-b border-[#40372e] border-dashed pb-4">
                                <div className="p-2.5 border border-[#ffedd7]/20 text-[#ffedd7] bg-transparent rounded-xl flex items-center justify-center w-12 h-12 shrink-0">
                                    <Zap size={20} />
                                </div>
                                <div>
                                    <h2 className="text-lg font-black uppercase tracking-tight text-[#ffedd7]">Webhooks</h2>
                                    <p className="text-xs text-[#6c5f51]">Real-time alerts for critical score collapses.</p>
                                </div>
                            </div>

                            <div className="space-y-4 text-xs text-[#ffedd7] leading-relaxed">
                                <p>Register webhook endpoints to receive immediate HTTP POST requests when important events occur in your places portfolio.</p>
                                
                                <div className="mt-6 border border-[#40372e] border-dashed rounded-xl overflow-hidden">
                                    <div className="bg-transparent px-4 py-3 border-b border-[#40372e] border-dashed">
                                        <h4 className="font-bold text-[#ffedd7] text-[10px] uppercase tracking-wider font-mono">Supported Events</h4>
                                    </div>
                                    <ul className="divide-y divide-[#40372e] divide-dashed">
                                        <li className="p-4 flex gap-4">
                                            <code className="text-xs font-mono font-bold text-[#dc5000] shrink-0">place.confidence_collapse</code>
                                            <span className="text-[11px] text-[#6c5f51]">Triggered when a place's confidence score drops below 40 due to consecutive negative validation signals.</span>
                                        </li>
                                        <li className="p-4 flex gap-4">
                                            <code className="text-xs font-mono font-bold text-[#dc5000] shrink-0">place.status_changed</code>
                                            <span className="text-[11px] text-[#6c5f51]">Triggered when a place status flips from OPEN to CLOSED or vice-versa.</span>
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
