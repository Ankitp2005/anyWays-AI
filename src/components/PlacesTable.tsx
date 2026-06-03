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
        OPEN: "border border-white/10 text-[#ffffff] bg-[#1b1c1e]",
        CLOSED: "border border-[#ff6363]/40 text-[#ff6363] bg-[#452324]/20",
        TEMPORARILY_CLOSED: "border border-[#ff6363]/30 text-[#9c9c9d] bg-[#452324]/10",
        PERMANENTLY_CLOSED: "border border-white/5 text-[#6a6b6c] bg-transparent",
    };

    return (
        <span className={cn("px-2 py-0.5 rounded-[6px] text-[10px] font-mono font-medium uppercase tracking-[0.04em] shadow-subtle-2", styles[status] || styles.OPEN)}>
            {status.replace(/_/g, ' ')}
        </span>
    );
};

const ValidationBadge: React.FC<{ confidence: number }> = ({ confidence }) => {
    let state = 'PENDING';
    if (confidence >= 80)              state = 'CONFIRMED';
    else if (confidence >= 50)         state = 'ACTIVE';
    else if (confidence > 0)           state = 'FLAGGED';

    const styles: Record<string, string> = {
        CONFIRMED: 'text-[#ffffff]',
        ACTIVE:    'text-[#9c9c9d]',
        FLAGGED:   'text-[#ff6363]',
        PENDING:   'text-[#6a6b6c]',
    };

    const icons: Record<string, React.ReactNode> = {
        CONFIRMED: <CheckCircle2 size={12} className="text-[#59d499]" />,
        ACTIVE:    <CheckCircle2 size={12} className="text-[#9c9c9d]" />,
        PENDING:   <Clock size={12} className="text-[#6a6b6c]" />,
        FLAGGED:   <AlertTriangle size={12} className="text-[#ff6363]" />,
    };

    return (
        <div className="flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-[0.04em]">
            {icons[state]}
            <span className={cn("font-medium", styles[state])}>
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
        <div className="space-y-4 font-sans selection:bg-[#ff6363]/30 text-[#ffffff]">
            <div className="flex items-center justify-between">
                <h2 className="text-2xl font-semibold tracking-tight text-[#ffffff]">Ground Truth Data</h2>
                <div className="flex gap-4">
                    <input
                        type="text"
                        placeholder="Search places..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="bg-white/5 border border-white/5 rounded-[8px] py-1.5 px-3 text-xs text-[#ffffff] placeholder-[#9c9c9d]/40 focus:outline-none focus:border-white/10 transition-colors w-64 font-sans"
                    />
                    <button 
                        onClick={onAddPlace}
                        className="bg-[#e6e6e6] text-[#2f3031] hover:opacity-90 px-4 py-1.5 rounded-[8px] text-xs font-bold transition-all font-sans shadow-subtle"
                    >
                        Add Place
                    </button>
                </div>
            </div>

            <div className="bg-[#07080a] border border-[#363739] rounded-[11px] overflow-hidden min-h-[400px] flex flex-col shadow-subtle-4">
                <table className="w-full text-sm text-left">
                    <thead className="bg-transparent border-b border-[#1b1c1e] text-[10px] uppercase text-[#6a6b6c] font-mono font-bold tracking-[0.04em]">
                        <tr>
                            <th className="px-6 py-3">Place Name</th>
                            <th className="px-6 py-3">Status</th>
                            <th className="px-6 py-3">Validation</th>
                            <th className="px-6 py-3">Confidence</th>
                            <th className="px-6 py-3">Last Verified</th>
                            <th className="px-4 py-3 w-10"></th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-[#1b1c1e] font-sans">
                        {filteredPlaces.map((place) => (
                            <tr
                                key={place.id}
                                onClick={() => onSelectPlace(place)}
                                className="hover:bg-white/5 border-b border-[#1b1c1e]/60 transition-colors group cursor-pointer"
                            >
                                <td className="px-6 py-4">
                                    <div className="font-semibold text-[#ffffff]">{place.name}</div>
                                    <div className="text-xs text-[#6a6b6c] truncate max-w-[200px] mt-0.5 font-sans">
                                        {place.address || 'No address provided'}
                                    </div>
                                </td>
                                 <td className="px-6 py-4">
                                    <div className="flex flex-col gap-1">
                                         {place.derived_status && (
                                             <div className={cn(
                                                 "px-2 py-0.5 rounded-[6px] text-[10px] font-mono font-medium uppercase tracking-[0.04em] border w-fit shadow-subtle-2",
                                                 place.derived_status === 'LIKELY_OPEN' ? "bg-[#1b1c1e] text-[#ffffff] border-white/10" :
                                                 place.derived_status === 'UNCERTAIN' ? "bg-[#452324]/10 text-[#ff6363]/80 border-[#ff6363]/20" :
                                                 "bg-[#452324]/20 text-[#ff6363] border-[#ff6363]/40"
                                             )}>
                                                 {place.derived_status.replace(/_/g, ' ')}
                                             </div>
                                         )}
                                        <div className="opacity-40 scale-75 origin-left">
                                             <StatusBadge status={place.status} />
                                        </div>
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    <ValidationBadge confidence={place.confidence_score ?? 0} />
                                </td>
                                <td className="px-6 py-4">
                                    <div className="flex items-center gap-2">
                                        <div className="h-1 w-16 bg-[#1b1c1e] rounded-full overflow-hidden">
                                            <div
                                                className={cn("h-full rounded-full transition-all", (place.confidence_score ?? 0) < 50 ? "bg-[#ff6363]" : "bg-white")}
                                                style={{ width: `${Math.min(Math.max(place.confidence_score ?? 0, 5), 100)}%` }}
                                            />
                                        </div>
                                        <span className="text-xs font-mono text-[#ffffff]">{place.confidence_score ?? 0}%</span>
                                    </div>
                                </td>
                                <td className="px-6 py-4 text-[#6a6b6c] text-xs font-mono">
                                    {place.last_validated_at 
                                        ? formatDistanceToNow(new Date(place.last_validated_at), { addSuffix: true }) 
                                        : 'Never'}
                                </td>
                                <td className="px-4 py-4 text-right">
                                    <button className="p-1 hover:bg-white/5 rounded-[6px] text-[#6a6b6c] hover:text-white">
                                        <MoreHorizontal size={16} />
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>

                {loading && (
                    <div className="flex-1 flex items-center justify-center p-8">
                        <div className="flex flex-col items-center text-[#6a6b6c] font-mono text-xs">
                            <span className="w-8 h-8 border-2 border-[#e6e6e6] border-t-transparent rounded-full animate-spin mb-4" />
                            <p>Loading ground truth data...</p>
                        </div>
                    </div>
                )}

                {!loading && filteredPlaces.length === 0 && (
                    <div className="flex-1 flex items-center justify-center p-12">
                         <div className="text-center font-sans">
                            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full border border-[#1b1c1e] mb-4 text-[#ffffff] bg-[#07080a] shadow-subtle-2">
                                <MapPin size={24} className="stroke-[1.5]" />
                            </div>
                            <h3 className="text-sm font-semibold text-white mb-1">No places found</h3>
                            <p className="text-xs text-[#6a6b6c] mb-4 font-mono">
                                {searchQuery ? `No results match "${searchQuery}"` : "You haven't added any places to track yet."}
                            </p>
                            {!searchQuery && (
                                <button onClick={onAddPlace} className="text-white font-semibold hover:text-[#ff6363] text-xs underline decoration-[#ff6363] transition-colors">
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
