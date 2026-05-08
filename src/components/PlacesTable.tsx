import React from 'react';
import type { Place } from '../services/api.types';
import { cn } from '../utils/cn';
import { MoreHorizontal, CheckCircle2, AlertTriangle, Clock, MapPin } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface PlacesTableProps {
    places: Place[];
    onSelectPlace: (place: Place) => void;
    onAddPlace?: () => void;
    loading?: boolean;
}

const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
    const styles: Record<string, string> = {
        OPEN: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border-green-200 dark:border-green-800",
        CLOSED: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border-red-200 dark:border-red-800",
        TEMPORARILY_CLOSED: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400 border-orange-200 dark:border-orange-800",
        PERMANENTLY_CLOSED: "bg-neutral-100 text-neutral-700 dark:bg-neutral-800/50 dark:text-neutral-400 border-neutral-200 dark:border-neutral-700",
    };

    return (
        <span className={cn("px-2 py-0.5 rounded-full text-xs font-medium border", styles[status] || styles.OPEN)}>
            {status.replace(/_/g, ' ')}
        </span>
    );
};

const ValidationBadge: React.FC<{ confidence: number }> = ({ confidence }) => {
    let state = 'PENDING';
    if (confidence >= 80)              state = 'CONFIRMED';
    else if (confidence >= 50)         state = 'ACTIVE';
    else if (confidence > 0)           state = 'FLAGGED';
    // confidence === 0                → PENDING (no signals yet)

    const styles: Record<string, string> = {
        CONFIRMED: 'text-blue-700 dark:text-blue-400',
        ACTIVE:    'text-green-600 dark:text-green-400',
        FLAGGED:   'text-orange-500',
        PENDING:   'text-muted-foreground',
    };

    const icons: Record<string, React.ReactNode> = {
        CONFIRMED: <CheckCircle2 size={12} className="text-blue-600 dark:text-blue-400" />,
        ACTIVE:    <CheckCircle2 size={12} className="text-green-600 dark:text-green-400" />,
        PENDING:   <Clock size={12} className="text-gray-500" />,
        FLAGGED:   <AlertTriangle size={12} className="text-orange-500" />,
    };

    return (
        <div className="flex items-center gap-1.5">
            {icons[state]}
            <span className={cn("text-xs font-medium", styles[state])}>
                {state}
            </span>
        </div>
    );
};

export const PlacesTable: React.FC<PlacesTableProps> = ({ places, onSelectPlace, onAddPlace, loading }) => {
    const [searchQuery, setSearchQuery] = React.useState('');

    const filteredPlaces = places.filter(place => 
        place.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
        (place.address && place.address.toLowerCase().includes(searchQuery.toLowerCase()))
    );

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold tracking-tight">Ground Truth Data</h2>
                <div className="flex gap-2">
                    <input
                        type="text"
                        placeholder="Search places..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="bg-background border border-input rounded-md px-3 py-1.5 text-sm w-64 focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                    <button 
                        onClick={onAddPlace}
                        className="bg-primary text-primary-foreground px-3 py-1.5 rounded-md text-sm font-medium hover:bg-primary/90 transition-colors"
                    >
                        Add Place
                    </button>
                </div>
            </div>

            <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden min-h-[400px] flex flex-col">
                <table className="w-full text-sm text-left">
                    <thead className="bg-secondary/40 border-b border-border text-xs uppercase text-muted-foreground font-semibold">
                        <tr>
                            <th className="px-6 py-3">Place Name</th>
                            <th className="px-6 py-3">Status</th>
                            <th className="px-6 py-3">Validation</th>
                            <th className="px-6 py-3">Confidence</th>
                            <th className="px-6 py-3">Last Verified</th>
                            <th className="px-4 py-3 w-10"></th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-border/50">
                        {filteredPlaces.map((place) => (
                            <tr
                                key={place.id}
                                onClick={() => onSelectPlace(place)}
                                className="hover:bg-accent/30 transition-colors group cursor-pointer"
                            >
                                <td className="px-6 py-3">
                                    <div className="font-medium text-foreground">{place.name}</div>
                                    <div className="text-xs text-muted-foreground truncate max-w-[200px]">
                                        {place.address || 'No address provided'}
                                    </div>
                                </td>
                                 <td className="px-6 py-3">
                                    <div className="flex flex-col gap-1">
                                        {place.derived_status && (
                                            <div className={cn(
                                                "px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-tighter border w-fit shadow-sm",
                                                place.derived_status === 'LIKELY_OPEN' ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" :
                                                place.derived_status === 'UNCERTAIN' ? "bg-amber-500/10 text-amber-500 border-amber-500/20" :
                                                "bg-red-500/10 text-red-500 border-red-500/20"
                                            )}>
                                                {place.derived_status.replace(/_/g, ' ')}
                                            </div>
                                        )}
                                        <div className="opacity-40 scale-75 origin-left">
                                            <StatusBadge status={place.status} />
                                        </div>
                                    </div>
                                </td>
                                <td className="px-6 py-3">
                                    <ValidationBadge confidence={place.confidence_score ?? 0} />
                                </td>
                                <td className="px-6 py-3">
                                    <div className="flex items-center gap-2">
                                        <div className="h-1.5 w-16 bg-secondary rounded-full overflow-hidden">
                                            <div
                                                className={cn("h-full rounded-full transition-all", (place.confidence_score ?? 0) < 50 ? "bg-orange-500" : "bg-green-500")}
                                                style={{ width: `${Math.min(Math.max(place.confidence_score ?? 0, 5), 100)}%` }}
                                            />
                                        </div>
                                        <span className="text-xs font-mono">{place.confidence_score ?? 0}%</span>
                                    </div>
                                </td>
                                <td className="px-6 py-3 text-muted-foreground text-xs">
                                    {place.last_validated_at 
                                        ? formatDistanceToNow(new Date(place.last_validated_at), { addSuffix: true }) 
                                        : 'Never'}
                                </td>
                                <td className="px-4 py-3 text-right">
                                    <button className="p-1 hover:bg-secondary rounded text-muted-foreground hover:text-foreground">
                                        <MoreHorizontal size={16} />
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>

                {loading && (
                    <div className="flex-1 flex items-center justify-center p-8">
                        <div className="flex flex-col items-center text-muted-foreground">
                            <span className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4" />
                            <p>Loading ground truth data...</p>
                        </div>
                    </div>
                )}

                {!loading && filteredPlaces.length === 0 && (
                    <div className="flex-1 flex items-center justify-center p-12">
                         <div className="text-center">
                            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-secondary mb-4">
                                <MapPin size={24} className="text-muted-foreground" />
                            </div>
                            <h3 className="text-lg font-medium text-foreground mb-1">No places found</h3>
                            <p className="text-sm text-muted-foreground mb-4">
                                {searchQuery ? `No results match "${searchQuery}"` : "You haven't added any places to track yet."}
                            </p>
                            {!searchQuery && (
                                <button onClick={onAddPlace} className="text-primary font-medium hover:underline text-sm">
                                    Add your first place
                                </button>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
