import React from 'react';
import type { Place, ValidationState, PlaceStatus } from '../models/types';
import { cn } from '../utils/cn';
import { MoreHorizontal, CheckCircle2, AlertTriangle, Clock } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface PlacesTableProps {
    places: Place[];
    onSelectPlace: (place: Place) => void;
}


const StatusBadge: React.FC<{ status: PlaceStatus }> = ({ status }) => {
    const styles = {
        OPEN: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border-green-200 dark:border-green-800",
        CLOSED: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border-red-200 dark:border-red-800",
        MOVED: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400 border-orange-200 dark:border-orange-800",
        RENNOVATING: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400 border-yellow-200 dark:border-yellow-800",
    };

    return (
        <span className={cn("px-2 py-0.5 rounded-full text-xs font-medium border", styles[status])}>
            {status}
        </span>
    );
};

const ValidationBadge: React.FC<{ state: ValidationState }> = ({ state }) => {
    const icons = {
        CONFIRMED: <CheckCircle2 size={12} className="text-blue-600 dark:text-blue-400" />,
        PENDING: <Clock size={12} className="text-gray-500" />,
        FLAGGED: <AlertTriangle size={12} className="text-orange-500" />
    };

    return (
        <div className="flex items-center gap-1.5">
            {icons[state]}
            <span className={cn(
                "text-xs font-medium",
                state === 'CONFIRMED' ? "text-blue-700 dark:text-blue-400" : "text-muted-foreground"
            )}>
                {state}
            </span>
        </div>
    );
};

export const PlacesTable: React.FC<PlacesTableProps> = ({ places, onSelectPlace }) => {
    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold tracking-tight">Ground Truth Data</h2>
                <div className="flex gap-2">
                    <input
                        type="text"
                        placeholder="Search places..."
                        className="bg-background border border-input rounded-md px-3 py-1.5 text-sm w-64 focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                    <button className="bg-primary text-primary-foreground px-3 py-1.5 rounded-md text-sm font-medium hover:bg-primary/90">
                        Add Place
                    </button>
                </div>
            </div>

            <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
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
                        {places.map((place) => (
                            <tr
                                key={place.id}
                                onClick={() => onSelectPlace(place)}
                                className="hover:bg-accent/30 transition-colors group cursor-pointer"
                            >
                                <td className="px-6 py-3">
                                    <div className="font-medium text-foreground">{place.name}</div>
                                    <div className="text-xs text-muted-foreground truncate max-w-[200px]">{place.address}</div>
                                </td>
                                <td className="px-6 py-3">
                                    <StatusBadge status={place.status} />
                                </td>
                                <td className="px-6 py-3">
                                    <ValidationBadge state={place.validationState} />
                                </td>
                                <td className="px-6 py-3">
                                    <div className="flex items-center gap-2">
                                        <div className="h-1.5 w-16 bg-secondary rounded-full overflow-hidden">
                                            <div
                                                className={cn("h-full rounded-full bg-primary", place.confidenceScore < 0.8 ? "bg-orange-500" : "bg-green-500")}
                                                style={{ width: `${place.confidenceScore * 100}%` }}
                                            />
                                        </div>
                                        <span className="text-xs font-mono">{Math.round(place.confidenceScore * 100)}%</span>
                                    </div>
                                </td>
                                <td className="px-6 py-3 text-muted-foreground text-xs">
                                    {formatDistanceToNow(new Date(place.lastVerified), { addSuffix: true })}
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
            </div>
        </div>
    );
};
