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
        OPEN: "border border-[#ffedd7]/30 text-[#ffedd7] bg-transparent",
        CLOSED: "border border-[#dc5000]/40 text-[#dc5000] bg-transparent",
        TEMPORARILY_CLOSED: "border border-[#dc5000]/25 text-[#ffedd7] bg-transparent",
        PERMANENTLY_CLOSED: "border border-[#40372e] text-[#6c5f51] bg-transparent",
    };

    return (
        <span className={cn("px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider", styles[status] || styles.OPEN)}>
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
        CONFIRMED: 'text-[#ffedd7]',
        ACTIVE:    'text-[#ffedd7]/80',
        FLAGGED:   'text-[#dc5000]',
        PENDING:   'text-[#6c5f51]',
    };

    const icons: Record<string, React.ReactNode> = {
        CONFIRMED: <CheckCircle2 size={12} className="text-[#ffedd7]" />,
        ACTIVE:    <CheckCircle2 size={12} className="text-[#ffedd7]/80" />,
        PENDING:   <Clock size={12} className="text-[#6c5f51]" />,
        FLAGGED:   <AlertTriangle size={12} className="text-[#dc5000]" />,
    };

    return (
        <div className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider">
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
        <div className="space-y-4 font-sans selection:bg-[#dc5000]/30 text-[#ffedd7]">
            <div className="flex items-center justify-between">
                <h2 className="text-2xl font-black uppercase tracking-tight text-[#ffedd7]">Ground Truth Data</h2>
                <div className="flex gap-4">
                    <input
                        type="text"
                        placeholder="Search places..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="bg-transparent border border-[#ffedd7]/30 focus:border-[#ffedd7] rounded-none py-1.5 px-3 text-xs text-[#ffedd7] placeholder-[#ffedd7]/40 focus:outline-none transition-colors w-64"
                    />
                    <button 
                        onClick={onAddPlace}
                        className="bg-[#382416] text-[#ffedd7] border border-[#ffedd7]/10 hover:border-[#ffedd7]/30 hover:opacity-90 px-5 py-1.5 rounded-[36px] text-xs font-bold transition-all"
                    >
                        Add Place
                    </button>
                </div>
            </div>

            <div className="bg-[#100904] border border-[#40372e] border-dashed rounded-xl overflow-hidden min-h-[400px] flex flex-col">
                <table className="w-full text-sm text-left">
                    <thead className="bg-transparent border-b border-[#40372e] border-dashed text-[10px] uppercase text-[#6c5f51] font-mono font-bold tracking-wider">
                        <tr>
                            <th className="px-6 py-3">Place Name</th>
                            <th className="px-6 py-3">Status</th>
                            <th className="px-6 py-3">Validation</th>
                            <th className="px-6 py-3">Confidence</th>
                            <th className="px-6 py-3">Last Verified</th>
                            <th className="px-4 py-3 w-10"></th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-[#40372e]/50 font-sans">
                        {filteredPlaces.map((place) => (
                            <tr
                                key={place.id}
                                onClick={() => onSelectPlace(place)}
                                className="hover:bg-[#382416]/10 border-b border-[#40372e]/20 transition-colors group cursor-pointer"
                            >
                                <td className="px-6 py-4">
                                    <div className="font-bold text-[#ffedd7]">{place.name}</div>
                                    <div className="text-xs text-[#6c5f51] truncate max-w-[200px] mt-0.5">
                                        {place.address || 'No address provided'}
                                    </div>
                                </td>
                                 <td className="px-6 py-4">
                                    <div className="flex flex-col gap-1">
                                        {place.derived_status && (
                                            <div className={cn(
                                                "px-2.5 py-0.5 rounded-full text-[9px] font-mono font-bold uppercase tracking-wider border w-fit shadow-sm",
                                                place.derived_status === 'LIKELY_OPEN' ? "bg-[#382416] text-[#ffedd7] border-[#ffedd7]/20" :
                                                place.derived_status === 'UNCERTAIN' ? "bg-transparent text-[#dc5000]/80 border-[#dc5000]/30" :
                                                "bg-transparent text-[#dc5000] border-[#dc5000]/40"
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
                                        <div className="h-1 w-16 bg-[#40372e] rounded-full overflow-hidden">
                                            <div
                                                className={cn("h-full rounded-full transition-all", (place.confidence_score ?? 0) < 50 ? "bg-[#dc5000]" : "bg-[#ffedd7]")}
                                                style={{ width: `${Math.min(Math.max(place.confidence_score ?? 0, 5), 100)}%` }}
                                            />
                                        </div>
                                        <span className="text-xs font-mono text-[#ffedd7]">{place.confidence_score ?? 0}%</span>
                                    </div>
                                </td>
                                <td className="px-6 py-4 text-[#6c5f51] text-xs font-mono">
                                    {place.last_validated_at 
                                        ? formatDistanceToNow(new Date(place.last_validated_at), { addSuffix: true }) 
                                        : 'Never'}
                                </td>
                                <td className="px-4 py-4 text-right">
                                    <button className="p-1 hover:bg-[#382416]/30 rounded text-[#6c5f51] hover:text-[#ffedd7]">
                                        <MoreHorizontal size={16} />
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>

                {loading && (
                    <div className="flex-1 flex items-center justify-center p-8">
                        <div className="flex flex-col items-center text-[#6c5f51] font-mono text-xs">
                            <span className="w-8 h-8 border-2 border-[#ffedd7] border-t-transparent rounded-full animate-spin mb-4" />
                            <p>Loading ground truth data...</p>
                        </div>
                    </div>
                )}

                {!loading && filteredPlaces.length === 0 && (
                    <div className="flex-1 flex items-center justify-center p-12">
                         <div className="text-center font-sans">
                            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full border border-[#40372e] mb-4 text-[#ffedd7]">
                                <MapPin size={24} className="stroke-[1.5]" />
                            </div>
                            <h3 className="text-sm font-bold text-[#ffedd7] mb-1">No places found</h3>
                            <p className="text-xs text-[#6c5f51] mb-4 font-mono">
                                {searchQuery ? `No results match "${searchQuery}"` : "You haven't added any places to track yet."}
                            </p>
                            {!searchQuery && (
                                <button onClick={onAddPlace} className="text-[#ffedd7] font-bold hover:text-[#dc5000] text-xs underline decoration-[#dc5000] transition-colors">
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
