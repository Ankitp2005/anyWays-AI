import React from 'react';
import { FileText } from 'lucide-react';

export const EmptyState: React.FC = () => {
    return (
        <div className="h-full flex flex-col items-center justify-center text-muted-foreground p-8 text-center opacity-0 animate-in fade-in duration-500 opacity-100">
            <FileText size={64} className="mb-4 opacity-20" />
            <h2 className="text-xl font-semibold mb-2">Select a note to view</h2>
            <p className="text-sm">Choose a note from the list or create a new one to get started.</p>
        </div>
    );
};
