import React from 'react';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import {
    LayoutDashboard,
    MapPin,
    Settings,
    Key,
    LogOut,
    ChevronLeft,
    Activity,
    CreditCard,
    Sun,
    Moon,
    BookOpen
} from 'lucide-react';
import { cn } from '../utils/cn';

interface SidebarProps {
    activeTab: string;
    setActiveTab: (tab: 'overview' | 'places' | 'api' | 'observability' | 'pricing' | 'settings' | 'documentation') => void;
    isCollapsed: boolean;
}

export const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab, isCollapsed }) => {
    const { setView } = useApp();
    const { user, logout } = useAuth();
    const { theme, toggleTheme } = useTheme();

    const displayName = user?.user_metadata?.name || user?.email?.split('@')[0] || 'User';
    const displayEmail = user?.email || '';
    const initials = displayName.slice(0, 2).toUpperCase();

    const navItems = [
        { id: 'overview', label: 'Overview', icon: LayoutDashboard },
        { id: 'places', label: 'Places Intelligence', icon: MapPin },
        { id: 'api', label: 'API Management', icon: Key },
        { id: 'observability', label: 'Observability', icon: Activity },
        { id: 'pricing', label: 'Pricing', icon: CreditCard },
        { id: 'settings', label: 'Settings', icon: Settings },
    ];

    const handleLogout = async () => {
        await logout();
        setView('marketing');
    };

    return (
        <div className={cn(
            "flex flex-col h-full bg-background/80 backdrop-blur-3xl border-r border-border transition-all duration-500 relative overflow-hidden z-20 shadow-2xl",
            isCollapsed ? "w-0 border-none" : "w-64"
        )}>
            {/* Header */}
            <div className="p-4 h-16 flex items-center border-b border-border bg-secondary/10 overflow-hidden shrink-0">
                <div className="flex items-center gap-2 text-foreground font-bold text-lg tracking-tight shrink-0">
                    <div className="bg-primary text-primary-foreground p-1 rounded-md shadow-sm">
                        <MapPin size={16} />
                    </div>
                    {!isCollapsed && (
                        <>
                            <span>anyWays</span>
                            <span className="bg-secondary text-[10px] px-1.5 py-0.5 rounded-full text-secondary-foreground font-medium uppercase tracking-wider">Dev</span>
                        </>
                    )}
                </div>
            </div>

            {/* Navigation */}
            <div className="flex-1 py-6 px-3 space-y-1 overflow-x-hidden">
                {!isCollapsed && (
                    <div className="px-3 mb-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                        Platform
                    </div>
                )}
                {navItems.map((item) => (
                    <button
                        key={item.id}
                        onClick={() => setActiveTab(item.id as any)}
                        title={isCollapsed ? item.label : ""}
                        className={cn(
                            "w-full flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md transition-all duration-300",
                            activeTab === item.id
                                ? "bg-secondary text-foreground shadow-sm"
                                : "text-muted-foreground hover:bg-secondary/50 hover:text-foreground"
                        )}
                    >
                        <item.icon size={18} className="shrink-0" />
                        {!isCollapsed && <span>{item.label}</span>}
                    </button>
                ))}

                {!isCollapsed && (
                    <>
                        <div className="mt-8 px-3 mb-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                            Resources
                        </div>
                        <button 
                            onClick={() => setActiveTab('documentation')}
                            className={cn(
                                "w-full flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md transition-all duration-300",
                                activeTab === 'documentation'
                                    ? "bg-secondary text-foreground shadow-sm"
                                    : "text-muted-foreground hover:bg-secondary/50 hover:text-foreground"
                            )}
                        >
                            <BookOpen size={18} className="shrink-0" />
                            <span>Documentation</span>
                        </button>
                    </>
                )}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-border mt-auto bg-secondary/10 overflow-hidden">
                <div className="flex items-center justify-between mb-4">
                    <button
                        onClick={() => setView('marketing')}
                        title="Back to Home"
                        className={cn(
                            "flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors px-2 py-2 hover:bg-secondary rounded-md shrink-0",
                            isCollapsed && "justify-center"
                        )}
                    >
                        <ChevronLeft size={16} />
                        {!isCollapsed && <span>Back to Home</span>}
                    </button>
                    
                    {!isCollapsed && (
                        <button
                            onClick={toggleTheme}
                            className="p-2 text-muted-foreground hover:text-foreground hover:bg-secondary rounded-md transition-all"
                            title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
                        >
                            {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
                        </button>
                    )}
                </div>

                <div className="flex items-center gap-3 px-2">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-500 to-purple-500 flex items-center justify-center text-white font-bold text-xs ring-2 ring-background shrink-0">
                        {initials}
                    </div>
                    {!isCollapsed && (
                        <div className="flex-1 overflow-hidden">
                            <p className="text-sm font-medium truncate">{displayName}</p>
                            <p className="text-xs text-muted-foreground truncate">{displayEmail}</p>
                        </div>
                    )}
                    <button
                        onClick={handleLogout}
                        title="Logout"
                        className="text-muted-foreground hover:text-destructive transition-colors shrink-0"
                    >
                        <LogOut size={16} />
                    </button>
                </div>
            </div>
        </div>
    );
};
