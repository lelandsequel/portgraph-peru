'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { ConfidenceBadge } from '@/components/ProvenancePanel';
import { TradeFlow, GLOBAL_PORTS } from '@/lib/db/types';

const COUNTRY_FLAG: Record<string, string> = {
  'Peru': '🇵🇪', 'Chile': '🇨🇱', 'China': '🇨🇳', 'Japan': '🇯🇵', 'India': '🇮🇳',
  'South Korea': '🇰🇷', 'Germany': '🇩🇪', 'Spain': '🇪🇸', 'Brazil': '🇧🇷', 'USA': '🇺🇸',
  'Australia': '🇦🇺', 'Indonesia': '🇮🇩', 'South Africa': '🇿🇦', 'DRC': '🇨🇩',
  'Canada': '🇨🇦', 'Russia': '🇷🇺', 'Ukraine': '🇺🇦', 'Kazakhstan': '🇰🇿', 'Guinea': '🇬🇳',
  'Netherlands': '🇳🇱', 'Belgium': '🇧🇪', 'Finland': '🇫🇮', 'Sweden': '🇸🇪',
  'Philippines': '🇵🇭', 'Taiwan': '🇹🇼', 'Thailand': '🇹🇭', 'Turkey': '🇹🇷',
  'Panama': '🇵🇦', 'Liberia': '🇱🇷', 'Marshall Islands': '🇲🇭', 'Hong Kong': '🇭🇰',
  'Singapore': '🇸🇬', 'Malta': '🇲🇹', 'Bahamas': '🇧🇸', 'Cyprus': '🇨🇾',
  'Greece': '🇬🇷', 'Norway': '🇳🇴', 'United Kingdom': '🇬🇧',
};

const COMMODITY_DOT: Record<string, string> = {
  copper_ore: '#f59e0b', refined_copper: '#f59e0b', copper_matte: '#f59e0b',
  iron_ore: '#ef4444', coal: '#6b7280', soy: '#22c55e',
  nickel_ore: '#8b5cf6', cobalt: '#3b82f6', zinc_ore: '#a855f7',
  lead_ore: '#64748b', platinum: '#e2e8f0',
  potash: '#f97316', wheat: '#eab308', corn: '#84cc16',
  fertilizer: '#14b8a6', uranium: '#facc15', bauxite: '#dc2626',
};

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const hours = Math.floor(diff / 3600000);
  if (hours < 1) return `${Math.floor(diff / 60000)}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export default function TradeFeedPage() {
  const [flows, setFlows] = useState<TradeFlow[]>([]);
  const [loading, setLoading] = useState(true);
  const [portFilter, setPortFilter] = useState<string>('all');
  const [confidenceFilter, setConfidenceFilter] = useState<string>('all');
  const [countryFilter, setCountryFilter] = useState<string>('all');
  const [sortCol, setSortCol] = useState<string>('time');
  const [sortAsc, setSortAsc] = useState(false);

  useEffect(() => {
    async function loadFeed() {
      setLoading(true);
      try {
        const res = await fetch('/api/feed');
        if (res.ok) {
          const data = await res.json();
          setFlows(data.flows || []);
        }
      } catch (err) {
        console.error('Failed to load feed:', err);
      } finally {
        setLoading(false);
      }
    }
    loadFeed();
  }, []);

  const countries = Array.from(new Set(flows.map(f => f.reporter_country || f.origin_country).filter(Boolean))) as string[];

  const filteredFlows = flows.filter(f => {
    if (portFilter !== 'all' && f.peru_port_unlocode !== portFilter) return false;
    if (confidenceFilter !== 'all' && f.confidence_tier !== confidenceFilter) return false;
    if (countryFilter !== 'all' && (f.reporter_country || f.origin_country) !== countryFilter) return false;
    return true;
  });

  // Stats
  const totalValue = useMemo(() => filteredFlows.reduce((s, f) => s + (f.declared_value_usd || 0), 0), [filteredFlows]);
  const topCommodity = useMemo(() => {
    const counts: Record<string, number> = {};
    filteredFlows.forEach(f => { if (f.commodity) counts[f.commodity] = (counts[f.commodity] || 0) + 1; });
    return Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] || '—';
  }, [filteredFlows]);
  const topCorridor = useMemo(() => {
    const counts: Record<string, number> = {};
    filteredFlows.forEach(f => {
      const key = `${f.origin_country || '?'} → ${f.destination_country || '?'}`;
      counts[key] = (counts[key] || 0) + 1;
    });
    return Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] || '—';
  }, [filteredFlows]);

  const maxValue = useMemo(() => Math.max(...filteredFlows.map(f => f.declared_value_usd || 0), 1), [filteredFlows]);

  // Sort
  const sortedFlows = useMemo(() => {
    const sorted = [...filteredFlows];
    sorted.sort((a, b) => {
      let cmp = 0;
      if (sortCol === 'vessel') cmp = (a.vessel_name || '').localeCompare(b.vessel_name || '');
      else if (sortCol === 'commodity') cmp = (a.commodity || '').localeCompare(b.commodity || '');
      else if (sortCol === 'value') cmp = (a.declared_value_usd || 0) - (b.declared_value_usd || 0);
      else if (sortCol === 'weight') cmp = (a.weight_kg || 0) - (b.weight_kg || 0);
      else cmp = new Date(b.arrival_time || 0).getTime() - new Date(a.arrival_time || 0).getTime();
      return sortAsc ? cmp : -cmp;
    });
    return sorted;
  }, [filteredFlows, sortCol, sortAsc]);

  const handleSort = (col: string) => {
    if (sortCol === col) setSortAsc(!sortAsc);
    else { setSortCol(col); setSortAsc(false); }
  };

  const SortHeader = ({ col, label, align }: { col: string; label: string; align?: string }) => (
    <th
      className={`px-4 py-2.5 text-[9px] text-[#6b7a8d] uppercase tracking-wider font-medium cursor-pointer hover:text-[#C6A86B] transition-colors ${align === 'right' ? 'text-right' : 'text-left'}`}
      style={{ fontFamily: 'Manrope' }}
      onClick={() => handleSort(col)}
    >
      {label} {sortCol === col ? (sortAsc ? '↑' : '↓') : ''}
    </th>
  );

  return (
    <div className="p-4 sm:p-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
        <div>
          <h1 className="text-xl sm:text-2xl font-thin tracking-wide text-[#C6A86B]" style={{ fontFamily: 'Sora, Manrope' }}>Vessels</h1>
          <p className="text-[#6b7a8d] text-sm mt-0.5">Live vessel activity across global ports</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <select
            value={portFilter}
            onChange={e => setPortFilter(e.target.value)}
            className="bg-[#121722] border border-[#1e2535] px-3 py-1.5 text-xs text-[#8a9bb0] focus:outline-none focus:border-[#4C6A92] min-h-[36px]"
          >
            <option value="all">All Ports</option>
            {Object.entries(GLOBAL_PORTS).map(([code, info]) => (
              <option key={code} value={code}>{info.name} ({info.country})</option>
            ))}
          </select>
          <select
            value={countryFilter}
            onChange={e => setCountryFilter(e.target.value)}
            className="bg-[#121722] border border-[#1e2535] px-3 py-1.5 text-xs text-[#8a9bb0] focus:outline-none focus:border-[#4C6A92] min-h-[36px]"
          >
            <option value="all">All Countries</option>
            {countries.map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
          <select
            value={confidenceFilter}
            onChange={e => setConfidenceFilter(e.target.value)}
            className="bg-[#121722] border border-[#1e2535] px-3 py-1.5 text-xs text-[#8a9bb0] focus:outline-none focus:border-[#4C6A92] min-h-[36px]"
          >
            <option value="all">All Confidence</option>
            <option value="HIGH">HIGH</option>
            <option value="MEDIUM">MEDIUM</option>
            <option value="LOW">LOW</option>
          </select>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-3 gap-px bg-[#1e2535] mb-5">
        <div className="bg-[#121722] p-3">
          <p className="text-[9px] text-[#6b7a8d] uppercase tracking-wider mb-1" style={{ fontFamily: 'Manrope' }}>Total Value</p>
          <p className="text-base font-semibold text-[#e0e6ed]" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
            {totalValue >= 1e6 ? `$${(totalValue / 1e6).toFixed(0)}M` : totalValue >= 1e3 ? `$${(totalValue / 1e3).toFixed(0)}K` : `$${totalValue}`}
          </p>
        </div>
        <div className="bg-[#121722] p-3">
          <p className="text-[9px] text-[#6b7a8d] uppercase tracking-wider mb-1" style={{ fontFamily: 'Manrope' }}>Top Commodity</p>
          <p className="text-sm font-medium text-[#e0e6ed] truncate" style={{ fontFamily: 'Manrope' }}>{topCommodity}</p>
        </div>
        <div className="bg-[#121722] p-3">
          <p className="text-[9px] text-[#6b7a8d] uppercase tracking-wider mb-1" style={{ fontFamily: 'Manrope' }}>Top Corridor</p>
          <p className="text-sm font-medium text-[#C6A86B] truncate" style={{ fontFamily: 'JetBrains Mono, monospace' }}>{topCorridor}</p>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="w-8 h-8 border-2 border-[#4C6A92]/30 border-t-[#4C6A92] rounded-full animate-spin" />
        </div>
      ) : sortedFlows.length === 0 ? (
        <div className="text-center py-16 text-[#6b7a8d]">
          <p className="text-lg mb-2">No trade flows found</p>
          <p className="text-sm">Adjust filters or seed data.</p>
        </div>
      ) : (
        <>
          {/* Table view */}
          <div className="bg-[#121722] border border-[#1e2535] overflow-x-auto mb-4">
            <table className="w-full text-sm min-w-[800px]">
              <thead>
                <tr className="border-b border-[#1e2535]">
                  <SortHeader col="vessel" label="Vessel" />
                  <th className="px-4 py-2.5 text-[9px] text-[#6b7a8d] uppercase tracking-wider font-medium text-left" style={{ fontFamily: 'Manrope' }}>Route</th>
                  <SortHeader col="commodity" label="Commodity" />
                  <SortHeader col="value" label="Value" align="right" />
                  <SortHeader col="weight" label="Weight" align="right" />
                  <th className="px-4 py-2.5 text-[9px] text-[#6b7a8d] uppercase tracking-wider font-medium text-right" style={{ fontFamily: 'Manrope' }}>Confidence</th>
                  <SortHeader col="time" label="Last Seen" align="right" />
                </tr>
              </thead>
              <tbody>
                {sortedFlows.map((flow, i) => {
                  const dotColor = COMMODITY_DOT[flow.commodity_category || ''] || '#6b7a8d';
                  const flagEmoji = COUNTRY_FLAG[flow.flag_state || ''] || '';
                  const valueWidth = flow.declared_value_usd ? Math.max(4, (flow.declared_value_usd / maxValue) * 100) : 0;

                  return (
                    <tr key={flow.id || i} className="border-b border-[#1e2535]/30 hover:bg-[#1a2030] transition-colors">
                      <td className="px-4 py-2.5">
                        <Link href={`/terminal?q=${encodeURIComponent(flow.vessel_name || '')}&type=vessel`} className="hover:text-[#C6A86B] transition-colors">
                          <div className="flex items-center gap-2">
                            {flagEmoji && <span className="text-sm">{flagEmoji}</span>}
                            <div>
                              <span className="text-xs font-medium text-[#e0e6ed] block" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
                                {flow.vessel_name || 'Unknown'}
                              </span>
                              {flow.imo_number && <span className="text-[10px] text-[#6b7a8d]" style={{ fontFamily: 'JetBrains Mono, monospace' }}>IMO {flow.imo_number}</span>}
                            </div>
                          </div>
                        </Link>
                      </td>
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-1.5 text-xs" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
                          <span className="text-[#8a9bb0]">{flow.origin_country || '?'}</span>
                          <span className="text-[#4C6A92]">→</span>
                          <span className="text-[#e0e6ed]">{flow.peru_port}</span>
                          {flow.destination_country && (
                            <>
                              <span className="text-[#4C6A92]">→</span>
                              <span className="text-[#C6A86B]">{flow.destination_country}</span>
                            </>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-2.5">
                        {flow.commodity && (
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: dotColor }} />
                            <span className="text-xs text-[#8a9bb0]">{flow.commodity}</span>
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {valueWidth > 0 && (
                            <div className="w-16 h-1 bg-[#1e2535] overflow-hidden">
                              <div className="h-full bg-[#C6A86B]/40" style={{ width: `${valueWidth}%` }} />
                            </div>
                          )}
                          <span className="text-xs text-[#8a9bb0]" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
                            {flow.declared_value_usd ? `$${(flow.declared_value_usd / 1000).toFixed(0)}K` : '—'}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-2.5 text-right text-xs text-[#8a9bb0]" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
                        {flow.weight_kg ? `${(flow.weight_kg / 1000).toFixed(1)}t` : '—'}
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        <ConfidenceBadge tier={flow.confidence_tier} />
                      </td>
                      <td className="px-4 py-2.5 text-right text-[10px] text-[#6b7a8d]" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
                        {flow.arrival_time ? timeAgo(flow.arrival_time) : '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="text-center text-[10px] text-[#6b7a8d]" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
            Showing {sortedFlows.length} of {flows.length} trade flows
          </div>
        </>
      )}
    </div>
  );
}
