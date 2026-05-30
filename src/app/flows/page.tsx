'use client';

import { useEffect, useMemo, useState } from 'react';

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

interface GlobalPayload {
  corridors: CorridorData[];
  regions: RegionData[];
}

function formatValue(usd: number): string {
  if (usd >= 1e9) return `$${(usd / 1e9).toFixed(1)}B`;
  if (usd >= 1e6) return `$${(usd / 1e6).toFixed(0)}M`;
  if (usd >= 1e3) return `$${(usd / 1e3).toFixed(0)}K`;
  return `$${usd.toFixed(0)}`;
}

export default function FlowsPage() {
  const [corridors, setCorridors] = useState<CorridorData[]>([]);
  const [regions, setRegions] = useState<RegionData[]>([]);
  const [regionFilter, setRegionFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch('/api/global');
        if (!res.ok) throw new Error(`Global flow request failed: ${res.status}`);
        const data = await res.json() as GlobalPayload;
        setCorridors(data.corridors || []);
        setRegions(data.regions || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unable to load flow intelligence');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const filtered = useMemo(() => {
    return corridors
      .filter(c => regionFilter === 'all' || c.region === regionFilter)
      .sort((a, b) => b.value_usd - a.value_usd);
  }, [corridors, regionFilter]);

  const totalValue = filtered.reduce((sum, c) => sum + c.value_usd, 0);
  const totalFlows = filtered.reduce((sum, c) => sum + c.flow_count, 0);

  return (
    <div className="p-4 sm:p-8 max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-thin tracking-wide text-[#C6A86B] mb-1" style={{ fontFamily: 'Sora, Manrope' }}>
            Flow Arc Intelligence
          </h1>
          <p className="text-[#6b7a8d] text-sm">
            Bilateral commodity corridors ranked by observed value and flow count.
          </p>
        </div>
        <select
          value={regionFilter}
          onChange={e => setRegionFilter(e.target.value)}
          className="bg-[#121722] border border-[#1e2535] px-3 py-2 text-xs text-[#8a9bb0] focus:outline-none focus:border-[#4C6A92] min-h-[40px]"
        >
          <option value="all">All Regions</option>
          {regions.map(r => (
            <option key={r.name} value={r.name}>{r.name}</option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-px bg-[#1e2535] mb-6">
        <Metric label="Corridors" value={String(filtered.length)} />
        <Metric label="Flows" value={totalFlows.toLocaleString()} />
        <Metric label="Value" value={formatValue(totalValue)} />
        <Metric label="Regions" value={String(regionFilter === 'all' ? regions.length : 1)} />
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-2 border-[#4C6A92]/30 border-t-[#4C6A92] rounded-full animate-spin" />
        </div>
      ) : error ? (
        <div className="bg-red-950/30 border border-red-900/70 text-red-300 px-5 py-4 text-sm">
          {error}
        </div>
      ) : (
        <div className="bg-[#121722] border border-[#1e2535] overflow-x-auto">
          <table className="w-full text-sm min-w-[720px]">
            <thead>
              <tr className="border-b border-[#1e2535]">
                <Header label="Origin" />
                <Header label="Region" />
                <Header label="Commodities" />
                <Header label="Flows" align="right" />
                <Header label="Observed Value" align="right" />
              </tr>
            </thead>
            <tbody>
              {filtered.map((corridor, index) => (
                <tr key={`${corridor.country}-${index}`} className="border-b border-[#1e2535]/40 hover:bg-[#1a2030] transition-colors">
                  <td className="px-4 py-3 text-[#e0e6ed]" style={{ fontFamily: 'Manrope' }}>{corridor.country}</td>
                  <td className="px-4 py-3 text-[#8a9bb0]" style={{ fontFamily: 'JetBrains Mono, monospace' }}>{corridor.region || 'Other'}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {corridor.commodities.slice(0, 5).map(commodity => (
                        <span key={commodity} className="text-[10px] px-2 py-0.5 bg-[#1a2030] border border-[#1e2535] text-[#8a9bb0]">
                          {commodity}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right text-[#8a9bb0]" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
                    {corridor.flow_count.toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-right text-[#C6A86B]" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
                    {formatValue(corridor.value_usd)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-[#121722] p-4">
      <p className="text-[9px] text-[#6b7a8d] uppercase tracking-wider mb-1" style={{ fontFamily: 'Manrope' }}>{label}</p>
      <p className="text-xl font-semibold text-[#e0e6ed]" style={{ fontFamily: 'JetBrains Mono, monospace' }}>{value}</p>
    </div>
  );
}

function Header({ label, align }: { label: string; align?: 'right' }) {
  return (
    <th className={`px-4 py-2.5 text-[9px] text-[#6b7a8d] uppercase tracking-wider font-medium ${align === 'right' ? 'text-right' : 'text-left'}`} style={{ fontFamily: 'Manrope' }}>
      {label}
    </th>
  );
}
