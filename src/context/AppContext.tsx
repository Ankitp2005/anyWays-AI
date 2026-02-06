import React, { createContext, useContext, useEffect, useState, useMemo } from 'react';
import type { Note, Notebook, Tag, AppPreferences, FilterState } from '../models/types';
import { StorageService } from '../services/storage';
import { v4 as uuidv4 } from 'uuid';



type AppView = 'marketing' | 'dashboard';

interface AppContextType {
    // View State
    currentView: AppView;
    setView: (view: AppView) => void;

    notes: Note[];
    tags: Tag[];
    notebooks: Notebook[];
    currentNoteId: string | null;
    filters: FilterState;
    preferences: AppPreferences;

    // Actions
    addNote: (notebookId?: string) => string; // returns new note id
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
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    // --- State Initialization ---
    const [currentView, setView] = useState<AppView>('marketing');

    const [notes, setNotes] = useState<Note[]>(() => StorageService.getNotes());
    const [tags, setTags] = useState<Tag[]>(() => StorageService.getTags());
    const [notebooks, setNotebooks] = useState<Notebook[]>(() => StorageService.getNotebooks());
    const [preferences, setPreferences] = useState<AppPreferences>(() => StorageService.getPreferences());

    const [currentNoteId, setCurrentNoteId] = useState<string | null>(null);

    const [filters, setFilters] = useState<FilterState>({
        searchQuery: '',
        selectedTags: [],
        notebookId: null,
        favoritesOnly: false
    });

    // --- Persistence Effects ---
    useEffect(() => { StorageService.saveNotes(notes); }, [notes]);
    useEffect(() => { StorageService.saveTags(tags); }, [tags]);
    useEffect(() => { StorageService.saveNotebooks(notebooks); }, [notebooks]);
    useEffect(() => {
        StorageService.savePreferences(preferences);
        // Apply theme
        const root = window.document.documentElement;
        if (preferences.theme === 'dark' || (preferences.theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
            root.classList.add('dark');
        } else {
            root.classList.remove('dark');
        }
    }, [preferences]);

    // --- Actions ---

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
    };

    const addTag = (name: string, color: string = '#64748b') => {
        if (tags.some(t => t.name.toLowerCase() === name.toLowerCase())) return;
        const newTag: Tag = { id: uuidv4(), name, color };
        setTags(prev => [...prev, newTag]);
    };

    const deleteTag = (id: string) => {
        setTags(prev => prev.filter(t => t.id !== id));
        // Also remove from notes
        setNotes(prev => prev.map(note => ({
            ...note,
            tags: note.tags.filter(tId => tId !== id)
        })));
    };

    const addNotebook = (name: string) => {
        if (notebooks.some(nb => nb.name.toLowerCase() === name.toLowerCase())) return;
        const newNotebook: Notebook = { id: uuidv4(), name, createdAt: new Date().toISOString() };
        setNotebooks(prev => [...prev, newNotebook]);
    };

    const deleteNotebook = (id: string) => {
        setNotebooks(prev => prev.filter(nb => nb.id !== id));
        // Remove notebook association from notes
        setNotes(prev => prev.map(note =>
            note.notebookId === id ? { ...note, notebookId: undefined } : note
        ));
        if (filters.notebookId === id) setFilters(prev => ({ ...prev, notebookId: null }));
    };

    const setSearchQuery = (query: string) => {
        setFilters(prev => ({ ...prev, searchQuery: query }));
    };

    const toggleTagFilter = (tagId: string) => {
        setFilters(prev => {
            const isSelected = prev.selectedTags.includes(tagId);
            return {
                ...prev,
                selectedTags: isSelected
                    ? prev.selectedTags.filter(id => id !== tagId)
                    : [...prev.selectedTags, tagId]
            };
        });
    };

    const setNotebookFilter = (notebookId: string | null) => {
        setFilters(prev => ({ ...prev, notebookId }));
    };

    const toggleTheme = () => {
        setPreferences(prev => ({
            ...prev,
            theme: prev.theme === 'light' ? 'dark' : 'light'
        }));
    };

    const toggleSidebar = () => {
        setPreferences(prev => ({ ...prev, sidebarOpen: !prev.sidebarOpen }));
    };

    const value = useMemo(() => ({
        currentView, setView,
        notes, tags, notebooks, currentNoteId, filters, preferences,
        addNote, updateNote, deleteNote, setCurrentNoteId,
        addTag, deleteTag,
        addNotebook, deleteNotebook,
        setSearchQuery, toggleTagFilter, setNotebookFilter,
        toggleTheme, toggleSidebar
    }), [currentView, notes, tags, notebooks, currentNoteId, filters, preferences]);

    return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

export const useApp = () => {
    const context = useContext(AppContext);
    if (!context) throw new Error('useApp must be used within AppProvider');
    return context;
};
