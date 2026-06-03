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
            "flex flex-col h-full bg-[#100904] border-r border-[#40372e] border-dashed transition-all duration-500 relative overflow-hidden z-20",
            isCollapsed ? "w-0 border-none" : "w-64"
        )}>
            {/* Header */}
            <div className="p-4 h-16 flex items-center border-b border-[#40372e] border-dashed bg-transparent overflow-hidden shrink-0">
                <div className="flex items-center gap-2 text-[#ffedd7] font-bold text-lg tracking-tight shrink-0">
                    <div className="border border-[#ffedd7]/30 text-[#ffedd7] p-1 rounded-lg bg-transparent">
                        <MapPin size={16} />
                    </div>
                    {!isCollapsed && (
                        <>
                            <span>anyWays</span>
                            <span className="border border-[#ffedd7]/20 text-[10px] px-1.5 py-0.5 rounded-full text-[#ffedd7] font-medium uppercase tracking-wider font-mono">Dev</span>
                        </>
                    )}
                </div>
            </div>

            {/* Navigation */}
            <div className="flex-1 py-6 px-3 space-y-1 overflow-x-hidden">
                {!isCollapsed && (
                    <div className="px-3 mb-2 text-[10px] font-bold text-[#6c5f51] uppercase tracking-[0.2em] font-mono">
                        Platform
                    </div>
                )}
                {navItems.map((item) => (
                    <button
                        key={item.id}
                        onClick={() => setActiveTab(item.id as any)}
                        title={isCollapsed ? item.label : ""}
                        className={cn(
                            "w-full flex items-center gap-3 px-3 py-2 text-sm rounded-lg transition-all duration-300 relative overflow-hidden",
                            activeTab === item.id
                                ? "text-[#ffedd7] font-bold after:absolute after:left-0 after:top-0 after:bottom-0 after:w-[2px] after:bg-[#dc5000] bg-transparent"
                                : "text-[#6c5f51] hover:bg-[#382416]/25 hover:text-[#ffedd7] font-medium"
                        )}
                    >
                        <item.icon size={18} className="shrink-0" />
                        {!isCollapsed && <span>{item.label}</span>}
                    </button>
                ))}

                {!isCollapsed && (
                    <>
                        <div className="mt-8 px-3 mb-2 text-[10px] font-bold text-[#6c5f51] uppercase tracking-[0.2em] font-mono">
                            Resources
                        </div>
                        <button 
                            onClick={() => setActiveTab('documentation')}
                            className={cn(
                            "w-full flex items-center gap-3 px-3 py-2 text-sm rounded-lg transition-all duration-300 relative overflow-hidden",
                            activeTab === 'documentation'
                                ? "text-[#ffedd7] font-bold after:absolute after:left-0 after:top-0 after:bottom-0 after:w-[2px] after:bg-[#dc5000] bg-transparent"
                                : "text-[#6c5f51] hover:bg-[#382416]/25 hover:text-[#ffedd7] font-medium"
                        )}
                        >
                            <BookOpen size={18} className="shrink-0" />
                            <span>Documentation</span>
                        </button>
                    </>
                )}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-[#40372e] border-dashed mt-auto bg-transparent overflow-hidden">
                <div className="flex items-center justify-between mb-4">
                    <button
                        onClick={() => setView('marketing')}
                        title="Back to Home"
                        className={cn(
                            "flex items-center gap-2 text-xs text-[#6c5f51] hover:text-[#ffedd7] transition-colors px-2 py-2 hover:bg-[#382416]/30 rounded-lg shrink-0",
                            isCollapsed && "justify-center"
                        )}
                    >
                        <ChevronLeft size={16} />
                        {!isCollapsed && <span>Back to Home</span>}
                    </button>
                    
                    {!isCollapsed && (
                        <button
                            onClick={toggleTheme}
                            className="p-2 text-[#6c5f51] hover:text-[#ffedd7] hover:bg-[#382416]/30 rounded-lg transition-all"
                            title={`Switch theme`}
                        >
                            {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
                        </button>
                    )}
                </div>

                <div className="flex items-center gap-3 px-2">
                    <div className="w-8 h-8 rounded-full border border-[#ffedd7]/30 bg-[#382416] flex items-center justify-center text-[#ffedd7] font-bold text-xs shrink-0">
                        {initials}
                    </div>
                    {!isCollapsed && (
                        <div className="flex-1 overflow-hidden">
                            <p className="text-sm font-medium truncate text-[#ffedd7]">{displayName}</p>
                            <p className="text-[10px] text-[#6c5f51] truncate font-mono">{displayEmail}</p>
                        </div>
                    )}
                    <button
                        onClick={handleLogout}
                        title="Logout"
                        className="text-[#6c5f51] hover:text-[#dc5000] transition-colors shrink-0"
                    >
                        <LogOut size={16} />
                    </button>
                </div>
            </div>
        </div>
    );
};
