import React, { useState, useEffect } from 'react';
import { Sidebar } from './Sidebar';
import { DashboardOverview } from './DashboardOverview';
import { PlacesTable } from './PlacesTable';
import { PlaceDetails } from './PlaceDetails';
import { ApiKeysManagement } from './ApiKeysManagement';
import ObservabilityPanel from './dashboard/ObservabilityPanel';
import { SettingsPanel } from './SettingsPanel';
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
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

            {/* Modal */}
            <div className="relative bg-card border border-border rounded-2xl shadow-2xl w-full max-w-md animate-in fade-in zoom-in-95 duration-200">
                <div className="flex items-center justify-between px-6 py-4 border-b border-border">
                    <div className="flex items-center gap-2">
                        <div className="bg-primary/10 text-primary p-1.5 rounded-lg">
                            <MapPin size={16} />
                        </div>
                        <h2 className="text-lg font-semibold">Add New Place</h2>
                    </div>
                    <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors p-1 rounded-md hover:bg-secondary">
                        <X size={18} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div>
                        <label className="block text-sm font-medium mb-1.5">Place Name <span className="text-destructive">*</span></label>
                        <input
                            type="text"
                            value={name}
                            onChange={e => setName(e.target.value)}
                            placeholder="e.g. Rayat Bahra University"
                            autoFocus
                            className="w-full bg-background border border-input rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-1.5">Address <span className="text-muted-foreground text-xs font-normal">(optional)</span></label>
                        <input
                            type="text"
                            value={address}
                            onChange={e => setAddress(e.target.value)}
                            placeholder="e.g. Rupnagar, Punjab, India"
                            className="w-full bg-background border border-input rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-1.5">Initial Status</label>
                        <select
                            value={status}
                            onChange={e => setStatus(e.target.value as any)}
                            className="w-full bg-background border border-input rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
                        >
                            <option value="OPEN">Open</option>
                            <option value="CLOSED">Closed</option>
                            <option value="TEMPORARILY_CLOSED">Temporarily Closed</option>
                            <option value="PERMANENTLY_CLOSED">Permanently Closed</option>
                        </select>
                    </div>

                    <div className="flex gap-3 pt-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 px-4 py-2 border border-border rounded-lg text-sm font-medium hover:bg-secondary transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={saving}
                            className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
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
    const [activeTab, setActiveTab] = useState<'overview' | 'places' | 'api' | 'observability' | 'settings' | 'pricing'>('overview');
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
        <div className="flex h-screen w-screen bg-background text-foreground overflow-hidden relative font-sans selection:bg-primary/30">
            {/* Cinematic Background Gradients */}
            <div className="absolute inset-0 bg-gradient-to-br from-background via-background/95 to-background/90 z-0 pointer-events-none" />
            <div className="absolute top-0 left-1/4 w-[800px] h-[600px] bg-emerald-500/5 rounded-full blur-[150px] pointer-events-none" />
            <div className="absolute bottom-0 right-1/4 w-[600px] h-[500px] bg-blue-500/5 rounded-full blur-[120px] pointer-events-none" />

            {/* Floating Toggle Button (Always visible) */}
            <button
                onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
                className={cn(
                    "fixed z-[100] top-4 transition-all duration-300 p-2 bg-background border border-border rounded-lg shadow-sm hover:bg-secondary text-muted-foreground hover:text-foreground",
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
                "flex-1 overflow-y-auto relative z-10 h-full scroll-smooth transition-all duration-500 bg-background border-l border-border shadow-sm backdrop-blur-3xl",
                isSidebarCollapsed ? "ml-0" : "ml-0"
            )}>
                <div className="max-w-7xl mx-auto px-8 py-10 lg:px-12 lg:py-12">

                    {activeTab === 'overview' && (
                        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <div className="mb-8">
                                <h1 className="text-3xl font-bold tracking-tight mb-2">Dashboard</h1>
                                <p className="text-muted-foreground">Welcome back, {displayName}. Here's what's happening today.</p>
                            </div>
                            <DashboardOverview places={places as any} />
                        </div>
                    )}

                    {activeTab === 'places' && (
                        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                            {!selectedPlaceId ? (
                                <>
                                    <div className="mb-8">
                                        <h1 className="text-3xl font-bold tracking-tight mb-2">Places Intelligence</h1>
                                        <p className="text-muted-foreground">Manage and validate your ground truth locations.</p>
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
