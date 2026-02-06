import React, { useState, useEffect } from 'react';
import { Sidebar } from './Sidebar';
import { DashboardOverview } from './DashboardOverview';
import { PlacesTable } from './PlacesTable';
import { PlaceDetails } from './PlaceDetails';
import { StorageService } from '../services/storage';
import type { Place } from '../models/types';
import { Key, Settings } from 'lucide-react';

export const DashboardLayout: React.FC = () => {
    const [activeTab, setActiveTab] = useState<'overview' | 'places' | 'api' | 'settings'>('overview');
    const [places, setPlaces] = useState<Place[]>([]);
    const [selectedPlace, setSelectedPlace] = useState<Place | null>(null);

    // In a real app, we might fetch this from context or API
    useEffect(() => {
        setPlaces(StorageService.getPlaces());
    }, []);

    // Clear selection when tab changes
    useEffect(() => {
        setSelectedPlace(null);
    }, [activeTab]);

    return (
        <div className="flex h-screen w-screen bg-background text-foreground overflow-hidden">
            <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />

            <main className="flex-1 overflow-y-auto bg-background/50 h-full scroll-smooth">
                <div className="max-w-7xl mx-auto px-8 py-8">
                    {activeTab === 'overview' && (
                        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <div className="mb-8">
                                <h1 className="text-3xl font-bold tracking-tight mb-2">Dashboard</h1>
                                <p className="text-muted-foreground">Welcome back, John. Here's what's happening today.</p>
                            </div>
                            <DashboardOverview places={places} />
                        </div>
                    )}

                    {activeTab === 'places' && (
                        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                            {!selectedPlace ? (
                                <>
                                    <div className="mb-8">
                                        <h1 className="text-3xl font-bold tracking-tight mb-2">Places Intelligence</h1>
                                        <p className="text-muted-foreground">Manage and validate your ground truth locations.</p>
                                    </div>
                                    <PlacesTable places={places} onSelectPlace={setSelectedPlace} />
                                </>
                            ) : (
                                <PlaceDetails place={selectedPlace} onBack={() => setSelectedPlace(null)} />
                            )}
                        </div>
                    )}

                    {activeTab === 'api' && (
                        <div className="flex flex-col items-center justify-center h-[60vh] text-center animate-in fade-in zoom-in-95 duration-300">
                            <div className="bg-secondary/50 p-6 rounded-full mb-6">
                                <Key size={48} className="text-muted-foreground" />
                            </div>
                            <h2 className="text-2xl font-bold mb-2">API Keys Management</h2>
                            <p className="text-muted-foreground max-w-md mb-6">
                                Create and manage API keys to access the Place Intelligence SDK.
                            </p>
                            <button className="bg-primary text-primary-foreground px-6 py-2.5 rounded-md font-medium">
                                Generate New Key
                            </button>
                        </div>
                    )}

                    {activeTab === 'settings' && (
                        <div className="flex flex-col items-center justify-center h-[60vh] text-center animate-in fade-in zoom-in-95 duration-300">
                            <div className="bg-secondary/50 p-6 rounded-full mb-6">
                                <Settings size={48} className="text-muted-foreground" />
                            </div>
                            <h2 className="text-2xl font-bold mb-2">Platform Settings</h2>
                            <p className="text-muted-foreground max-w-md">
                                Configure organization details and billing.
                            </p>
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
};
