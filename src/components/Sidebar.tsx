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
            "flex flex-col h-full bg-[#07080a] border-r border-[#1b1c1e] transition-all duration-300 relative overflow-hidden z-20 shrink-0",
            isCollapsed ? "w-0 border-none" : "w-64"
        )}>
            {/* Header */}
            <div className="p-4 h-16 flex items-center border-b border-[#1b1c1e] bg-transparent overflow-hidden shrink-0">
                <div className="flex items-center gap-2 text-[#ffffff] font-bold text-lg tracking-tight shrink-0">
                    <div className="border border-white/10 text-[#ff6363] p-1 rounded-[8px] bg-[#1b1c1e] shadow-subtle-2">
                        <MapPin size={16} />
                    </div>
                    {!isCollapsed && (
                        <>
                            <span className="font-sans">anyWays</span>
                            <span className="border border-white/10 text-[10px] px-1.5 py-0.5 rounded-[6px] text-white font-medium uppercase tracking-[0.04em] font-mono bg-[#1b1c1e] shadow-subtle-2">Dev</span>
                        </>
                    )}
                </div>
            </div>

            {/* Navigation */}
            <div className="flex-1 py-6 px-3 space-y-1 overflow-x-hidden">
                {!isCollapsed && (
                    <div className="px-3 mb-2 text-[10px] font-bold text-[#6a6b6c] uppercase tracking-[0.2em] font-mono">
                        Platform
                    </div>
                )}
                {navItems.map((item) => (
                    <button
                        key={item.id}
                        onClick={() => setActiveTab(item.id as any)}
                        title={isCollapsed ? item.label : ""}
                        className={cn(
                            "w-full flex items-center gap-3 px-3 py-2 text-sm rounded-[8px] transition-all duration-200 border",
                            activeTab === item.id
                                ? "text-[#ffffff] font-semibold bg-[#111214] border-white/5 shadow-subtle-2"
                                : "text-[#6a6b6c] hover:bg-white/5 hover:text-[#ffffff] border-transparent font-medium"
                        )}
                    >
                        <item.icon size={18} className="shrink-0" />
                        {!isCollapsed && <span>{item.label}</span>}
                        {!isCollapsed && activeTab === item.id && (
                            <span className="w-1.5 h-1.5 rounded-full bg-[#ff6363] ml-auto shrink-0" />
                        )}
                    </button>
                ))}

                {!isCollapsed && (
                    <>
                        <div className="mt-8 px-3 mb-2 text-[10px] font-bold text-[#6a6b6c] uppercase tracking-[0.2em] font-mono">
                            Resources
                        </div>
                        <button 
                            onClick={() => setActiveTab('documentation')}
                            className={cn(
                                "w-full flex items-center gap-3 px-3 py-2 text-sm rounded-[8px] transition-all duration-200 border",
                                activeTab === 'documentation'
                                    ? "text-[#ffffff] font-semibold bg-[#111214] border-white/5 shadow-subtle-2"
                                    : "text-[#6a6b6c] hover:bg-white/5 hover:text-[#ffffff] border-transparent font-medium"
                            )}
                        >
                            <BookOpen size={18} className="shrink-0" />
                            <span>Documentation</span>
                            {activeTab === 'documentation' && (
                                <span className="w-1.5 h-1.5 rounded-full bg-[#ff6363] ml-auto shrink-0" />
                            )}
                        </button>
                    </>
                )}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-[#1b1c1e] mt-auto bg-transparent overflow-hidden">
                <div className="flex items-center justify-between mb-4">
                    <button
                        onClick={() => setView('marketing')}
                        title="Back to Home"
                        className={cn(
                            "flex items-center gap-2 text-xs text-[#6a6b6c] hover:text-[#ffffff] transition-colors px-2 py-1.5 hover:bg-white/5 rounded-[8px] shrink-0",
                            isCollapsed && "justify-center"
                        )}
                    >
                        <ChevronLeft size={16} />
                        {!isCollapsed && <span>Back to Home</span>}
                    </button>
                    
                    {!isCollapsed && (
                        <button
                            onClick={toggleTheme}
                            className="p-1.5 text-[#6a6b6c] hover:text-[#ffffff] hover:bg-white/5 rounded-[8px] transition-all"
                            title={`Switch theme`}
                        >
                            {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
                        </button>
                    )}
                </div>

                <div className="flex items-center gap-3 px-2">
                    <div className="w-8 h-8 rounded-full border border-white/10 bg-[#1b1c1e] flex items-center justify-center text-[#ffffff] font-bold text-xs shrink-0 shadow-subtle-2">
                        {initials}
                    </div>
                    {!isCollapsed && (
                        <div className="flex-1 overflow-hidden">
                            <p className="text-sm font-medium truncate text-[#ffffff]">{displayName}</p>
                            <p className="text-[10px] text-[#6a6b6c] truncate font-mono">{displayEmail}</p>
                        </div>
                    )}
                    <button
                        onClick={handleLogout}
                        title="Logout"
                        className="text-[#6a6b6c] hover:text-[#ff6363] transition-colors shrink-0"
                    >
                        <LogOut size={16} />
                    </button>
                </div>
            </div>
        </div>
    );
};
