import React from 'react';
import { Search, X } from 'lucide-react';
import { useApp } from '../context/AppContext';

export const SearchBar: React.FC = () => {
    const { filters, setSearchQuery } = useApp();

    return (
        <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <input
                type="text"
                placeholder="Search notes..."
                className="w-full pl-9 pr-8 py-2 bg-secondary/50 border-none rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-ring placeholder:text-muted-foreground"
                value={filters.searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
            />
            {filters.searchQuery && (
                <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                    <X size={14} />
                </button>
            )}
        </div>
    );
};
