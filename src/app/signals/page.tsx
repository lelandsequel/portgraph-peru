'use client';

import { useState, useEffect, useRef } from 'react';
import { generateCosmicSignals, CosmicAlert, PreviousState } from '@/lib/signals/cosmicSignalEngine';

const IMPACT_COLOR: Record<string, string> = {
  routine: '#22c55e',
  notable: '#eab308',
  critical: '#ef4444',
};

const TYPE_LABEL: Record<string, string> = {
  entity_entry: 'Entity Entry',
  dominance_shift: 'Dominance Shift',
  route_expansion: 'Route Expansion',
  route_confirmed: 'Route Confirmed',
  demand_surge: 'Demand Surge',
  supply_disruption: 'Supply Disruption',
  new_corridor: 'New Corridor',
  critical_mineral_alert: 'Critical Mineral',
};

const TYPE_COLOR: Record<string, string> = {
  entity_entry: 'text-[#4C6A92] bg-[#4C6A92]/15',
  dominance_shift: 'text-purple-400 bg-purple-500/15',
  route_expansion: 'text-emerald-400 bg-emerald-500/15',
  route_confirmed: 'text-[#C6A86B] bg-[#C6A86B]/15',
  demand_surge: 'text-rose-400 bg-rose-500/15',
  supply_disruption: 'text-orange-400 bg-orange-500/15',
  new_corridor: 'text-cyan-400 bg-cyan-500/15',
  critical_mineral_alert: 'text-fuchsia-400 bg-fuchsia-500/15',
};

function timeAgo(ts: number): string {
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  return `${Math.floor(s / 3600)}h ago`;
}

function ConfidenceBar({ value }: { value: number }) {
  const pct = Math.round(value * 100);
  const color = pct >= 80 ? '#22c55e' : pct >= 55 ? '#eab308' : '#ef4444';
  return (
    <div className="w-full h-[3px] bg-[#1a2030] mt-1">
      <div className="h-full transition-all" style={{ width: `${pct}%`, backgroundColor: color }} />
    </div>
  );
}

function SignalCard({ alert }: { alert: CosmicAlert }) {
  const impColor = IMPACT_COLOR[alert.impact_category] || '#6b7a8d';
  return (
    <div className={`p-4 transition-all border-l-2`} style={{ borderLeftColor: impColor, backgroundColor: alert.impact_category === 'critical' ? 'rgba(239,68,68,0.05)' : '#121722' }}>
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 ${TYPE_COLOR[alert.alert_type] ?? 'text-[#8a9bb0] bg-[#1a2030]'}`}>
            {TYPE_LABEL[alert.alert_type] || alert.alert_type}
          </span>
          <span className="text-[9px] font-bold uppercase tracking-widest px-2 py-0.5" style={{ color: impColor, backgroundColor: `${impColor}15` }}>
            {alert.impact_category.toUpperCase()}
          </span>
          <span className="text-[9px] font-mono px-1.5 py-0.5 bg-[#1a2030]" style={{
            color: alert.route_status === 'confirmed' ? '#22c55e' : alert.route_status === 'partial' ? '#eab308' : '#ef4444'
          }}>
            {alert.route_status}
          </span>
        </div>
        <div className="text-right shrink-0">
          <div className="text-lg font-bold font-mono" style={{ color: impColor }}>{alert.impact_score}</div>
          <div className="text-[10px] text-[#6b7a8d]">{timeAgo(alert.timestamp)}</div>
        </div>
      </div>

      <div className="text-sm font-medium text-[#e0e6ed] mb-0.5" style={{ fontFamily: 'Manrope' }}>{alert.title}</div>
      <div className="flex items-center gap-2 mb-2">
        <span className="text-[10px] text-[#8a9bb0] font-mono">{Math.round(alert.confidence * 100)}% confidence</span>
        <span className="text-[10px] text-[#6b7a8d]">|</span>
        <span className="text-[10px] text-[#6b7a8d] font-mono">F:{Math.round(alert.freshness_score * 100)}%</span>
      </div>
      <ConfidenceBar value={alert.confidence} />

      <div className="text-xs text-[#8a9bb0] mt-2 leading-relaxed">{alert.why_it_matters}</div>
      <div className="text-[10px] text-[#C6A86B] mt-1 font-mono">{alert.price_context}</div>

      {alert.entities.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-2">
          {alert.entities.slice(0, 4).map((e, i) => (
            <span key={i} className="text-[10px] px-2 py-0.5 bg-[#1a2030] text-[#8a9bb0] border border-[#1e2535]" style={{ fontFamily: 'Manrope' }}>
              {e}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

export default function SignalsPage() {
  const [alerts, setAlerts] = useState<CosmicAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState('');
  const prevStateRef = useRef<PreviousState>(new Map());

  const refresh = async (showLoading = false) => {
    if (showLoading) setLoading(true);
    try {
      const res = await fetch('/api/feed');
      if (!res.ok) throw new Error('Feed failed');
      const data = await res.json();
      const flows = data.flows || [];
      const { alerts: newAlerts, nextState } = generateCosmicSignals(flows, prevStateRef.current);
      prevStateRef.current = nextState;
      if (newAlerts.length > 0) {
        setAlerts(prev => {
          const combined = [...newAlerts, ...prev];
          const seen = new Set<string>();
          return combined.filter(a => {
            if (seen.has(a.id)) return false;
            seen.add(a.id);
            return true;
          }).sort((a, b) => b.impact_score - a.impact_score).slice(0, 15);
        });
      }
      setLastRefresh(new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }));
    } catch (e) {
      console.error('Signal refresh failed', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh(true);
    const interval = setInterval(() => refresh(false), 15000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="p-4 sm:p-6 max-w-4xl">
      <div className="mb-4">
        <div className="flex items-center justify-between mb-1 gap-2">
          <h1 className="text-lg font-thin tracking-wide text-[#C6A86B]" style={{ fontFamily: 'Sora, Manrope' }}>COSMIC Signals</h1>
          <div className="flex items-center gap-3">
            <span className="text-[9px] px-2 py-0.5 bg-red-900/20 text-red-400 border border-red-900/30 animate-pulse">LIVE</span>
            {lastRefresh && (
              <span className="text-[10px] text-[#6b7a8d] font-mono">UPD {lastRefresh}</span>
            )}
          </div>
        </div>
        <p className="text-[#6b7a8d] text-xs">
          Intelligence signals scored by QUASAR impact engine. Confidence via NEBULA. Route status via COMET.
        </p>
      </div>

      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-28 bg-[#121722] animate-pulse" />
          ))}
        </div>
      ) : alerts.length === 0 ? (
        <div className="text-center py-20 text-[#6b7a8d]">
          <div className="text-4xl mb-4 opacity-30">&#9678;</div>
          <div className="text-sm font-mono">MONITORING... NO SIGNALS DETECTED</div>
        </div>
      ) : (
        <div className="space-y-px bg-[#1e2535]">
          {alerts.map(alert => (
            <SignalCard key={alert.id} alert={alert} />
          ))}
        </div>
      )}
    </div>
  );
}
