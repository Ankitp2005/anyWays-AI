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
            "relative flex flex-col p-8 rounded-xl border border-[#40372e] border-dashed bg-transparent transition-all duration-300",
            popular ? "border-[#ffedd7] border-solid" : ""
        )}>
            {popular && (
                <span className="absolute -top-4 left-1/2 -translate-x-1/2 bg-[#382416] text-[#ffedd7] border border-[#ffedd7]/20 px-4 py-1 rounded-full text-[10px] font-bold tracking-widest uppercase">
                    Beta Access
                </span>
            )}
            <div className="mb-8">
                <h3 className="text-lg font-bold mb-2 text-[#ffedd7]">{name}</h3>
                <p className="text-xs text-[#6c5f51]">{description}</p>
            </div>
            <div className="mb-8">
                <span className="text-3xl font-black font-mono text-[#ffedd7]">{price}</span>
                {price !== "Custom" && price !== "Waitlist" && price !== "Free (Beta)" && <span className="text-xs text-[#6c5f51]">/mo</span>}
            </div>
            <div className="flex-1 space-y-4 mb-8">
                {features.map((feature, i) => (
                    <div key={i} className="flex items-start gap-3 text-xs">
                        <Check className="mt-0.5 text-[#dc5000] shrink-0" size={14} />
                        <span className="text-[#6c5f51]">{feature}</span>
                    </div>
                ))}
            </div>
            <button className={cn(
                "w-full py-3 font-bold transition-all flex items-center justify-center gap-2 group text-xs",
                popular 
                    ? "bg-[#382416] text-[#ffedd7] border border-[#ffedd7]/15 hover:border-[#ffedd7]/40 hover:bg-[#382416]/80 rounded-[36px]" 
                    : "bg-transparent text-[#ffedd7] border border-[#ffedd7] hover:border-[#dc5000] rounded-[22.5px]"
            )}>
                {cta}
                <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
            </button>
        </div>
    );
};

export const Pricing: React.FC = () => {
    const { setView } = useApp();

    return (
        <div className="min-h-screen bg-[#100904] text-[#ffedd7] py-24 px-6 relative font-sans selection:bg-[#dc5000]/30">
            <button 
                onClick={() => setView('marketing')}
                className="absolute top-8 left-8 flex items-center gap-2 text-xs font-mono text-[#ffedd7]/60 hover:text-[#ffedd7] transition-colors"
            >
                <ChevronLeft size={14} />
                Back to Home
            </button>
            <div className="max-w-7xl mx-auto">
                <div className="text-center mb-20 animate-in fade-in slide-in-from-bottom-4 duration-1000">
                    <h1 className="text-4xl md:text-[51px] font-black text-[#ffedd7] leading-[0.9] tracking-tight mb-6 uppercase">
                        Real-Time Place Intelligence
                    </h1>
                    <p className="text-sm text-[#ffedd7] max-w-2xl mx-auto leading-[1.2] font-medium mb-10">
                        Reduce failed deliveries, verify locations, and make smarter decisions using live ground-truth signals.
                    </p>
                    <div className="mt-10 flex flex-wrap justify-center gap-8 text-xs font-mono text-[#6c5f51]">
                        <div className="flex items-center gap-2">
                            <Check className="text-[#dc5000]" size={14} />
                            Currently in Free Beta
                        </div>
                        <div className="flex items-center gap-2">
                            <Check className="text-[#dc5000]" size={14} />
                            No Payment Required
                        </div>
                        <div className="flex items-center gap-2">
                            <Check className="text-[#dc5000]" size={14} />
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

                <div className="mt-24 p-12 rounded-xl bg-transparent border border-[#40372e] border-dashed text-center relative overflow-hidden">
                    <h2 className="text-2xl font-black mb-4 uppercase text-[#ffedd7]">Reduce operational loss, not just API calls</h2>
                    <p className="text-sm text-[#6c5f51] max-w-3xl mx-auto leading-relaxed mb-8">
                        Even a 2–5% improvement in delivery accuracy can save lakhs every month.
                        From map data to ground truth. Get started for free today.
                    </p>
                    <button className="px-8 py-3 bg-[#382416] text-[#ffedd7] border border-[#ffedd7]/10 hover:border-[#ffedd7]/30 hover:opacity-90 font-bold rounded-[36px] transition-all text-xs">
                        Get Free API Key
                    </button>
                </div>
            </div>
        </div>
    );
};
