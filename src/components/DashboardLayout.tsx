import React, { useState, useEffect } from 'react';
import { Sidebar } from './Sidebar';
import { DashboardOverview } from './DashboardOverview';
import { PlacesTable } from './PlacesTable';
import { PlaceDetails } from './PlaceDetails';
import { ApiKeysManagement } from './ApiKeysManagement';
import ObservabilityPanel from './dashboard/ObservabilityPanel';
import { SettingsPanel } from './SettingsPanel';
import { DocumentationPanel } from './DocumentationPanel';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { X, MapPin, Loader2, ChevronLeft, ChevronRight } from 'lucide-react';
import toast from 'react-hot-toast';
import { cn } from '../utils/cn';

// ─── Add Place Modal ──────────────────────────────────────────────────────────
const AddPlaceModal: React.FC<{ onClose: () => void; onSave: (data: any) => Promise<void> }> = ({ onClose, onSave }) => {
    const [name, setName] = useState('');
    const [address, setAddress] = useState('');
    const [status, setStatus] = useState<'OPEN' | 'CLOSED' | 'TEMPORARILY_CLOSED' | 'PERMANENTLY_CLOSED'>('OPEN');
    const [saving, setSaving] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim()) { toast.error('Place name is required'); return; }
        setSaving(true);
        try {
            await onSave({ name: name.trim(), address: address.trim() || undefined, status });
            onClose();
        } finally {
            setSaving(false);
        }
    };

    // Close on Escape
    useEffect(() => {
        const handler = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [onClose]);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />

            {/* Modal */}
            <div className="relative bg-[#07080a] border border-[#363739] rounded-[16px] w-full max-w-md animate-in fade-in duration-200 shadow-xl">
                <div className="flex items-center justify-between px-6 py-4 border-b border-[#1b1c1e]">
                    <div className="flex items-center gap-2">
                        <div className="border border-white/5 text-[#ff6363] p-1.5 rounded-[8px] bg-[#1b1c1e] shadow-subtle-2">
                            <MapPin size={16} />
                        </div>
                        <h2 className="text-base font-semibold text-[#ffffff]">Add New Place</h2>
                    </div>
                    <button onClick={onClose} className="text-[#6a6b6c] hover:text-[#ffffff] transition-colors p-1.5 hover:bg-white/5 rounded-[8px]">
                        <X size={18} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-6">
                    <div>
                        <label className="block text-[11px] font-bold uppercase tracking-[0.04em] text-[#6a6b6c] mb-1.5 font-mono">Place Name <span className="text-[#ff6363]">*</span></label>
                        <input
                            type="text"
                            value={name}
                            onChange={e => setName(e.target.value)}
                            placeholder="e.g. Rayat Bahra University"
                            autoFocus
                            className="w-full bg-white/5 text-[#ffffff] placeholder-[#9c9c9d]/40 border border-white/5 rounded-[8px] py-2 px-3 focus:outline-none focus:border-white/10 transition-colors text-sm font-sans"
                        />
                    </div>

                    <div>
                        <label className="block text-[11px] font-bold uppercase tracking-[0.04em] text-[#6a6b6c] mb-1.5 font-mono">Address <span className="text-[#6a6b6c] text-[11px] font-normal font-mono">(optional)</span></label>
                        <input
                            type="text"
                            value={address}
                            onChange={e => setAddress(e.target.value)}
                            placeholder="e.g. Rupnagar, Punjab, India"
                            className="w-full bg-white/5 text-[#ffffff] placeholder-[#9c9c9d]/40 border border-white/5 rounded-[8px] py-2 px-3 focus:outline-none focus:border-white/10 transition-colors text-sm font-sans"
                        />
                    </div>

                    <div>
                        <label className="block text-[11px] font-bold uppercase tracking-[0.04em] text-[#6a6b6c] mb-1.5 font-mono">Initial Status</label>
                        <select
                            value={status}
                            onChange={e => setStatus(e.target.value as any)}
                            className="w-full bg-white/5 text-[#ffffff] border border-white/5 rounded-[8px] px-3 py-2 text-sm focus:outline-none focus:border-white/10 transition-colors"
                        >
                            <option value="OPEN" className="bg-[#07080a] text-white">Open</option>
                            <option value="CLOSED" className="bg-[#07080a] text-white">Closed</option>
                            <option value="TEMPORARILY_CLOSED" className="bg-[#07080a] text-white">Temporarily Closed</option>
                            <option value="PERMANENTLY_CLOSED" className="bg-[#07080a] text-white">Permanently Closed</option>
                        </select>
                    </div>

                    <div className="flex gap-3 pt-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 px-4 py-2 border border-[#454647] rounded-[8px] text-xs font-bold hover:border-white/40 transition-colors bg-transparent text-[#9c9c9d] hover:text-white"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={saving}
                            className="flex-1 px-4 py-2 bg-[#e6e6e6] text-[#2f3031] rounded-[8px] text-xs font-bold hover:opacity-90 transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-subtle"
                        >
                            {saving ? <><Loader2 size={14} className="animate-spin" /> Saving...</> : 'Add Place'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

// ─── Dashboard Layout ─────────────────────────────────────────────────────────
export const DashboardLayout: React.FC = () => {
    const { places, addPlace, loadPlaces, placesLoading } = useApp();
    const { user } = useAuth();
    const displayName = user?.user_metadata?.name || user?.email?.split('@')[0] || 'there';
    const [activeTab, setActiveTab] = useState<'overview' | 'places' | 'api' | 'observability' | 'settings' | 'pricing' | 'documentation'>('overview');
    const [selectedPlaceId, setSelectedPlaceId] = useState<string | null>(null);
    const [showAddModal, setShowAddModal] = useState(false);
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

    const handleAddPlace = async (data: any) => {
        await addPlace(data);
        await loadPlaces(); // Refresh list from DB after adding
    };

    // Clear selection when tab changes
    useEffect(() => {
        setSelectedPlaceId(null);
    }, [activeTab]);

    return (
        <div className="flex h-screen w-screen bg-[#040506] text-[#ffffff] overflow-hidden relative font-sans selection:bg-[#ff6363]/30">
            {/* Flat canvas, no background gradients/blurs */}

            {/* Floating Toggle Button (Always visible) */}
            <button
                onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
                className={cn(
                    "fixed z-[100] top-4 transition-all duration-300 p-2 bg-[#07080a] border border-[#1b1c1e] rounded-[8px] hover:bg-white/5 hover:text-[#ffffff] text-[#9c9c9d] cursor-pointer shadow-subtle-2",
                    isSidebarCollapsed ? "left-4" : "left-[240px]"
                )}
                title={isSidebarCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
            >
                <div className="flex items-center gap-2">
                    {isSidebarCollapsed ? (
                        <>
                            <ChevronRight size={18} />
                            <span className="text-xs font-bold pr-1">anyWays</span>
                        </>
                    ) : (
                        <ChevronLeft size={18} />
                    )}
                </div>
            </button>

            <Sidebar 
                activeTab={activeTab} 
                setActiveTab={setActiveTab} 
                isCollapsed={isSidebarCollapsed}
            />

            <main className={cn(
                "flex-1 overflow-y-auto relative z-10 h-full scroll-smooth transition-all duration-300 bg-[#040506] border-l border-[#1b1c1e]"
            )}>
                <div className={cn(
                    "max-w-7xl mx-auto px-8 py-10 lg:px-12 lg:py-12 transition-all duration-300",
                    isSidebarCollapsed ? "pl-16 lg:pl-20" : ""
                )}>

                    {activeTab === 'overview' && (
                        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <div className="mb-8">
                                <h1 className="text-3xl font-semibold tracking-tight mb-2 text-[#ffffff]">Dashboard</h1>
                                <p className="text-[#9c9c9d] text-sm">Welcome back, {displayName}. Here's what's happening today.</p>
                            </div>
                            <DashboardOverview places={places as any} />
                        </div>
                    )}

                    {activeTab === 'places' && (
                        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                            {!selectedPlaceId ? (
                                <>
                                    <div className="mb-8">
                                        <h1 className="text-3xl font-semibold tracking-tight mb-2 text-[#ffffff]">Places Intelligence</h1>
                                        <p className="text-[#9c9c9d] text-sm">Manage and validate your ground truth locations.</p>
                                    </div>
                                    <PlacesTable
                                        places={places}
                                        loading={placesLoading}
                                        onSelectPlace={(place) => setSelectedPlaceId(place.id)}
                                        onAddPlace={() => setShowAddModal(true)}
                                    />
                                </>
                            ) : (
                                <PlaceDetails
                                    placeId={selectedPlaceId}
                                    onBack={() => {
                                        setSelectedPlaceId(null);
                                        loadPlaces(); // Refresh list after returning from details
                                    }}
                                />
                            )}
                        </div>
                    )}

                    {activeTab === 'api' && (
                        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <ApiKeysManagement />
                        </div>
                    )}

                    {activeTab === 'observability' && (
                        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <ObservabilityPanel />
                        </div>
                    )}

                    {activeTab === 'settings' && (
                        <SettingsPanel />
                    )}

                    {activeTab === 'documentation' && (
                        <DocumentationPanel />
                    )}
                </div>
            </main>

            {/* Add Place Modal */}
            {showAddModal && (
                <AddPlaceModal
                    onClose={() => setShowAddModal(false)}
                    onSave={handleAddPlace}
                />
            )}
        </div>
    );
};
