import React from 'react';
import { Check, ArrowRight, ChevronLeft } from 'lucide-react';
import { cn } from '../utils/cn';
import { useApp } from '../context/AppContext';

const PricingTier = ({ 
    name, 
    price, 
    description, 
    features, 
    cta, 
    popular = false
}: { 
    name: string, 
    price: string, 
    description: string, 
    features: string[], 
    cta: string, 
    popular?: boolean
}) => {
    return (
        <div className={cn(
            "relative flex flex-col p-8 rounded-[16px] border bg-[#07080a] transition-all duration-300",
            popular 
                ? "border-[#ffffff]/25 shadow-subtle-3" 
                : "border-[#222225] shadow-subtle-4"
        )}>
            {popular && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#1b1c1e] text-[#ffffff] border border-white/10 px-3 py-0.5 rounded-[6px] text-[10px] font-medium tracking-[0.04em] uppercase font-mono shadow-subtle-2">
                    Beta Access
                </span>
            )}
            <div className="mb-8">
                <h3 className="text-lg font-semibold mb-2 text-[#ffffff]">{name}</h3>
                <p className="text-xs text-[#6a6b6c]">{description}</p>
            </div>
            <div className="mb-8">
                <span className="text-3xl font-bold font-mono text-[#ffffff] tracking-tight">{price}</span>
                {price !== "Custom" && price !== "Waitlist" && price !== "Free (Beta)" && <span className="text-xs text-[#6a6b6c]">/mo</span>}
            </div>
            <div className="flex-1 space-y-4 mb-8">
                {features.map((feature, i) => (
                    <div key={i} className="flex items-start gap-3 text-xs">
                        <Check className="mt-0.5 text-[#ff6363] shrink-0" size={14} />
                        <span className="text-[#9c9c9d]">{feature}</span>
                    </div>
                ))}
            </div>
            <button className={cn(
                "w-full py-2.5 font-bold transition-all duration-200 flex items-center justify-center gap-2 group text-xs rounded-[8px]",
                popular 
                    ? "bg-[#e6e6e6] text-[#2f3031] hover:opacity-90 shadow-subtle" 
                    : "bg-transparent text-[#9c9c9d] border border-[#454647] hover:border-white/40 hover:text-[#ffffff]"
            )}>
                {cta}
                <ArrowRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
            </button>
        </div>
    );
};

export const Pricing: React.FC<{ embedded?: boolean }> = ({ embedded = false }) => {
    const { setView } = useApp();

    return (
        <div className={embedded
            ? "text-[#ffffff] font-sans selection:bg-[#ff6363]/30"
            : "min-h-screen bg-[#040506] text-[#ffffff] py-24 px-6 relative font-sans selection:bg-[#ff6363]/30"
        }>
            {!embedded && (
                <button 
                    onClick={() => setView('marketing')}
                    className="absolute top-8 left-8 flex items-center gap-2 text-xs font-mono text-[#9c9c9d] hover:text-[#ffffff] transition-colors"
                >
                    <ChevronLeft size={14} />
                    Back to Home
                </button>
            )}
            <div className="max-w-7xl mx-auto">
                <div className="text-center mb-16 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <p className="text-[#ff6363] text-xs font-mono uppercase tracking-[0.2em] mb-3">Pricing</p>
                    <h1 className="text-2xl md:text-4xl font-semibold text-[#ffffff] leading-tight tracking-tight mb-4">
                        Simple, transparent pricing
                    </h1>
                    <p className="text-sm text-[#6a6b6c] max-w-xl mx-auto leading-relaxed">
                        Reduce failed deliveries and verify locations at scale. Start free, scale as you grow.
                    </p>
                    <div className="mt-6 flex flex-wrap justify-center gap-6 text-xs font-mono text-[#6a6b6c]">
                        <div className="flex items-center gap-2">
                            <Check className="text-[#ff6363]" size={12} />
                            Currently in Free Beta
                        </div>
                        <div className="flex items-center gap-2">
                            <Check className="text-[#ff6363]" size={12} />
                            No Payment Required
                        </div>
                        <div className="flex items-center gap-2">
                            <Check className="text-[#ff6363]" size={12} />
                            Full API Access
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                    <PricingTier 
                        name="Developer"
                        description="Perfect for testing and early-stage builds"
                        price="Free (Beta)"
                        cta="Start for Free"
                        features={[
                            "10,000 signals / month",
                            "Basic signals (Foot Traffic, Social)",
                            "7-day data retention",
                            "Single user dashboard",
                            "Community support"
                        ]}
                        popular={false}
                    />
                    <PricingTier 
                        name="Starter"
                        description="For startups validating real-world operations"
                        price="Waitlist"
                        cta="Join Waitlist"
                        features={[
                            "25,000 signals / month",
                            "1 Advanced signal (OCR Menu)",
                            "30-day data retention",
                            "Basic analytics dashboard",
                            "Standard email support"
                        ]}
                        popular={false}
                    />
                    <PricingTier 
                        name="Growth"
                        description="For scaling logistics & AI platforms"
                        price="Waitlist"
                        cta="Join Waitlist"
                        popular={true}
                        features={[
                            "100,000 signals / month",
                            "All Advanced signals",
                            "Pickup Location Verified",
                            "OCR Menu Support",
                            "90-day data retention",
                            "Team access (5 users)",
                            "Priority 24/7 support"
                        ]}
                    />
                    <PricingTier 
                        name="Enterprise"
                        description="For high-scale mission-critical systems"
                        price="Custom"
                        cta="Contact Sales"
                        features={[
                            "Unlimited signals (contract)",
                            "Dedicated infrastructure",
                            "White-label SDKs",
                            "Real-time edge validation",
                            "99.99% SLA Uptime",
                            "Dedicated Account Manager"
                        ]}
                        popular={false}
                    />
                </div>

                <div className="mt-24 p-12 rounded-[16px] bg-[#07080a] border border-[#363739] text-center relative overflow-hidden shadow-subtle-4">
                    <h2 className="text-2xl font-bold mb-4 uppercase text-[#ffffff] tracking-tight">Reduce operational loss, not just API calls</h2>
                    <p className="text-sm text-[#6a6b6c] max-w-3xl mx-auto leading-relaxed mb-8">
                        Even a 2–5% improvement in delivery accuracy can save lakhs every month.
                        From map data to ground truth. Get started for free today.
                    </p>
                    <button 
                        onClick={() => setView('register')}
                        className="px-8 py-3 bg-[#e6e6e6] text-[#2f3031] hover:opacity-90 font-bold rounded-[8px] transition-all text-xs font-sans shadow-subtle"
                    >
                        Get Free API Key
                    </button>
                </div>
            </div>
        </div>
    );
};
