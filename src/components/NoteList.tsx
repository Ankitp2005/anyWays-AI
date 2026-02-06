import React, { useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { Plus, Clock } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '../utils/cn';
import { SearchBar } from './SearchBar';

export const NoteList: React.FC = () => {
    const {
        notes, tags, filters, currentNoteId,
        addNote, setCurrentNoteId
    } = useApp();

    const filteredNotes = useMemo(() => {
        return notes.filter(note => {
            const matchesSearch = !filters.searchQuery ||
                note.title.toLowerCase().includes(filters.searchQuery.toLowerCase()) ||
                note.content.toLowerCase().includes(filters.searchQuery.toLowerCase());

            const matchesTags = filters.selectedTags.length === 0 ||
                filters.selectedTags.every(tagId => note.tags.includes(tagId));

            const matchesNotebook = filters.notebookId === null ||
                note.notebookId === filters.notebookId;

            return matchesSearch && matchesTags && matchesNotebook;
        }).sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
    }, [notes, filters]);

    const handleCreateNote = () => {
        addNote(filters.notebookId || undefined);
    };

    const getTagName = (id: string) => tags.find(t => t.id === id)?.name;

    return (
        <div className="flex flex-col h-full bg-background">
            <div className="p-4 border-b border-border space-y-3">
                <SearchBar />
                <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-muted-foreground">{filteredNotes.length} notes</span>
                    <button
                        onClick={handleCreateNote}
                        className="p-1.5 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
                        aria-label="Create new note"
                    >
                        <Plus size={16} />
                    </button>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto">
                {filteredNotes.length === 0 ? (
                    <div className="p-8 text-center text-muted-foreground text-sm">
                        No notes found.
                        <br />
                        <button onClick={handleCreateNote} className="text-primary hover:underline mt-2">Create one?</button>
                    </div>
                ) : (
                    <div className="divide-y divide-border">
                        {filteredNotes.map(note => (
                            <button
                                key={note.id}
                                onClick={() => setCurrentNoteId(note.id)}
                                className={cn(
                                    "w-full text-left p-4 hover:bg-accent/30 transition-all focus:outline-none group relative border-l-2",
                                    currentNoteId === note.id
                                        ? "bg-accent/40 border-primary"
                                        : "border-transparent hover:border-border"
                                )}
                            >
                                <h3 className={cn(
                                    "font-medium mb-1.5 truncate text-sm transition-colors",
                                    !note.title && "text-muted-foreground italic",
                                    currentNoteId === note.id ? "text-foreground" : "text-foreground/90 group-hover:text-foreground"
                                )}>
                                    {note.title || 'Untitled'}
                                </h3>
                                <p className="text-xs text-muted-foreground line-clamp-2 mb-3 h-8 leading-relaxed opacity-80 group-hover:opacity-100">
                                    {note.content || 'No content...'}
                                </p>
                                <div className="flex items-center justify-between mt-auto">
                                    <div className="flex items-center gap-1.5 overflow-hidden">
                                        {note.tags.slice(0, 3).map(tagId => (
                                            <span
                                                key={tagId}
                                                className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] bg-secondary/50 text-secondary-foreground border border-border/50 whitespace-nowrap"
                                            >
                                                {getTagName(tagId)}
                                            </span>
                                        ))}
                                        {note.tags.length > 3 && (
                                            <span className="text-[10px] text-muted-foreground">+{note.tags.length - 3}</span>
                                        )}
                                    </div>
                                    <span className="text-[10px] text-muted-foreground/60 whitespace-nowrap flex-shrink-0 flex items-center gap-1">
                                        <Clock size={10} />
                                        {formatDistanceToNow(new Date(note.updatedAt), { addSuffix: true })}
                                    </span>
                                </div>
                            </button>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};
