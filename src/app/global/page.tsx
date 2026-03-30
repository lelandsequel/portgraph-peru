'use client';

import { useState, useEffect } from 'react';

const COMMODITY_STYLE: Record<string, { color: string; bg: string; icon: string }> = {
  copper_ore:     { color: '#f59e0b', bg: 'rgba(245,158,11,0.1)',  icon: 'bolt' },
  refined_copper: { color: '#f59e0b', bg: 'rgba(245,158,11,0.1)',  icon: 'bolt' },
  copper_matte:   { color: '#f59e0b', bg: 'rgba(245,158,11,0.1)',  icon: 'bolt' },
  iron_ore:       { color: '#ef4444', bg: 'rgba(239,68,68,0.1)',   icon: 'landscape' },
  coal:           { color: '#6b7280', bg: 'rgba(107,114,128,0.1)', icon: 'local_fire_department' },
  soy:            { color: '#22c55e', bg: 'rgba(34,197,94,0.1)',   icon: 'grass' },
  nickel_ore:     { color: '#8b5cf6', bg: 'rgba(139,92,246,0.1)',  icon: 'diamond' },
  cobalt:         { color: '#3b82f6', bg: 'rgba(59,130,246,0.1)',  icon: 'science' },
  zinc_ore:       { color: '#a855f7', bg: 'rgba(168,85,247,0.1)',  icon: 'hexagon' },
  lead_ore:       { color: '#64748b', bg: 'rgba(100,116,139,0.1)', icon: 'weight' },
  platinum:       { color: '#e2e8f0', bg: 'rgba(226,232,240,0.1)', icon: 'star' },
};

const REGION_FILTERS = [
  { label: 'All Regions', value: 'all' },
  { label: 'Americas', value: 'South America' },
  { label: 'Asia-Pacific', value: 'Asia-Pacific' },
  { label: 'Africa', value: 'Africa' },
  { label: 'Oceania', value: 'Oceania' },
];

interface CommodityData {
  category: string;
  commodity: string;
  total_weight_kg: number;
  total_value_usd: number;
  shipment_count: number;
  top_exporter: string;
  top_destination: string;
  regions: string[];
  recent_count: number;
}

interface CorridorData {
  country: string;
  region: string;
  commodities: string[];
  flow_count: number;
  value_usd: number;
}

interface RegionData {
  name: string;
  countries: number;
  flow_count: number;
  value_usd: number;
}

function formatValue(usd: number): string {
  if (usd >= 1e9) return `$${(usd / 1e9).toFixed(1)}B`;
  if (usd >= 1e6) return `$${(usd / 1e6).toFixed(0)}M`;
  if (usd >= 1e3) return `$${(usd / 1e3).toFixed(0)}K`;
  return `$${usd.toFixed(0)}`;
}

function formatWeight(kg: number): string {
  if (kg >= 1e9) return `${(kg / 1e9).toFixed(1)}Mt`;
  if (kg >= 1e6) return `${(kg / 1e6).toFixed(1)}kt`;
  if (kg >= 1e3) return `${(kg / 1e3).toFixed(1)}t`;
  return `${kg.toFixed(0)}kg`;
}

function TrendArrow({ recent, total }: { recent: number; total: number }) {
  if (total === 0) return <span className="text-[#c2c7ce]">--</span>;
  const ratio = recent / total;
  if (ratio > 0.4) return <span className="text-emerald-500 font-semibold">&#9650;</span>;
  if (ratio > 0.15) return <span className="text-amber-500 font-semibold">&#9654;</span>;
  return <span className="text-red-400 font-semibold">&#9660;</span>;
}

export default function GlobalPage() {
  const [commodities, setCommodities] = useState<CommodityData[]>([]);
  const [corridors, setCorridors] = useState<CorridorData[]>([]);
  const [regions, setRegions] = useState<RegionData[]>([]);
  const [loading, setLoading] = useState(true);
  const [regionFilter, setRegionFilter] = useState('all');

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/api/global');
        if (res.ok) {
          const data = await res.json();
          setCommodities(data.commodities || []);
          setCorridors(data.corridors || []);
          setRegions(data.regions || []);
        }
      } catch (err) {
        console.error('Failed to load global data:', err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const filteredCommodities = regionFilter === 'all'
    ? commodities
    : commodities.filter(c => c.regions.includes(regionFilter));

  const filteredCorridors = regionFilter === 'all'
    ? corridors
    : corridors.filter(c => c.region === regionFilter);

  const filteredRegions = regionFilter === 'all'
    ? regions
    : regions.filter(r => r.name === regionFilter);

  const totalValue = filteredCommodities.reduce((s, c) => s + c.total_value_usd, 0);
  const totalFlows = filteredCommodities.reduce((s, c) => s + c.shipment_count, 0);
  const totalCountries = new Set(filteredCorridors.map(c => c.country)).size;

  return (
    <div className="p-4 sm:p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6">
        <div>
          <h1 className="text-xl sm:text-3xl font-thin tracking-wide text-[#00263f] mb-1" style={{ fontFamily: 'Sora, Manrope' }}>
            Global Command Center
          </h1>
          <p className="text-[#72777e] text-sm">
            Bulk commodity movement across every major corridor. PortWatch + VesselFinder + UN Comtrade.
          </p>
        </div>

        {/* Region filter bar */}
        <div className="flex items-center gap-1 bg-white rounded-full p-1 shadow-sm">
          {REGION_FILTERS.map(rf => (
            <button
              key={rf.value}
              onClick={() => setRegionFilter(rf.value)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors min-h-[32px] ${
                regionFilter === rf.value
                  ? 'bg-[#00263f] text-white'
                  : 'text-[#72777e] hover:text-[#00263f] hover:bg-[#f1f4f6]'
              }`}
              style={{ fontFamily: 'Manrope' }}
            >
              {rf.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-2 border-[#006a62]/30 border-t-[#006a62] rounded-full animate-spin" />
        </div>
      ) : (
        <>
          {/* Summary stat bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
            <StatCard label="Total Value" value={formatValue(totalValue)} />
            <StatCard label="Trade Flows" value={totalFlows.toLocaleString()} />
            <StatCard label="Countries" value={String(totalCountries)} />
            <StatCard label="Commodities" value={String(filteredCommodities.length)} />
          </div>

          {/* Region cards */}
          {filteredRegions.length > 0 && (
            <div className="mb-8">
              <h2 className="text-sm font-semibold text-[#00263f] uppercase tracking-widest mb-3" style={{ fontFamily: 'Manrope' }}>
                Regions
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {filteredRegions.map(r => (
                  <div key={r.name} className="bg-white rounded-xl p-4 shadow-[0_1px_3px_rgba(24,28,30,0.06)]">
                    <p className="text-xs text-[#72777e] uppercase tracking-wider" style={{ fontFamily: 'Manrope' }}>{r.name}</p>
                    <p className="text-lg font-semibold text-[#00263f] mt-1" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
                      {formatValue(r.value_usd)}
                    </p>
                    <p className="text-[10px] text-[#72777e] mt-0.5">
                      {r.countries} countries &middot; {r.flow_count} flows
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Commodity grid */}
          <div className="mb-8">
            <h2 className="text-sm font-semibold text-[#00263f] uppercase tracking-widest mb-3" style={{ fontFamily: 'Manrope' }}>
              Commodities
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {filteredCommodities.map(c => {
                const style = COMMODITY_STYLE[c.category] || { color: '#72777e', bg: 'rgba(114,119,126,0.1)', icon: 'category' };
                return (
                  <div key={c.category} className="bg-white rounded-xl p-5 shadow-[0_1px_3px_rgba(24,28,30,0.06)] hover:shadow-md transition-shadow">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: style.bg }}>
                        <span className="material-symbols-outlined" style={{ color: style.color, fontSize: '20px' }}>{style.icon}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-[#00263f]" style={{ fontFamily: 'Manrope' }}>{c.commodity}</p>
                        <p className="text-[10px] text-[#72777e] uppercase tracking-wider">{c.category.replace(/_/g, ' ')}</p>
                      </div>
                      <div className="text-right">
                        <TrendArrow recent={c.recent_count} total={c.shipment_count} />
                        <p className="text-[9px] text-[#c2c7ce] mt-0.5">30d</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
                      <div>
                        <p className="text-[#72777e]">Value</p>
                        <p className="font-semibold text-[#00263f]" style={{ fontFamily: 'JetBrains Mono, monospace' }}>{formatValue(c.total_value_usd)}</p>
                      </div>
                      <div>
                        <p className="text-[#72777e]">Volume</p>
                        <p className="font-semibold text-[#00263f]" style={{ fontFamily: 'JetBrains Mono, monospace' }}>{formatWeight(c.total_weight_kg)}</p>
                      </div>
                      <div>
                        <p className="text-[#72777e]">Top Exporter</p>
                        <p className="font-medium text-[#42474e]">{c.top_exporter}</p>
                      </div>
                      <div>
                        <p className="text-[#72777e]">Top Destination</p>
                        <p className="font-medium text-[#006a62]">{c.top_destination}</p>
                      </div>
                      <div>
                        <p className="text-[#72777e]">Flows</p>
                        <p className="font-semibold text-[#00263f]" style={{ fontFamily: 'JetBrains Mono, monospace' }}>{c.shipment_count}</p>
                      </div>
                      <div>
                        <p className="text-[#72777e]">30d Activity</p>
                        <p className="font-semibold text-[#00263f]" style={{ fontFamily: 'JetBrains Mono, monospace' }}>{c.recent_count}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Country corridors table */}
          <div>
            <h2 className="text-sm font-semibold text-[#00263f] uppercase tracking-widest mb-3" style={{ fontFamily: 'Manrope' }}>
              Country Corridors
            </h2>
            <div className="bg-white rounded-xl shadow-[0_1px_3px_rgba(24,28,30,0.06)] overflow-x-auto">
              <table className="w-full text-sm min-w-[640px]">
                <thead>
                  <tr className="border-b border-[#e5e9eb]">
                    <th className="text-left px-4 py-3 text-[#72777e] font-medium text-xs uppercase tracking-wider" style={{ fontFamily: 'Manrope' }}>Country</th>
                    <th className="text-left px-4 py-3 text-[#72777e] font-medium text-xs uppercase tracking-wider" style={{ fontFamily: 'Manrope' }}>Region</th>
                    <th className="text-left px-4 py-3 text-[#72777e] font-medium text-xs uppercase tracking-wider" style={{ fontFamily: 'Manrope' }}>Commodities</th>
                    <th className="text-right px-4 py-3 text-[#72777e] font-medium text-xs uppercase tracking-wider" style={{ fontFamily: 'Manrope' }}>Value</th>
                    <th className="text-right px-4 py-3 text-[#72777e] font-medium text-xs uppercase tracking-wider" style={{ fontFamily: 'Manrope' }}>Flows</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredCorridors.map((c, i) => (
                    <tr key={i} className="border-b border-[#f1f4f6] hover:bg-[#f7fafc] transition-colors">
                      <td className="px-4 py-3 font-semibold text-[#00263f]">{c.country}</td>
                      <td className="px-4 py-3 text-[#72777e]">{c.region}</td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1 flex-wrap">
                          {c.commodities.slice(0, 4).map((cm, j) => (
                            <span key={j} className="text-[10px] bg-[#f1f4f6] text-[#42474e] px-2 py-0.5 rounded-full">{cm}</span>
                          ))}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-[#00263f]" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
                        {formatValue(c.value_usd)}
                      </td>
                      <td className="px-4 py-3 text-right" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
                        {c.flow_count}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white rounded-xl p-4 shadow-[0_1px_3px_rgba(24,28,30,0.06)]">
      <p className="text-[10px] text-[#72777e] uppercase tracking-widest mb-1" style={{ fontFamily: 'Manrope' }}>{label}</p>
      <p className="text-xl font-semibold text-[#00263f]" style={{ fontFamily: 'JetBrains Mono, monospace' }}>{value}</p>
    </div>
  );
}
