import React, { useEffect, useState } from 'react';
import { useApp } from '../context/AppContext';
import { ArrowLeft, Trash2, Tag as TagIcon } from 'lucide-react';
import { format } from 'date-fns';

export const NoteEditor: React.FC = () => {
    const {
        currentNoteId, notes, updateNote, deleteNote, setCurrentNoteId,
        tags
    } = useApp();

    // Find the note object directly from context state
    const note = notes.find(n => n.id === currentNoteId);

    // Local state for debounced updates
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [isDirty, setIsDirty] = useState(false);

    // Sync local state when note selection changes
    useEffect(() => {
        if (note) {
            setTitle(note.title);
            setContent(note.content);
            setIsDirty(false);
        }
    }, [note?.id]); // Only re-sync on ID change to avoid cursor jumping if we synced on every note update from context

    // Autosave effect (Debounce)
    useEffect(() => {
        if (!note || !isDirty) return;

        const timer = setTimeout(() => {
            updateNote(note.id, { title, content });
            setIsDirty(false);
        }, 500); // 500ms debounce

        return () => clearTimeout(timer);
    }, [title, content, isDirty, note?.id]);

    const handleDelete = () => {
        if (note && window.confirm('Are you sure you want to delete this note?')) {
            deleteNote(note.id);
        }
    };

    const handleTagClick = (tagId: string) => {
        if (!note) return;
        const newTags = note.tags.includes(tagId)
            ? note.tags.filter(id => id !== tagId)
            : [...note.tags, tagId];
        updateNote(note.id, { tags: newTags });
    };

    if (!note) return <div className="p-10">Note not found</div>;

    return (
        <div className="flex flex-col h-full bg-background relative">
            {/* Toolbar */}
            <div className="h-14 border-b border-border flex items-center justify-between px-4 bg-background z-10">
                <div className="flex items-center gap-2 md:hidden">
                    <button onClick={() => setCurrentNoteId(null)} className="p-2 hover:bg-accent rounded-full">
                        <ArrowLeft size={18} />
                    </button>
                </div>

                <div className="flex items-center gap-4 text-xs text-muted-foreground ml-auto">
                    <select
                        className="bg-transparent border border-border rounded px-2 py-1 focus:outline-none focus:border-ring max-w-[120px] md:max-w-xs truncate"
                        value={note.notebookId || ""}
                        onChange={(e) => updateNote(note.id, { notebookId: e.target.value || undefined })}
                    >
                        <option value="">No Notebook</option>
                        {useApp().notebooks.map(nb => (
                            <option key={nb.id} value={nb.id}>{nb.name}</option>
                        ))}
                    </select>
                    <div className="flex items-center gap-1">
                        <span className={isDirty ? "text-yellow-500" : "text-green-500"}>
                            {isDirty ? 'Saving...' : 'Saved'}
                        </span>
                    </div>
                    <span>{format(new Date(note.updatedAt), 'MMM d, h:mm a')}</span>
                    <button
                        onClick={handleDelete}
                        className="p-2 hover:bg-red-100 hover:text-red-600 rounded-md transition-colors"
                        title="Delete note"
                    >
                        <Trash2 size={16} />
                    </button>
                </div>
            </div>

            {/* Editor Area */}
            <div className="flex-1 overflow-y-auto">
                <div className="max-w-3xl mx-auto px-6 py-8">
                    <input
                        type="text"
                        placeholder="Note Title"
                        className="w-full text-3xl font-bold bg-transparent border-none placeholder:text-muted-foreground/50 focus:outline-none focus:ring-0 mb-4"
                        value={title}
                        onChange={(e) => { setTitle(e.target.value); setIsDirty(true); }}
                    />

                    {/* Tags Input Area */}
                    <div className="flex flex-wrap gap-2 mb-6">
                        {tags.map(tag => (
                            <button
                                key={tag.id}
                                onClick={() => handleTagClick(tag.id)}
                                className={`
                                     text-xs px-2 py-1 rounded-full border transition-all flex items-center gap-1
                                     ${note.tags.includes(tag.id)
                                        ? 'bg-primary text-primary-foreground border-primary'
                                        : 'bg-background text-muted-foreground border-border hover:border-primary'}
                                 `}
                            >
                                <TagIcon size={10} />
                                {tag.name}
                            </button>
                        ))}
                        {tags.length === 0 && <span className="text-xs text-muted-foreground opacity-50">Create tags in the sidebar to add them here.</span>}
                    </div>

                    <textarea
                        placeholder="Start writing..."
                        className="w-full h-[calc(100vh-250px)] resize-none bg-transparent border-none text-lg leading-relaxed focus:outline-none focus:ring-0 placeholder:text-muted-foreground/40"
                        value={content}
                        onChange={(e) => { setContent(e.target.value); setIsDirty(true); }}
                    />
                </div>
            </div>
        </div>
    );
};
