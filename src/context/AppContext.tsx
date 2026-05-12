import React, { createContext, useContext, useEffect, useState, useMemo } from 'react';
import type { Note, Notebook, Tag, AppPreferences, FilterState } from '../models/types';
import { StorageService } from '../services/storage';
import { v4 as uuidv4 } from 'uuid';
import toast, { Toaster } from 'react-hot-toast';
import api from '../services/api';
import { User, Place, ApiKey, CreatePlaceDTO, UpdatePlaceDTO } from '../services/api.types';
import { supabase } from '../lib/supabaseClient';


type AppView = 'marketing' | 'dashboard' | 'login' | 'register' | 'pricing';

interface AppContextType {
    // View State
    currentView: AppView;
    setView: (view: AppView) => void;

    // Local State (Notes)
    notes: Note[];
    tags: Tag[];
    notebooks: Notebook[];
    currentNoteId: string | null;
    filters: FilterState;
    preferences: AppPreferences;

    // API State
    user: User | null;
    isAuthenticated: boolean;
    places: Place[];
    apiKeys: ApiKey[];
    loading: boolean;
    placesLoading: boolean;
    error: string | null;

    // Actions - Notes (Local)
    addNote: (notebookId?: string) => string;
    updateNote: (id: string, updates: Partial<Note>) => void;
    deleteNote: (id: string) => void;
    setCurrentNoteId: (id: string | null) => void;

    addTag: (name: string, color?: string) => void;
    deleteTag: (id: string) => void;

    addNotebook: (name: string) => void;
    deleteNotebook: (id: string) => void;

    setSearchQuery: (query: string) => void;
    toggleTagFilter: (tagId: string) => void;
    setNotebookFilter: (notebookId: string | null) => void;

    toggleTheme: () => void;
    toggleSidebar: () => void;

    // Actions - API
    login: (email: string, password: string) => Promise<void>;
    register: (email: string, password: string, name?: string) => Promise<void>;
    logout: () => Promise<void>;

    loadPlaces: () => Promise<void>;
    addPlace: (data: CreatePlaceDTO) => Promise<void>;
    updatePlace: (id: string, data: UpdatePlaceDTO) => Promise<void>;
    deletePlace: (id: string) => Promise<void>;

    loadApiKeys: () => Promise<void>;
    generateApiKey: (name: string) => Promise<string | undefined>; // Returns the key once
    revokeApiKey: (id: string) => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    // --- View State ---
    const [currentView, setCurrentView] = useState<AppView>(() => {
        if (typeof window !== 'undefined') {
            const params = new URLSearchParams(window.location.search);
            const view = params.get('view');
            if (['marketing', 'dashboard', 'login', 'register', 'pricing'].includes(view as string)) {
                return view as AppView;
            }
        }
        return 'marketing';
    });

    useEffect(() => {
        // Handle browser back/forward buttons
        const handlePopState = () => {
            const params = new URLSearchParams(window.location.search);
            const view = params.get('view') as AppView | null;
            if (view && ['marketing', 'dashboard', 'login', 'register', 'pricing'].includes(view)) {
                setCurrentView(view);
            } else {
                setCurrentView('marketing'); // Default fallback
            }
        };

        window.addEventListener('popstate', handlePopState);
        return () => window.removeEventListener('popstate', handlePopState);
    }, []);

    const setView = (view: AppView) => {
        const url = new URL(window.location.href);
        if (view === 'marketing') {
            url.searchParams.delete('view');
        } else {
            url.searchParams.set('view', view);
        }
        window.history.pushState({ view }, '', url.toString());
        setCurrentView(view);
    };
    // --- Local State (Notes) ---
    const [notes, setNotes] = useState<Note[]>(() => StorageService.getNotes());
    const [tags, setTags] = useState<Tag[]>(() => StorageService.getTags());
    const [notebooks, setNotebooks] = useState<Notebook[]>(() => StorageService.getNotebooks());
    const [preferences, setPreferences] = useState<AppPreferences>(() => StorageService.getPreferences());
    const [currentNoteId, setCurrentNoteId] = useState<string | null>(null);
    const [filters, setFilters] = useState<FilterState>({
        searchQuery: '', selectedTags: [], notebookId: null, favoritesOnly: false
    });

    // --- API State ---
    const [user, setUser] = useState<User | null>(null);
    const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
    const [places, setPlaces] = useState<Place[]>([]);
    const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
    const [loading, setLoading] = useState<boolean>(false);
    const [placesLoading, setPlacesLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);

    // --- Persistence Effects (Local) ---
    useEffect(() => { StorageService.saveNotes(notes); }, [notes]);
    useEffect(() => { StorageService.saveTags(tags); }, [tags]);
    useEffect(() => { StorageService.saveNotebooks(notebooks); }, [notebooks]);
    useEffect(() => {
        StorageService.savePreferences(preferences);
        const root = window.document.documentElement;
        if (preferences.theme === 'dark' || (preferences.theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
            root.classList.add('dark');
        } else {
            root.classList.remove('dark');
        }
    }, [preferences]);

    // --- API Effects ---
    useEffect(() => {
        const checkAuth = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (session) {
                setUser(session.user as any);
                setIsAuthenticated(true);
                setView('dashboard');
            } else {
                setIsAuthenticated(false);
                setUser(null);
            }
        };
        checkAuth();

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            if (session) {
                setUser(session.user as any);
                setIsAuthenticated(true);
            } else {
                setUser(null);
                setIsAuthenticated(false);
            }
        });

        return () => subscription.unsubscribe();
    }, []);

    // Load data when authenticated
    useEffect(() => {
        if (isAuthenticated) {
            loadPlaces();
            loadApiKeys();
        } else {
            setPlaces([]);
            setApiKeys([]);
        }
    }, [isAuthenticated]);

    // --- Actions (Local) ---
    const addNote = (notebookId?: string) => {
        const newNote: Note = {
            id: uuidv4(),
            title: '',
            content: '',
            tags: [],
            notebookId: notebookId || undefined,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        setNotes(prev => [newNote, ...prev]);
        setCurrentNoteId(newNote.id);
        return newNote.id;
    };

    const updateNote = (id: string, updates: Partial<Note>) => {
        setNotes(prev => prev.map(note =>
            note.id === id ? { ...note, ...updates, updatedAt: new Date().toISOString() } : note
        ));
    };

    const deleteNote = (id: string) => {
        setNotes(prev => prev.filter(n => n.id !== id));
        if (currentNoteId === id) setCurrentNoteId(null);
        toast.success('Note deleted');
    };

    const addTag = (name: string, color: string = '#64748b') => {
        if (tags.some(t => t.name.toLowerCase() === name.toLowerCase())) return;
        setTags(prev => [...prev, { id: uuidv4(), name, color }]);
    };

    const deleteTag = (id: string) => {
        setTags(prev => prev.filter(t => t.id !== id));
        setNotes(prev => prev.map(note => ({ ...note, tags: note.tags.filter(tId => tId !== id) })));
    };

    const addNotebook = (name: string) => {
        if (notebooks.some(nb => nb.name.toLowerCase() === name.toLowerCase())) return;
        setNotebooks(prev => [...prev, { id: uuidv4(), name, createdAt: new Date().toISOString() }]);
    };

    const deleteNotebook = (id: string) => {
        setNotebooks(prev => prev.filter(nb => nb.id !== id));
        setNotes(prev => prev.map(note => note.notebookId === id ? { ...note, notebookId: undefined } : note));
        if (filters.notebookId === id) setFilters(prev => ({ ...prev, notebookId: null }));
    };

    const setSearchQuery = (query: string) => setFilters(prev => ({ ...prev, searchQuery: query }));
    const toggleTagFilter = (tagId: string) => setFilters(prev => ({
        ...prev,
        selectedTags: prev.selectedTags.includes(tagId) ? prev.selectedTags.filter(id => id !== tagId) : [...prev.selectedTags, tagId]
    }));
    const setNotebookFilter = (notebookId: string | null) => setFilters(prev => ({ ...prev, notebookId }));
    const toggleTheme = () => setPreferences(prev => ({ ...prev, theme: prev.theme === 'light' ? 'dark' : 'light' }));
    const toggleSidebar = () => setPreferences(prev => ({ ...prev, sidebarOpen: !prev.sidebarOpen }));


    // --- Actions (API) ---

    // Auth
    const login = async (email: string, password: string) => {
        setLoading(true);
        try {
            const { data, error } = await supabase.auth.signInWithPassword({ email, password });
            if (error) throw error;
            setUser(data.user as any);
            setIsAuthenticated(true);
            setView('dashboard');
            toast.success('Welcome back!');
        } catch (err: any) {
            const msg = err.message || 'Login failed';
            setError(msg);
            toast.error(msg);
            throw err;
        } finally {
            setLoading(false);
        }
    };

    const register = async (email: string, password: string, name?: string) => {
        setLoading(true);
        try {
            const { data, error } = await supabase.auth.signUp({
                email, password, options: { data: { name } }
            });
            if (error) throw error;
            setUser(data.user as any);
            setIsAuthenticated(true);
            setView('dashboard');
            toast.success('Account created!');
        } catch (err: any) {
            const msg = err.message || 'Registration failed';
            setError(msg);
            toast.error(msg);
            throw err;
        } finally {
            setLoading(false);
        }
    };

    const logout = async () => {
        try {
            await supabase.auth.signOut();
        } catch (err) {
            console.error('Logout error', err);
        } finally {
            setUser(null);
            setIsAuthenticated(false);
            setView('marketing');
            setPlaces([]);
            setApiKeys([]);
            toast.success('Logged out');
        }
    };

    // Places
    const loadPlaces = async () => {
        setPlacesLoading(true);
        try {
            const data = await api.places.getPlaces();
            setPlaces(data);
        } catch (err: any) {
            toast.error('Failed to load places');
        } finally {
            setPlacesLoading(false);
        }
    };

    const addPlace = async (data: CreatePlaceDTO) => {
        try {
            const newPlace = await api.places.createPlace(data); // Returns Place
            // Fix: CreatePlaceDTO uses 'status?: Place.status' which is undefined in type definition, assuming string or enum match.
            // Adjust Place type mapping if needed.
            setPlaces(prev => [newPlace, ...prev]);
            toast.success('Place added');
        } catch (err) {
            toast.error('Failed to add place');
            throw err;
        }
    };

    const updatePlace = async (id: string, data: UpdatePlaceDTO) => {
        try {
            const updatedPlace = await api.places.updatePlace(id, data);
            setPlaces(prev => prev.map(p => p.id === id ? updatedPlace : p));
            toast.success('Place updated');
        } catch (err) {
            toast.error('Failed to update place');
            throw err;
        }
    };

    const deletePlace = async (id: string) => {
        const originalPlaces = [...places];
        setPlaces(prev => prev.filter(p => p.id !== id)); // Optimistic
        try {
            await api.places.deletePlace(id);
            toast.success('Place deleted');
        } catch (err) {
            setPlaces(originalPlaces); // Revert
            toast.error('Failed to delete place');
        }
    };

    // API Keys
    const loadApiKeys = async () => {
        try {
            const data = await api.apiKeys.getApiKeys();
            setApiKeys(data);
        } catch (err) {
            toast.error('Failed to load API keys');
        }
    };

    const generateApiKey = async (name: string) => {
        try {
            const { record, rawKey } = await api.apiKeys.generateApiKey(name);
            setApiKeys(prev => [record, ...prev]);
            toast.success('API Key generated');
            return rawKey;
        } catch (err) {
            toast.error('Failed to generate API Key');
            throw err;
        }
    };

    const revokeApiKey = async (id: string) => {
        try {
            await api.apiKeys.revokeApiKey(id);
            setApiKeys(prev => prev.filter(k => k.id !== id));
            toast.success('API Key revoked');
        } catch (err) {
            toast.error('Failed to revoke API Key');
        }
    };

    const value = useMemo(() => ({
        currentView, setView,
        notes, tags, notebooks, currentNoteId, filters, preferences,
        user, isAuthenticated, places, apiKeys, loading, placesLoading, error,
        addNote, updateNote, deleteNote, setCurrentNoteId,
        addTag, deleteTag,
        addNotebook, deleteNotebook,
        setSearchQuery, toggleTagFilter, setNotebookFilter,
        toggleTheme, toggleSidebar,
        login, register, logout,
        loadPlaces, addPlace, updatePlace, deletePlace,
        loadApiKeys, generateApiKey, revokeApiKey
    }), [currentView, notes, tags, notebooks, currentNoteId, filters, preferences, user, isAuthenticated, places, apiKeys, loading, placesLoading, error]);

    return (
        <AppContext.Provider value={value}>
            <Toaster position="bottom-right" />
            {children}
        </AppContext.Provider>
    );
};

export const useApp = () => {
    const context = useContext(AppContext);
    if (!context) throw new Error('useApp must be used within AppProvider');
    return context;
};
