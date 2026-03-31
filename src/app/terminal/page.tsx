'use client';

import { useState, useEffect, useRef } from 'react';
import { generateCosmicSignals, CosmicAlert, PreviousState } from '@/lib/signals/cosmicSignalEngine';

const IMPACT_COLOR: Record<string, string> = {
  routine: '#22c55e',
  notable: '#eab308',
  critical: '#ef4444',
};

const ROUTE_BADGE: Record<string, { color: string; bg: string }> = {
  confirmed: { color: '#22c55e', bg: 'rgba(34,197,94,0.15)' },
  partial: { color: '#eab308', bg: 'rgba(234,179,8,0.15)' },
  broken: { color: '#ef4444', bg: 'rgba(239,68,68,0.15)' },
};

function ConfidenceBar({ value }: { value: number }) {
  const pct = Math.round(value * 100);
  const color = pct >= 80 ? '#22c55e' : pct >= 55 ? '#eab308' : '#ef4444';
  return (
    <div className="w-full h-[3px] bg-[#1a2030] mt-1">
      <div className="h-full transition-all" style={{ width: `${pct}%`, backgroundColor: color }} />
    </div>
  );
}

function FreshnessIndicator({ score }: { score: number }) {
  const pct = Math.round(score * 100);
  const color = pct >= 80 ? '#22c55e' : pct >= 50 ? '#eab308' : '#ef4444';
  return (
    <span className="text-[9px] font-mono" style={{ color }}>
      F:{pct}%
    </span>
  );
}

export default function TerminalPage() {
  const [alerts, setAlerts] = useState<CosmicAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
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
          }).sort((a, b) => b.impact_score - a.impact_score).slice(0, 20);
        });
      }
      setLastRefresh(new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    } catch (e) {
      console.error('Terminal refresh failed', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh(true);
    const interval = setInterval(() => refresh(false), 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="h-[calc(100vh-6rem)] flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-[#1e2535] shrink-0">
        <div className="flex items-center gap-3">
          <h1 className="text-sm font-thin tracking-wide text-[#C6A86B]" style={{ fontFamily: 'Sora, Manrope' }}>
            COSMIC Terminal
          </h1>
          <span className="text-[9px] text-[#6b7a8d] bg-[#121722] px-2 py-0.5 border border-[#1e2535] font-mono">
            {alerts.length} signals
          </span>
          <span className="text-[9px] px-2 py-0.5 bg-red-900/20 text-red-400 border border-red-900/30 animate-pulse">LIVE</span>
        </div>
        <div className="flex items-center gap-3">
          {lastRefresh && (
            <span className="text-[9px] text-[#6b7a8d] font-mono">UPD {lastRefresh}</span>
          )}
          <span className="text-[9px] text-[#6b7a8d] font-mono">30s refresh</span>
        </div>
      </div>

      {/* Column headers */}
      <div className="flex items-center gap-0 px-2 py-1.5 border-b border-[#1e2535] bg-[#0d1117] text-[8px] text-[#6b7a8d] uppercase tracking-widest shrink-0 font-mono">
        <span className="w-10 text-center">IMP</span>
        <span className="w-12 text-center">CONF</span>
        <span className="flex-1 pl-2">EVENT</span>
        <span className="w-20 text-center hidden sm:block">ROUTE</span>
        <span className="w-24 text-right hidden sm:block">COMMODITY</span>
        <span className="w-16 text-right hidden md:block">FRESH</span>
        <span className="w-20 text-right hidden lg:block">ACTION</span>
      </div>

      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="w-6 h-6 border-2 border-[#4C6A92]/30 border-t-[#4C6A92] rounded-full animate-spin" />
        </div>
      ) : alerts.length === 0 ? (
        <div className="flex-1 flex items-center justify-center text-[#6b7a8d] text-sm font-mono">
          MONITORING... NO SIGNALS
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto" style={{ scrollbarWidth: 'thin' }}>
          {alerts.map(alert => {
            const impColor = IMPACT_COLOR[alert.impact_category] || '#6b7a8d';
            const routeBadge = ROUTE_BADGE[alert.route_status] || ROUTE_BADGE.partial;
            const isExpanded = expandedId === alert.id;

            return (
              <div key={alert.id}>
                {/* Main row */}
                <div
                  className="flex items-center gap-0 px-2 py-1.5 border-b border-[#1e2535]/40 hover:bg-[#121722] cursor-pointer transition-colors"
                  onClick={() => setExpandedId(isExpanded ? null : alert.id)}
                >
                  {/* Impact score */}
                  <span
                    className="w-10 text-center text-xs font-bold font-mono"
                    style={{ color: impColor }}
                  >
                    {alert.impact_score}
                  </span>

                  {/* Confidence */}
                  <span className="w-12 text-center text-[10px] font-mono text-[#8a9bb0]">
                    {Math.round(alert.confidence * 100)}%
                  </span>

                  {/* Event title */}
                  <span className="flex-1 text-xs text-[#e0e6ed] truncate pl-2 font-medium" style={{ fontFamily: 'Manrope' }}>
                    {alert.title}
                  </span>

                  {/* Route status */}
                  <span
                    className="w-20 text-center text-[9px] font-bold uppercase tracking-wider hidden sm:block"
                    style={{ color: routeBadge.color }}
                  >
                    {alert.route_status}
                  </span>

                  {/* Commodity */}
                  <span className="w-24 text-right text-[10px] text-[#8a9bb0] font-mono truncate hidden sm:block">
                    {alert.commodity.toUpperCase()}
                  </span>

                  {/* Freshness */}
                  <span className="w-16 text-right hidden md:block">
                    <FreshnessIndicator score={alert.freshness_score} />
                  </span>

                  {/* Action bias */}
                  <span className="w-20 text-right text-[9px] font-mono hidden lg:block" style={{
                    color: alert.action_bias.startsWith('ALERT') ? '#ef4444'
                      : alert.action_bias.startsWith('INVESTIGATE') ? '#eab308'
                      : alert.action_bias.startsWith('MONITOR') ? '#3b82f6'
                      : '#6b7a8d'
                  }}>
                    {alert.action_bias.split(' ')[0]}
                  </span>
                </div>

                {/* Confidence bar */}
                <div className="px-2">
                  <ConfidenceBar value={alert.confidence} />
                </div>

                {/* Expanded detail */}
                {isExpanded && (
                  <div className="px-3 py-3 bg-[#0d1117] border-b border-[#1e2535] text-[11px] space-y-2">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <div>
                        <span className="text-[9px] text-[#4C6A92] uppercase tracking-wider">Why it matters</span>
                        <p className="text-[#8a9bb0] mt-0.5">{alert.why_it_matters}</p>
                      </div>
                      <div>
                        <span className="text-[9px] text-[#4C6A92] uppercase tracking-wider">Economic implication</span>
                        <p className="text-[#8a9bb0] mt-0.5">{alert.economic_implication}</p>
                      </div>
                    </div>
                    <div>
                      <span className="text-[9px] text-[#4C6A92] uppercase tracking-wider">Price context</span>
                      <p className="text-[#C6A86B] font-mono mt-0.5">{alert.price_context}</p>
                    </div>
                    <div className="flex flex-wrap gap-3">
                      <div>
                        <span className="text-[9px] text-[#4C6A92] uppercase tracking-wider">Regions</span>
                        <p className="text-[#8a9bb0] mt-0.5">{alert.affected_regions.join(', ')}</p>
                      </div>
                      <div>
                        <span className="text-[9px] text-[#4C6A92] uppercase tracking-wider">Companies</span>
                        <p className="text-[#8a9bb0] mt-0.5">{alert.affected_companies.join(', ')}</p>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {alert.entities.map((e, i) => (
                        <span key={i} className="text-[9px] px-1.5 py-0.5 bg-[#1a2030] text-[#6b7a8d] border border-[#1e2535]">
                          {e}
                        </span>
                      ))}
                    </div>
                    <div className="flex gap-4 text-[9px] text-[#6b7a8d] font-mono pt-1 border-t border-[#1e2535]/50">
                      <span>METEOR: {alert.cosmic.meteor.composite_confidence.toFixed(2)}</span>
                      <span>COMET: {alert.cosmic.comet.continuity_score.toFixed(2)}</span>
                      <span>NEBULA: {alert.cosmic.nebula.confidence.toFixed(2)} ({alert.cosmic.nebula.uncertainty_band})</span>
                      <span>QUASAR: {alert.cosmic.quasar.impact_score} (p{alert.cosmic.quasar.percentile_rank})</span>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
