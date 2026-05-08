import React from 'react';
import { 
  Activity, 
  AlertTriangle, 
  ShieldCheck, 
  Terminal, 
  Zap, 
  Clock, 
  Code,
  Globe
} from 'lucide-react';
import { ENV, RELEASE } from '../../lib/observability';

const ObservabilityPanel: React.FC = () => {
  // Mock data for health indicators (Part 9)
  const healthMetrics = [
    { label: 'Intelligence Pipeline', status: 'healthy', latency: '42ms', load: '12%' },
    { label: 'Trust Engine', status: 'healthy', latency: '15ms', load: '5%' },
    { label: 'Drift Monitoring', status: 'healthy', latency: '128ms', load: '8%' },
    { label: 'Edge Functions', status: 'healthy', latency: '210ms', load: '24%' },
  ];

  const recentEvents = [
    { id: 1, type: 'INTELLIGENCE_STABILIZED', msg: 'Score clamped (+15)', trace: 'tr-82x1', time: '2m ago' },
    { id: 2, type: 'TRUST_UPDATE', msg: 'Provider trust improved (+0.05)', trace: 'tr-99p3', time: '5m ago' },
    { id: 3, type: 'SECURITY_ALERT', msg: 'Rate limit bucket exhausted', trace: 'tr-11z9', time: '12m ago', severity: 'warning' },
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-50">System Observability</h1>
        <p className="text-sm text-neutral-500 dark:text-neutral-400">
          Enterprise-grade telemetry for the intelligence stack
        </p>
      </header>

      {/* Release & Env Info (Part 6) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-sm flex items-center gap-4">
          <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400">
            <Globe size={20} />
          </div>
          <div>
            <p className="text-xs font-medium text-neutral-500 uppercase tracking-wider">Environment</p>
            <div className="flex items-center gap-2">
              <p className="text-lg font-semibold text-neutral-900 dark:text-neutral-50 uppercase">{ENV}</p>
              <span className={`w-2 h-2 rounded-full ${ENV === 'production' ? 'bg-green-500' : 'bg-yellow-500 animate-pulse'}`} />
            </div>
          </div>
        </div>

        <div className="p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-sm flex items-center gap-4">
          <div className="p-2 rounded-lg bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400">
            <Code size={20} />
          </div>
          <div>
            <p className="text-xs font-medium text-neutral-500 uppercase tracking-wider">Current Release</p>
            <p className="text-lg font-mono font-semibold text-neutral-900 dark:text-neutral-50">{RELEASE.slice(0, 7)}</p>
          </div>
        </div>

        <div className="p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-sm flex items-center gap-4">
          <div className="p-2 rounded-lg bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400">
            <ShieldCheck size={20} />
          </div>
          <div>
            <p className="text-xs font-medium text-neutral-500 uppercase tracking-wider">Security State</p>
            <p className="text-lg font-semibold text-neutral-900 dark:text-neutral-50 text-green-600">Active Guards</p>
          </div>
        </div>
      </div>

      {/* Pipeline Health (Part 9) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="p-6 rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-sm font-semibold text-neutral-900 dark:text-neutral-50 flex items-center gap-2">
              <Activity size={18} className="text-blue-500" />
              Pipeline Health (p95)
            </h2>
            <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400">REALTIME</span>
          </div>
          
          <div className="space-y-4">
            {healthMetrics.map((m) => (
              <div key={m.label} className="flex items-center justify-between group">
                <div className="flex items-center gap-3">
                  <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
                  <span className="text-sm text-neutral-600 dark:text-neutral-400 group-hover:text-neutral-900 dark:group-hover:text-neutral-50 transition-colors">{m.label}</span>
                </div>
                <div className="flex items-center gap-6">
                  <div className="text-right">
                    <p className="text-xs font-mono font-medium text-neutral-900 dark:text-neutral-50">{m.latency}</p>
                    <p className="text-[10px] text-neutral-400 uppercase">Latency</p>
                  </div>
                  <div className="text-right w-12">
                    <p className="text-xs font-mono font-medium text-neutral-900 dark:text-neutral-50">{m.load}</p>
                    <p className="text-[10px] text-neutral-400 uppercase">Load</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Operational Logs (Part 2 & 3) */}
        <div className="p-6 rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-sm font-semibold text-neutral-900 dark:text-neutral-50 flex items-center gap-2">
              <Terminal size={18} className="text-neutral-400" />
              Live Observability Feed
            </h2>
            <button className="text-[10px] font-medium text-blue-600 hover:underline">OPEN SENTRY</button>
          </div>

          <div className="space-y-3">
            {recentEvents.map((ev) => (
              <div key={ev.id} className="p-3 rounded-lg bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-100 dark:border-neutral-800 flex items-start gap-3">
                {ev.severity === 'warning' ? <AlertTriangle size={14} className="text-amber-500 mt-0.5" /> : <Zap size={14} className="text-blue-500 mt-0.5" />}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10px] font-mono font-bold text-neutral-400 uppercase truncate">{ev.type}</span>
                    <span className="text-[10px] text-neutral-400 whitespace-nowrap">{ev.time}</span>
                  </div>
                  <p className="text-xs text-neutral-700 dark:text-neutral-300 mt-1">{ev.msg}</p>
                  <div className="mt-2 flex items-center gap-2">
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-neutral-200 dark:bg-neutral-700 text-neutral-500 dark:text-neutral-400 font-mono">trace:{ev.trace}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Performance Summary (Part 4) */}
      <div className="p-6 rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900">
         <h2 className="text-sm font-semibold text-neutral-900 dark:text-neutral-50 mb-6 flex items-center gap-2">
            <Clock size={18} className="text-blue-500" />
            Performance Triage (Global)
         </h2>
         <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <div>
              <p className="text-2xl font-bold text-neutral-900 dark:text-neutral-50">182ms</p>
              <p className="text-[10px] text-neutral-400 font-bold uppercase mt-1">p95 API Latency</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-neutral-900 dark:text-neutral-50">410ms</p>
              <p className="text-[10px] text-neutral-400 font-bold uppercase mt-1">p99 Edge Latency</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-neutral-900 dark:text-neutral-50">12ms</p>
              <p className="text-[10px] text-neutral-400 font-bold uppercase mt-1">p95 DB RPC</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-neutral-600 dark:text-neutral-400">0.02%</p>
              <p className="text-[10px] text-neutral-400 font-bold uppercase mt-1">Error Rate</p>
            </div>
         </div>
      </div>
    </div>
  );
};

export default ObservabilityPanel;
