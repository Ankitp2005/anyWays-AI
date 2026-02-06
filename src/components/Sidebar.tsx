import React from 'react';
import { useApp } from '../context/AppContext';
import {
    LayoutDashboard,
    MapPin,
    List,
    Settings,
    Key,
    LogOut,
    ExternalLink,
    ChevronLeft
} from 'lucide-react';
import { cn } from '../utils/cn';

interface SidebarProps {
    activeTab: string;
    setActiveTab: (tab: 'overview' | 'places' | 'api' | 'settings') => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab }) => {
    const { setView } = useApp();

    const navItems = [
        { id: 'overview', label: 'Overview', icon: LayoutDashboard },
        { id: 'places', label: 'Places', icon: MapPin },
        { id: 'api', label: 'API Keys', icon: Key },
        { id: 'settings', label: 'Settings', icon: Settings },
    ];

    return (
        <div className="flex flex-col h-full bg-secondary/5 border-r border-border w-64">
            {/* Header */}
            <div className="p-4 h-16 flex items-center border-b border-border bg-background/50 backdrop-blur-sm">
                <div className="flex items-center gap-2 text-foreground font-bold text-lg tracking-tight">
                    <div className="bg-primary text-primary-foreground p-1 rounded-md shadow-sm">
                        <MapPin size={16} />
                    </div>
                    <span>anyWays</span>
                    <span className="bg-secondary text-[10px] px-1.5 py-0.5 rounded-full text-secondary-foreground font-medium uppercase tracking-wider">Dev</span>
                </div>
            </div>

            {/* Navigation */}
            <div className="flex-1 py-6 px-3 space-y-1">
                <div className="px-3 mb-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Platform
                </div>
                {navItems.map((item) => (
                    <button
                        key={item.id}
                        onClick={() => setActiveTab(item.id as any)}
                        className={cn(
                            "w-full flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md transition-all",
                            activeTab === item.id
                                ? "bg-primary/10 text-primary border border-primary/20"
                                : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                        )}
                    >
                        <item.icon size={18} />
                        {item.label}
                    </button>
                ))}

                <div className="mt-8 px-3 mb-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Resources
                </div>
                <a href="#" className="flex items-center gap-3 px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground rounded-md hover:bg-secondary transition-colors">
                    <List size={18} />
                    Documentation <ExternalLink size={12} className="ml-auto opacity-50" />
                </a>
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-border mt-auto bg-background/30">
                <button
                    onClick={() => setView('marketing')}
                    className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors w-full px-2 py-2 hover:bg-secondary rounded-md"
                >
                    <ChevronLeft size={16} />
                    Back to Home
                </button>
                <div className="mt-4 flex items-center gap-3 px-2">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-500 to-purple-500 flex items-center justify-center text-white font-bold text-xs ring-2 ring-background">
                        JS
                    </div>
                    <div className="flex-1 overflow-hidden">
                        <p className="text-sm font-medium truncate">John Smith</p>
                        <p className="text-xs text-muted-foreground truncate">john@example.com</p>
                    </div>
                    <button className="text-muted-foreground hover:text-destructive transition-colors">
                        <LogOut size={16} />
                    </button>
                </div>
            </div>
        </div>
    );
};
