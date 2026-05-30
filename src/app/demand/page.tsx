'use client';

import { useEffect, useMemo, useState } from 'react';
import { TradeFlow } from '@/lib/db/types';

interface ImporterProfile {
  country: string;
  flow_count: number;
  value_usd: number;
  commodities: string[];
  top_origin: string;
  confidence_mix: Record<string, number>;
}

function formatValue(usd: number): string {
  if (usd >= 1e9) return `$${(usd / 1e9).toFixed(1)}B`;
  if (usd >= 1e6) return `$${(usd / 1e6).toFixed(0)}M`;
  if (usd >= 1e3) return `$${(usd / 1e3).toFixed(0)}K`;
  return `$${usd.toFixed(0)}`;
}

export default function DemandPage() {
  const [flows, setFlows] = useState<TradeFlow[]>([]);
  const [commodityFilter, setCommodityFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch('/api/feed');
        if (!res.ok) throw new Error(`Feed request failed: ${res.status}`);
        const data = await res.json();
        setFlows(data.flows || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unable to load demand intelligence');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const commodities = useMemo(() => {
    return Array.from(new Set(flows.map(f => f.commodity).filter(Boolean) as string[])).sort();
  }, [flows]);

  const profiles = useMemo(() => {
    const map = new Map<string, ImporterProfile & { origins: Record<string, number>; commoditySet: Set<string> }>();

    flows.forEach(flow => {
      if (!flow.destination_country) return;
      if (commodityFilter !== 'all' && flow.commodity !== commodityFilter) return;

      const existing = map.get(flow.destination_country) || {
        country: flow.destination_country,
        flow_count: 0,
        value_usd: 0,
        commodities: [],
        commoditySet: new Set<string>(),
        top_origin: '',
        origins: {},
        confidence_mix: {},
      };

      existing.flow_count += 1;
      existing.value_usd += flow.declared_value_usd || 0;
      if (flow.commodity) existing.commoditySet.add(flow.commodity);
      if (flow.origin_country) existing.origins[flow.origin_country] = (existing.origins[flow.origin_country] || 0) + 1;
      if (flow.confidence_tier) existing.confidence_mix[flow.confidence_tier] = (existing.confidence_mix[flow.confidence_tier] || 0) + 1;
      map.set(flow.destination_country, existing);
    });

    return Array.from(map.values()).map(profile => ({
      ...profile,
      commodities: Array.from(profile.commoditySet).sort(),
      top_origin: Object.entries(profile.origins).sort((a, b) => b[1] - a[1])[0]?.[0] || 'Unknown',
    })).sort((a, b) => b.value_usd - a.value_usd);
  }, [flows, commodityFilter]);

  const totalValue = profiles.reduce((sum, profile) => sum + profile.value_usd, 0);
  const totalFlows = profiles.reduce((sum, profile) => sum + profile.flow_count, 0);

  return (
    <div className="p-4 sm:p-8 max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-thin tracking-wide text-[#C6A86B] mb-1" style={{ fontFamily: 'Sora, Manrope' }}>
            Demand Intelligence
          </h1>
          <p className="text-[#6b7a8d] text-sm">
            Importer profiles built from observed destination, value, commodity, and confidence records.
          </p>
        </div>
        <select
          value={commodityFilter}
          onChange={e => setCommodityFilter(e.target.value)}
          className="bg-[#121722] border border-[#1e2535] px-3 py-2 text-xs text-[#8a9bb0] focus:outline-none focus:border-[#4C6A92] min-h-[40px]"
        >
          <option value="all">All Commodities</option>
          {commodities.map(c => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-px bg-[#1e2535] mb-6">
        <Metric label="Importers" value={String(profiles.length)} />
        <Metric label="Flows" value={totalFlows.toLocaleString()} />
        <Metric label="Observed Value" value={formatValue(totalValue)} />
        <Metric label="Commodities" value={String(commodityFilter === 'all' ? commodities.length : 1)} />
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
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-px bg-[#1e2535]">
          {profiles.map(profile => (
            <div key={profile.country} className="bg-[#121722] p-5 hover:bg-[#1a2030] transition-colors min-h-48">
              <div className="flex items-start justify-between gap-3 mb-4">
                <div>
                  <p className="text-sm font-medium text-[#e0e6ed]" style={{ fontFamily: 'Manrope' }}>{profile.country}</p>
                  <p className="text-[10px] text-[#6b7a8d]" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
                    top origin: {profile.top_origin}
                  </p>
                </div>
                <span className="text-[10px] px-2 py-1 bg-[#0B0E13] border border-[#1e2535] text-[#C6A86B]" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
                  {formatValue(profile.value_usd)}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-px bg-[#1e2535] mb-4">
                <SmallMetric label="Flows" value={String(profile.flow_count)} />
                <SmallMetric label="High Conf." value={String(profile.confidence_mix.HIGH || 0)} />
              </div>

              <div className="flex flex-wrap gap-1">
                {profile.commodities.slice(0, 8).map(commodity => (
                  <span key={commodity} className="text-[10px] px-2 py-0.5 bg-[#1a2030] text-[#8a9bb0] border border-[#1e2535]">
                    {commodity}
                  </span>
                ))}
              </div>
            </div>
          ))}
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

function SmallMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-[#0B0E13] p-3">
      <p className="text-[9px] text-[#6b7a8d] uppercase tracking-wider mb-1" style={{ fontFamily: 'Manrope' }}>{label}</p>
      <p className="text-sm text-[#e0e6ed]" style={{ fontFamily: 'JetBrains Mono, monospace' }}>{value}</p>
    </div>
  );
}
