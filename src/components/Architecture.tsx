import React, { useState } from 'react';
import { 
    ChevronLeft, 
    ArrowRight, 
    Layers, 
    Shield, 
    Activity, 
    Database, 
    Zap, 
    Cpu, 
    Lock, 
    CheckCircle2, 
    Terminal,
    Eye
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { cn } from '../utils/cn';

interface NodeDetail {
    title: string;
    subtitle: string;
    icon: React.ElementType;
    color: string;
    description: string;
    techStack: string[];
    mechanics: string[];
    codeExample?: string;
}

export const Architecture: React.FC = () => {
    const { setView } = useApp();
    const [activeNode, setActiveNode] = useState<string>('gateway');

    const nodes: Record<string, NodeDetail> = {
        clients: {
            title: 'Ingestion & Client Layer',
            subtitle: 'Edge telemetry & API clients',
            icon: Cpu,
            color: '#fb923c', // Orange
            description: 'Autonomous agents, robotics systems, mobile delivery apps, and logistics consoles push live updates. Telemetry data includes GPS dwell times, physical check-ins, social sentiment signals, and OCR-scanned restaurant menus.',
            techStack: ['React SDK', 'Node.js SDK', 'Edge Functions', 'iOS / Android SDKs'],
            mechanics: [
                'Sends telemetry asynchronously to reduce client latency',
                'Passes optional x-simulation headers for staging isolation',
                'Supports batched signal sending for low-bandwidth environments'
            ],
            codeExample: `// Client-side telemetry push
import { AnywaysSDK } from '@anyways/sdk';

const client = new AnywaysSDK({ apiKey: 'any_test_...' });
await client.signals.ingest({
  placeId: 'plc_8f7d92a',
  type: 'GPS_ARRIVAL_VERIFIED',
  value: { dwellTimeSeconds: 120 }
});`
        },
        gateway: {
            title: 'API Gateway & Security',
            subtitle: 'Rate limiting & authentication',
            icon: Shield,
            color: '#ff6363', // Red/Orange
            description: 'The secure entry point for all API requests. Validates Bearer tokens, filters malicious payloads, isolates simulator traffic via logical guards, and applies subscription-aware rate limiting at the edge.',
            techStack: ['Express.js', 'JWT Auth Middleware', 'Zod validation', 'PostgreSQL Rate Limiter'],
            mechanics: [
                'Token-Bucket rate limiter prevents API abuse',
                'Zod validation schemas ensure type safety at boundary',
                'Simulation guards isolate mock data from production pipelines'
            ],
            codeExample: `// Rate Limiter Token Bucket check
const checkRateLimit = async (apiKey: string) => {
  const bucket = await prisma.apiKey.findUnique({
    where: { key: apiKey }
  });
  
  if (bucket.tokens < 1) throw new Error('429 Too Many Requests');
  
  await prisma.apiKey.update({
    where: { id: bucket.id },
    data: { tokens: bucket.tokens - 1 }
  });
};`
        },
        engine: {
            title: 'Trust & Scoring Engine',
            subtitle: 'Multi-source confidence aggregator',
            icon: Activity,
            color: '#59d499', // Mint Green
            description: 'Calculates the real-time reliability of a physical location by processing multiple signals. Weights signals based on provider authority, source accuracy, and temporal relevance. Employs exponential decay for older signals.',
            techStack: ['Scoring Algorithms', 'Time-Decay Functions', 'JSON Data Aggregators'],
            mechanics: [
                'Exponential decay function: S(t) = S_0 * e^(-λ * t)',
                'Calculates aggregate confidence score (0-100)',
                'Triggers place.confidence_collapse webhooks if score drops below 40'
            ],
            codeExample: `// Trust Score calculation with decay
const calculateConfidence = (signals: Signal[]) => {
  let score = 50; // Base confidence
  
  signals.forEach(sig => {
    const elapsed = Date.now() - new Date(sig.timestamp).getTime();
    const decay = Math.exp(-0.0001 * (elapsed / 3600000)); // decay constant
    score += sig.confidenceImpact * decay;
  });
  
  return Math.min(100, Math.max(0, Math.round(score)));
};`
        },
        database: {
            title: 'Storage & Persistence',
            subtitle: 'Relational ground truth DB',
            icon: Database,
            color: '#a78bfa', // Purple
            description: 'Provides absolute persistence for verified places, authentication records, API keys, validation telemetry, and audit logs. Leverages relational schemas to enforce integrity constraints across places and signals.',
            techStack: ['PostgreSQL', 'Prisma ORM', 'Database Indexes', 'JSONB Storage'],
            mechanics: [
                'Spatial indexes for high-speed coordinate queries',
                'Telemetry archive database logs all incoming signals',
                'Foreign key integrity constraints guarantee audit compliance'
            ],
            codeExample: `// Prisma schema definition
model Place {
  id              String   @id @default(uuid())
  name            String
  address         String
  status          Status   @default(OPEN)
  confidenceScore Int      @default(50)
  signals         Signal[]
  createdAt       DateTime @default(now())
}`
        }
    };

    return (
        <div className="min-h-screen bg-[#040506] text-[#ffffff] py-20 px-6 relative font-sans overflow-hidden selection:bg-[#ff6363]/30">
            {/* Background Grid Accent */}
            <div className="absolute inset-0 bg-[radial-gradient(80%_60%_at_50%_40%,rgba(245,35,35,0.06),rgba(0,0,0,0))] pointer-events-none z-0" />
            <div className="absolute inset-0 bg-[linear-gradient(to_right,#0c0e12_1px,transparent_1px),linear-gradient(to_bottom,#0c0e12_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_40%,#000_70%,transparent_100%)] pointer-events-none z-0 opacity-40" />

            <button 
                onClick={() => setView('marketing')}
                className="absolute top-8 left-8 flex items-center gap-2 text-xs font-mono text-[#9c9c9d] hover:text-[#ffffff] transition-colors z-10"
            >
                <ChevronLeft size={14} />
                Back to Home
            </button>

            <div className="max-w-6xl mx-auto relative z-10 pt-8">
                {/* Header */}
                <div className="text-center mb-16">
                    <p className="text-[#ff6363] text-xs font-mono uppercase tracking-[0.2em] mb-3">Architecture & Pipeline</p>
                    <h1 className="text-3xl md:text-5xl font-semibold tracking-[-0.08em] leading-tight text-[#ffffff] uppercase mb-4">
                        SYSTEM ARCHITECTURE
                    </h1>
                    <p className="text-sm text-[#9c9c9d] max-w-xl mx-auto leading-relaxed">
                        Learn how anyWays ingests live telemetry, validates locations, computes real-time confidence scores, and serves the ground truth.
                    </p>
                </div>

                {/* Interactive Diagram Section */}
                <div className="bg-[#07080a] border border-[#363739] rounded-[16px] p-8 mb-12 shadow-subtle-4 relative">
                    <div className="absolute top-4 right-4 flex items-center gap-1.5 px-2.5 py-1 rounded-[6px] bg-[#111214] border border-white/5 text-[9px] font-bold text-[#6a6b6c] uppercase tracking-wider font-mono shadow-subtle-2">
                        <Eye size={10} className="text-[#ff6363]" /> Click nodes to inspect
                    </div>
                    
                    <h3 className="text-xs font-bold text-[#6a6b6c] uppercase tracking-[0.2em] font-mono mb-8">Pipeline Visualizer</h3>

                    {/* Diagram Layout */}
                    <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 items-center justify-center relative mb-8">
                        
                        {Object.entries(nodes).map(([key, node], index) => {
                            const Icon = node.icon;
                            const isActive = activeNode === key;
                            
                            return (
                                <React.Fragment key={key}>
                                    {/* Component Node */}
                                    <div 
                                        onClick={() => setActiveNode(key)}
                                        className={cn(
                                            "relative p-6 rounded-[12px] border transition-all duration-300 cursor-pointer group flex flex-col items-center text-center",
                                            isActive 
                                                ? "bg-[#111214] shadow-subtle-3" 
                                                : "bg-[#07080a] border-[#222225] hover:border-[#363739] hover:bg-white/5 shadow-subtle-4"
                                        )}
                                        style={{ 
                                            borderColor: isActive ? node.color + '55' : undefined 
                                        }}
                                    >
                                        <div 
                                            className="p-3.5 rounded-[10px] border w-fit mb-4 transition-all duration-300"
                                            style={{ 
                                                borderColor: isActive ? node.color + '60' : 'rgba(255, 255, 255, 0.05)',
                                                backgroundColor: isActive ? node.color + '15' : '#1b1c1e',
                                                color: node.color
                                            }}
                                        >
                                            <Icon size={24} className="stroke-[1.5]" />
                                        </div>
                                        <span className="text-[10px] font-bold uppercase tracking-wider text-[#6a6b6c] font-mono mb-1">
                                            Step 0{index + 1}
                                        </span>
                                        <h4 className="text-sm font-bold text-white mb-1 group-hover:text-white transition-colors">
                                            {node.title}
                                        </h4>
                                        <p className="text-[11px] text-[#6a6b6c] max-w-[180px]">
                                            {node.subtitle}
                                        </p>

                                        {/* Pulse glow dot for active element */}
                                        {isActive && (
                                            <span 
                                                className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full animate-pulse shadow-lg"
                                                style={{ backgroundColor: node.color }}
                                            />
                                        )}
                                    </div>

                                    {/* Arrow Connector (Only between items and not on last item in row) */}
                                    {index < 3 && (
                                        <div className="hidden lg:flex items-center justify-center absolute z-0 pointer-events-none" style={{ left: `${(index + 1) * 25 - 2}%`, width: '4%' }}>
                                            <ArrowRight size={16} className="text-[#363739] animate-pulse" />
                                        </div>
                                    )}
                                </React.Fragment>
                            );
                        })}
                    </div>

                    {/* Active Node Detail Panel */}
                    <div className="border-t border-[#1b1c1e] pt-8 grid grid-cols-1 lg:grid-cols-[1.2fr_1fr] gap-8">
                        <div>
                            <div className="flex items-center gap-3 mb-4">
                                <div 
                                    className="p-2 rounded-[8px] border text-white w-fit"
                                    style={{ 
                                        borderColor: nodes[activeNode].color + '40', 
                                        backgroundColor: nodes[activeNode].color + '15',
                                        color: nodes[activeNode].color 
                                    }}
                                >
                                    {React.createElement(nodes[activeNode].icon, { size: 16 })}
                                </div>
                                <div>
                                    <h4 className="text-base font-bold text-white">{nodes[activeNode].title}</h4>
                                    <p className="text-xs text-[#6a6b6c] font-mono uppercase tracking-wider">{nodes[activeNode].subtitle}</p>
                                </div>
                            </div>
                            
                            <p className="text-xs text-[#9c9c9d] leading-relaxed mb-6">
                                {nodes[activeNode].description}
                            </p>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                <div>
                                    <h5 className="text-[10px] font-bold text-[#6a6b6c] uppercase tracking-wider font-mono mb-2">Technologies</h5>
                                    <div className="flex flex-wrap gap-1.5">
                                        {nodes[activeNode].techStack.map(tech => (
                                            <span key={tech} className="px-2 py-0.5 rounded-[4px] border border-white/5 bg-[#111214] text-[10px] text-white font-mono shadow-subtle-2">
                                                {tech}
                                            </span>
                                        ))}
                                    </div>
                                </div>

                                <div>
                                    <h5 className="text-[10px] font-bold text-[#6a6b6c] uppercase tracking-wider font-mono mb-2">Key Mechanics</h5>
                                    <ul className="space-y-1.5">
                                        {nodes[activeNode].mechanics.map((mech, i) => (
                                            <li key={i} className="flex items-start gap-2 text-[10px] text-[#9c9c9d] leading-normal">
                                                <CheckCircle2 size={10} className="text-[#ff6363] shrink-0 mt-0.5" />
                                                <span>{mech}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            </div>
                        </div>

                        {/* Code Snippet Box */}
                        {nodes[activeNode].codeExample && (
                            <div className="flex flex-col h-full">
                                <div className="bg-[#111214] border border-[#222225] rounded-[8px] overflow-hidden flex-1 flex flex-col shadow-subtle-2">
                                    <div className="px-4 py-2 border-b border-[#222225] bg-[#07080a] flex items-center justify-between">
                                        <div className="flex items-center gap-1.5">
                                            <Terminal size={12} className="text-[#6a6b6c]" />
                                            <span className="text-[10px] text-[#6a6b6c] font-bold uppercase tracking-wider font-mono">Reference Code</span>
                                        </div>
                                        <span className="text-[9px] text-[#6a6b6c] font-mono">typescript</span>
                                    </div>
                                    <div className="p-4 overflow-x-auto flex-1 font-mono text-[11px] leading-relaxed text-[#ffffff] bg-[#111214]">
                                        <pre>{nodes[activeNode].codeExample}</pre>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Deep Dive Section */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="p-6 rounded-[12px] border border-[#222225] bg-[#07080a] shadow-subtle-4">
                        <div className="p-2.5 rounded-[8px] border border-white/5 bg-[#1b1c1e] w-fit mb-4 text-[#ff6363]">
                            <Zap size={18} />
                        </div>
                        <h4 className="text-sm font-bold text-white uppercase tracking-wider mb-2">Edge Rate Limiter</h4>
                        <p className="text-xs text-[#6a6b6c] leading-relaxed">
                            Utilizes a distributed token-bucket algorithm run via PostgreSQL state management. Protects ingestion edge functions and routes requests safely based on the developer plan (Growth limit: 100k, Starter: 25k).
                        </p>
                    </div>

                    <div className="p-6 rounded-[12px] border border-[#222225] bg-[#07080a] shadow-subtle-4">
                        <div className="p-2.5 rounded-[8px] border border-white/5 bg-[#1b1c1e] w-fit mb-4 text-[#fb923c]">
                            <Lock size={18} />
                        </div>
                        <h4 className="text-sm font-bold text-white uppercase tracking-wider mb-2">Staging Simulation Isolation</h4>
                        <p className="text-xs text-[#6a6b6c] leading-relaxed">
                            Enforces clear staging constraints using the custom <code className="text-[#ffffff] bg-[#111214] px-1 py-0.5 rounded border border-white/5 font-mono text-[10px]">x-simulation</code> header. Simulation requests route to logical sandboxes, protecting production analytics.
                        </p>
                    </div>

                    <div className="p-6 rounded-[12px] border border-[#222225] bg-[#07080a] shadow-subtle-4">
                        <div className="p-2.5 rounded-[8px] border border-white/5 bg-[#1b1c1e] w-fit mb-4 text-[#59d499]">
                            <Layers size={18} />
                        </div>
                        <h4 className="text-sm font-bold text-white uppercase tracking-wider mb-2">Confidence Score Decay</h4>
                        <p className="text-xs text-[#6a6b6c] leading-relaxed">
                            Calculates decay parameters at the database level to ensure stale location data loses influence over time. Signals naturally expire if they aren't refreshed by active on-ground telemetry streams.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Architecture;
