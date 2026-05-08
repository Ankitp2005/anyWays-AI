import React, { useState, useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Dot } from 'recharts';
import { formatDistanceToNow, format } from 'date-fns';
import { useConfidenceTimeline, Timeframe } from '../../hooks/useConfidenceTimeline';
import { SignalEvent } from '../../models/types';
import { cn } from '../../utils/cn';

interface ConfidenceTimelineProps {
    placeId: string;
}

const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
        const evt = payload[0].payload as SignalEvent;
        const isPositive = evt.confidence_delta >= 0;
        return (
            <div className="bg-card border border-border p-3 rounded-lg shadow-xl text-sm font-sans z-50">
                <p className="font-bold text-foreground mb-1">
                    {evt.signal_type} 
                    <span className={cn("ml-1", isPositive ? 'text-green-500' : 'text-red-500')}>
                        ({isPositive ? '+' : ''}{evt.confidence_delta})
                    </span>
                </p>
                <p className="text-muted-foreground">Score: <span className="font-bold text-foreground">{evt.score_after}</span></p>
                <p className="text-xs text-muted-foreground/70 mt-1">
                    {(() => {
                        const d = new Date(evt.created_at);
                        return isNaN(d.getTime()) ? 'just now' : formatDistanceToNow(d, { addSuffix: true });
                    })()}
                </p>
            </div>
        );
    }
    return null;
};

// Custom dot to show distinct events
const CustomDot = (props: any) => {
    const { cx, cy, payload } = props;
    if (cx == null || cy == null) return null;
    
    // Color dot based on zone
    let fill = '#ef4444'; // default red
    if (payload.score_after >= 85) fill = '#22c55e'; // green
    else if (payload.score_after >= 70) fill = '#3b82f6'; // blue
    else if (payload.score_after >= 40) fill = '#eab308'; // yellow

    return (
        <circle cx={cx} cy={cy} r={4} stroke={fill} strokeWidth={2} fill="var(--card)" />
    );
};

export const ConfidenceTimeline: React.FC<ConfidenceTimelineProps> = ({ placeId }) => {
    const [timeframe, setTimeframe] = useState<Timeframe>('24h');
    const { data, loading } = useConfidenceTimeline(placeId, timeframe);

    const chartData = useMemo(() => data.map(evt => {
        const d = new Date(evt.created_at);
        const validDate = isNaN(d.getTime()) ? new Date() : d;
        return {
            ...evt,
            timeLabel: format(validDate, timeframe === '24h' ? 'HH:mm' : 'MMM d'),
            value: evt.score_after
        };
    }), [data, timeframe]);

    return (
        <div className="bg-card border border-border rounded-xl p-6 shadow-sm flex flex-col h-full">
            {/* Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-4">
                <h3 className="font-semibold text-foreground">Confidence Timeline</h3>
                
                {/* Timeframe Toggle */}
                <div className="flex items-center bg-secondary/50 rounded-lg p-1 border border-border/50">
                    {(['24h', '7d', '30d'] as Timeframe[]).map(tf => (
                        <button
                            key={tf}
                            onClick={() => setTimeframe(tf)}
                            className={cn(
                                "px-3 py-1 text-xs font-medium rounded-md transition-colors",
                                timeframe === tf 
                                    ? "bg-background text-foreground shadow-sm" 
                                    : "text-muted-foreground hover:text-foreground"
                            )}
                        >
                            {tf}
                        </button>
                    ))}
                </div>
            </div>

            {/* Chart Container */}
            <div className="h-[300px] w-full relative">
                {loading ? (
                    <div className="absolute inset-0 flex items-center justify-center bg-card/50 z-10">
                        <div className="animate-pulse flex flex-col items-center">
                            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4" />
                            <p className="text-sm text-muted-foreground">Loading timeline...</p>
                        </div>
                    </div>
                ) : chartData.length === 0 ? (
                    <div className="absolute inset-0 flex items-center justify-center">
                        <p className="text-sm text-muted-foreground italic">No signal events in this timeframe.</p>
                    </div>
                ) : (
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                            <defs>
                                <linearGradient id="scoreGradient" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor="#22c55e" stopOpacity={1}/>
                                    <stop offset="15%" stopColor="#22c55e" stopOpacity={1}/>
                                    
                                    <stop offset="16%" stopColor="#3b82f6" stopOpacity={1}/>
                                    <stop offset="30%" stopColor="#3b82f6" stopOpacity={1}/>
                                    
                                    <stop offset="31%" stopColor="#eab308" stopOpacity={1}/>
                                    <stop offset="60%" stopColor="#eab308" stopOpacity={1}/>
                                    
                                    <stop offset="61%" stopColor="#ef4444" stopOpacity={1}/>
                                    <stop offset="100%" stopColor="#ef4444" stopOpacity={1}/>
                                </linearGradient>
                            </defs>
                            
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" opacity={0.4} />
                            
                            <XAxis 
                                dataKey="timeLabel" 
                                stroke="var(--muted-foreground)" 
                                fontSize={11} 
                                tickLine={false} 
                                axisLine={false} 
                                minTickGap={30}
                            />
                            
                            <YAxis 
                                domain={[0, 100]} 
                                stroke="var(--muted-foreground)" 
                                fontSize={11} 
                                tickLine={false} 
                                axisLine={false} 
                                ticks={[0, 25, 50, 75, 100]}
                            />
                            
                            <Tooltip content={<CustomTooltip />} cursor={{ stroke: 'var(--border)', strokeWidth: 1, strokeDasharray: '4 4' }} />
                            
                            <Line 
                                type="monotone" 
                                dataKey="value" 
                                stroke="url(#scoreGradient)" 
                                strokeWidth={3}
                                dot={<CustomDot />}
                                activeDot={{ r: 6, strokeWidth: 0, fill: 'var(--foreground)' }}
                                animationDuration={1000}
                                isAnimationActive={true}
                            />
                        </LineChart>
                    </ResponsiveContainer>
                )}
            </div>
        </div>
    );
};
