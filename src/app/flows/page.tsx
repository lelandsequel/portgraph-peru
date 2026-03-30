'use client';

import { useState, useEffect } from 'react';

const COMMODITY_COLOR: Record<string, string> = {
  copper_ore: '#f59e0b', refined_copper: '#f59e0b', copper_matte: '#f59e0b',
  iron_ore: '#ef4444', coal: '#6b7280', soy: '#22c55e',
  nickel_ore: '#8b5cf6', cobalt: '#3b82f6', zinc_ore: '#a855f7',
  lead_ore: '#64748b', platinum: '#e2e8f0', potash: '#f97316',
  wheat: '#eab308', corn: '#84cc16', fertilizer: '#14b8a6',
  uranium: '#facc15', bauxite: '#dc2626', lng: '#06b6d4',
  lithium_carbonate: '#10b981', lithium_ore: '#059669',
  rare_earths: '#d946ef', crude_oil: '#475569',
  alumina: '#f43f5e', chromium: '#7c3aed', manganese: '#be185d',
  phosphate: '#0d9488',
};

interface FlowArc {
  origin_country: string;
  destination_country: string;
  commodity: string;
  commodity_category: string;
  total_volume_mt: number;
  total_value_usd: number;
  trend: string;
}

function formatValue(usd: number): string {
  if (usd >= 1e9) return `$${(usd / 1e9).toFixed(1)}B`;
  if (usd >= 1e6) return `$${(usd / 1e6).toFixed(0)}M`;
  if (usd >= 1e3) return `$${(usd / 1e3).toFixed(0)}K`;
  return `$${usd.toFixed(0)}`;
}

function formatVolume(mt: number): string {
  if (mt >= 1e6) return `${(mt / 1e6).toFixed(1)}Mt`;
  if (mt >= 1e3) return `${(mt / 1e3).toFixed(0)}kt`;
  return `${mt.toFixed(0)}t`;
}

function TrendBadge({ trend }: { trend: string }) {
  if (trend === 'up') return <span className="text-emerald-400 text-xs">&#9650; YoY</span>;
  if (trend === 'down') return <span className="text-red-400 text-xs">&#9660; YoY</span>;
  return <span className="text-[#4C6A92] text-xs">&#9654; stable</span>;
}

export default function FlowsPage() {
  const [flows, setFlows] = useState<FlowArc[]>([]);
  const [biggest, setBiggest] = useState<FlowArc[]>([]);
  const [loading, setLoading] = useState(true);
  const [commodityFilter, setCommodityFilter] = useState('all');
  const [originFilter, setOriginFilter] = useState('all');
  const [destFilter, setDestFilter] = useState('all');
  const [commodities, setCommodities] = useState<string[]>([]);
  const [origins, setOrigins] = useState<string[]>([]);
  const [destinations, setDestinations] = useState<string[]>([]);
  const [totalValue, setTotalValue] = useState(0);
  const [totalArcs, setTotalArcs] = useState(0);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/api/flows');
        if (res.ok) {
          const data = await res.json();
          setFlows(data.flows || []);
          setBiggest(data.biggest || []);
          setCommodities(data.commodities || []);
          setOrigins(data.originCountries || []);
          setDestinations(data.destCountries || []);
          setTotalValue(data.totalValue || 0);
          setTotalArcs(data.totalArcs || 0);
        }
      } catch (err) {
        console.error('Failed to load flows:', err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const filtered = flows.filter(f => {
    if (commodityFilter !== 'all' && f.commodity_category !== commodityFilter) return false;
    if (originFilter !== 'all' && f.origin_country !== originFilter) return false;
    if (destFilter !== 'all' && f.destination_country !== destFilter) return false;
    return true;
  });

  return (
    <div className="p-4 sm:p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-xl sm:text-2xl font-thin tracking-wide text-[#C6A86B] mb-1" style={{ fontFamily: 'Sora, Manrope' }}>
          Commodity Flow Arcs
        </h1>
        <p className="text-[#6b7a8d] text-sm">
          Bilateral commodity corridors — Origin &#8594; Destination with volume, value &amp; trend
        </p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-6 h-6 border-2 border-[#C6A86B]/30 border-t-[#C6A86B] rounded-full animate-spin" />
        </div>
      ) : (
        <>
          {/* Summary stats */}
          <div className="grid grid-cols-3 gap-px bg-[#1e2535] mb-6">
            <div className="bg-[#121722] p-4">
              <p className="text-[9px] text-[#6b7a8d] uppercase tracking-wider mb-1" style={{ fontFamily: 'Manrope' }}>Total Corridors</p>
              <p className="text-xl font-semibold text-[#e0e6ed]" style={{ fontFamily: 'JetBrains Mono, monospace' }}>{totalArcs.toLocaleString()}</p>
            </div>
            <div className="bg-[#121722] p-4">
              <p className="text-[9px] text-[#6b7a8d] uppercase tracking-wider mb-1" style={{ fontFamily: 'Manrope' }}>Total Value</p>
              <p className="text-xl font-semibold text-[#e0e6ed]" style={{ fontFamily: 'JetBrains Mono, monospace' }}>{formatValue(totalValue)}</p>
            </div>
            <div className="bg-[#121722] p-4">
              <p className="text-[9px] text-[#6b7a8d] uppercase tracking-wider mb-1" style={{ fontFamily: 'Manrope' }}>Commodities</p>
              <p className="text-xl font-semibold text-[#e0e6ed]" style={{ fontFamily: 'JetBrains Mono, monospace' }}>{commodities.length}</p>
            </div>
          </div>

          {/* Biggest Flows */}
          {biggest.length > 0 && (
            <div className="mb-8">
              <h2 className="text-xs font-semibold text-[#4C6A92] uppercase tracking-[0.15em] mb-3" style={{ fontFamily: 'Manrope' }}>
                Biggest Flows (Top 10 by Value)
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-px bg-[#1e2535]">
                {biggest.map((f, i) => (
                  <div key={i} className="bg-[#121722] p-4 hover:bg-[#1a2030] transition-colors">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COMMODITY_COLOR[f.commodity_category] || '#6b7a8d' }} />
                      <span className="text-sm font-medium text-[#e0e6ed]" style={{ fontFamily: 'Manrope' }}>
                        {f.origin_country} &#8594; {f.destination_country}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] px-2 py-0.5 bg-[#1a2030] text-[#8a9bb0] border border-[#1e2535]">
                        {f.commodity}
                      </span>
                      <div className="text-right">
                        <p className="text-sm font-semibold text-[#C6A86B]" style={{ fontFamily: 'JetBrains Mono, monospace' }}>{formatValue(f.total_value_usd)}</p>
                        <p className="text-[10px] text-[#6b7a8d]" style={{ fontFamily: 'JetBrains Mono, monospace' }}>{formatVolume(f.total_volume_mt)}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Filters */}
          <div className="flex flex-wrap gap-3 mb-4">
            <select
              value={commodityFilter}
              onChange={e => setCommodityFilter(e.target.value)}
              className="bg-[#121722] border border-[#1e2535] text-[#8a9bb0] text-xs px-3 py-2 focus:outline-none focus:border-[#C6A86B]"
              style={{ fontFamily: 'JetBrains Mono, monospace' }}
            >
              <option value="all">All Commodities</option>
              {commodities.map(c => (
                <option key={c} value={c}>{c.replace(/_/g, ' ')}</option>
              ))}
            </select>
            <select
              value={originFilter}
              onChange={e => setOriginFilter(e.target.value)}
              className="bg-[#121722] border border-[#1e2535] text-[#8a9bb0] text-xs px-3 py-2 focus:outline-none focus:border-[#C6A86B]"
              style={{ fontFamily: 'JetBrains Mono, monospace' }}
            >
              <option value="all">All Origins</option>
              {origins.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
            <select
              value={destFilter}
              onChange={e => setDestFilter(e.target.value)}
              className="bg-[#121722] border border-[#1e2535] text-[#8a9bb0] text-xs px-3 py-2 focus:outline-none focus:border-[#C6A86B]"
              style={{ fontFamily: 'JetBrains Mono, monospace' }}
            >
              <option value="all">All Destinations</option>
              {destinations.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
            <span className="text-[10px] text-[#6b7a8d] self-center" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
              {filtered.length} corridors
            </span>
          </div>

          {/* Main table */}
          <div className="bg-[#121722] border border-[#1e2535] overflow-x-auto">
            <table className="w-full text-xs min-w-[700px]">
              <thead>
                <tr className="border-b border-[#1e2535]">
                  <th className="text-left px-4 py-3 text-[#4C6A92] font-medium text-[10px] uppercase tracking-wider" style={{ fontFamily: 'Manrope' }}>Origin</th>
                  <th className="text-left px-4 py-3 text-[#4C6A92] font-medium text-[10px] uppercase tracking-wider" style={{ fontFamily: 'Manrope' }}>Destination</th>
                  <th className="text-left px-4 py-3 text-[#4C6A92] font-medium text-[10px] uppercase tracking-wider" style={{ fontFamily: 'Manrope' }}>Commodity</th>
                  <th className="text-right px-4 py-3 text-[#4C6A92] font-medium text-[10px] uppercase tracking-wider" style={{ fontFamily: 'Manrope' }}>Volume</th>
                  <th className="text-right px-4 py-3 text-[#4C6A92] font-medium text-[10px] uppercase tracking-wider" style={{ fontFamily: 'Manrope' }}>Value</th>
                  <th className="text-right px-4 py-3 text-[#4C6A92] font-medium text-[10px] uppercase tracking-wider" style={{ fontFamily: 'Manrope' }}>Trend</th>
                </tr>
              </thead>
              <tbody>
                {filtered.slice(0, 100).map((f, i) => (
                  <tr key={i} className="border-b border-[#1e2535]/40 hover:bg-[#1a2030] transition-colors">
                    <td className="px-4 py-3 font-medium text-[#e0e6ed]">{f.origin_country}</td>
                    <td className="px-4 py-3 text-[#8a9bb0]">{f.destination_country}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: COMMODITY_COLOR[f.commodity_category] || '#6b7a8d' }} />
                        <span className="text-[#8a9bb0]">{f.commodity}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right text-[#8a9bb0]" style={{ fontFamily: 'JetBrains Mono, monospace' }}>{formatVolume(f.total_volume_mt)}</td>
                    <td className="px-4 py-3 text-right font-medium text-[#e0e6ed]" style={{ fontFamily: 'JetBrains Mono, monospace' }}>{formatValue(f.total_value_usd)}</td>
                    <td className="px-4 py-3 text-right"><TrendBadge trend={f.trend} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
