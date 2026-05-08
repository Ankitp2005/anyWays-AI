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
    popular = false,
    color = "primary"
}: { 
    name: string, 
    price: string, 
    description: string, 
    features: string[], 
    cta: string, 
    popular?: boolean,
    color?: "primary" | "orange" | "blue" | "purple"
}) => {
    const colorClasses = {
        primary: "border-primary/20 bg-primary/5",
        orange: "border-orange-500/20 bg-orange-500/5",
        blue: "border-blue-500/20 bg-blue-500/5",
        purple: "border-purple-500/20 bg-purple-500/5"
    };

    const buttonClasses = {
        primary: "bg-primary text-primary-foreground hover:bg-primary/90",
        orange: "bg-orange-600 text-white hover:bg-orange-700",
        blue: "bg-blue-600 text-white hover:bg-blue-700",
        purple: "bg-purple-600 text-white hover:bg-purple-700"
    };

    return (
        <div className={cn(
            "relative flex flex-col p-8 rounded-3xl border transition-all duration-300 hover:shadow-2xl hover:-translate-y-1",
            colorClasses[color],
            popular ? "ring-2 ring-primary scale-105 z-10 shadow-xl bg-card" : "bg-card/50 backdrop-blur-sm"
        )}>
            {popular && (
                <span className="absolute -top-4 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground px-4 py-1 rounded-full text-xs font-bold tracking-widest uppercase">
                    Most Popular
                </span>
            )}
            <div className="mb-8">
                <h3 className="text-xl font-bold mb-2">{name}</h3>
                <p className="text-sm text-muted-foreground">{description}</p>
            </div>
            <div className="mb-8">
                <span className="text-4xl font-bold">{price}</span>
                {price !== "Custom" && <span className="text-muted-foreground">/mo</span>}
            </div>
            <div className="flex-1 space-y-4 mb-8">
                {features.map((feature, i) => (
                    <div key={i} className="flex items-start gap-3 text-sm">
                        <Check className="mt-0.5 text-primary shrink-0" size={16} />
                        <span className="text-muted-foreground">{feature}</span>
                    </div>
                ))}
            </div>
            <button className={cn(
                "w-full py-3 rounded-xl font-bold transition-all flex items-center justify-center gap-2 group",
                buttonClasses[color]
            )}>
                {cta}
                <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
            </button>
        </div>
    );
};

export const Pricing: React.FC = () => {
    const { setView } = useApp();

    return (
        <div className="min-h-screen bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/10 via-background to-background py-24 px-6 relative">
            <button 
                onClick={() => setView('marketing')}
                className="absolute top-8 left-8 flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
                <ChevronLeft size={16} />
                Back to Home
            </button>
            <div className="max-w-7xl mx-auto">
                <div className="text-center mb-20 animate-in fade-in slide-in-from-bottom-4 duration-1000">
                    <h1 className="text-5xl md:text-7xl font-black tracking-tighter mb-6 bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/50">
                        Real-Time Place Intelligence
                    </h1>
                    <p className="text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
                        Reduce failed deliveries, verify locations, and make smarter decisions using live ground-truth signals.
                    </p>
                    <div className="mt-10 flex flex-wrap justify-center gap-8 text-sm font-medium text-muted-foreground">
                        <div className="flex items-center gap-2">
                            <Check className="text-green-500" size={18} />
                            Improve delivery success rate
                        </div>
                        <div className="flex items-center gap-2">
                            <Check className="text-green-500" size={18} />
                            Validate locations in real-time
                        </div>
                        <div className="flex items-center gap-2">
                            <Check className="text-green-500" size={18} />
                            Built for Indian logistics & AI
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                    <PricingTier 
                        name="Developer"
                        description="Perfect for testing and early-stage builds"
                        price="₹0"
                        cta="Start for Free"
                        features={[
                            "10,000 signals / month",
                            "Basic signals (Foot Traffic, Social)",
                            "7-day data retention",
                            "Single user dashboard",
                            "Community support"
                        ]}
                        color="primary"
                    />
                    <PricingTier 
                        name="Starter"
                        description="For startups validating real-world operations"
                        price="₹999"
                        cta="Upgrade to Starter"
                        features={[
                            "25,000 signals / month",
                            "1 Advanced signal (OCR Menu)",
                            "30-day data retention",
                            "Basic analytics dashboard",
                            "Standard email support"
                        ]}
                        color="orange"
                    />
                    <PricingTier 
                        name="Growth"
                        description="For scaling logistics & AI platforms"
                        price="₹4,999"
                        cta="Start Scaling"
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
                        color="blue"
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
                        color="purple"
                    />
                </div>

                <div className="mt-24 p-12 rounded-[40px] bg-secondary/30 border border-border backdrop-blur-xl text-center relative overflow-hidden group">
                    <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
                    <h2 className="text-3xl font-bold mb-4 relative z-10">Reduce operational loss, not just API calls</h2>
                    <p className="text-lg text-muted-foreground max-w-3xl mx-auto relative z-10">
                        Even a 2–5% improvement in delivery accuracy can save <span className="text-foreground font-bold italic">lakhs every month</span>.
                        From map data to ground truth.
                    </p>
                    <button className="mt-8 px-8 py-4 bg-foreground text-background rounded-2xl font-bold hover:scale-105 transition-transform relative z-10">
                        Get Free API Key
                    </button>
                </div>
            </div>
        </div>
    );
};
