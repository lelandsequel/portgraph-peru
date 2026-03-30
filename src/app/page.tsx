'use client';

import { useState, useEffect } from 'react';

interface GlobalStats {
  commodities: { category: string; commodity: string; shipment_count: number; total_value_usd: number }[];
  corridors: { country: string; region: string; commodities: string[]; flow_count: number; value_usd: number }[];
  regions: { name: string; countries: number; flow_count: number; value_usd: number }[];
}

const CORRIDORS_DISPLAY = [
  { from: 'Chile', to: 'China', commodity: 'Copper', icon: 'bolt' },
  { from: 'Australia', to: 'China', commodity: 'Iron Ore', icon: 'landscape' },
  { from: 'Brazil', to: 'China', commodity: 'Soy', icon: 'grass' },
  { from: 'Indonesia', to: 'India', commodity: 'Coal', icon: 'local_fire_department' },
  { from: 'DRC', to: 'China', commodity: 'Cobalt', icon: 'science' },
  { from: 'South Africa', to: 'India', commodity: 'Coal', icon: 'local_fire_department' },
  { from: 'Peru', to: 'China', commodity: 'Copper', icon: 'bolt' },
  { from: 'Canada', to: 'India', commodity: 'Potash', icon: 'grain' },
  { from: 'Russia', to: 'China', commodity: 'Wheat', icon: 'agriculture' },
  { from: 'Guinea', to: 'China', commodity: 'Bauxite', icon: 'terrain' },
];

const NAV_SECTIONS = [
  { href: '/terminal', icon: 'terminal', label: 'Terminal', desc: 'Query intelligence profiles' },
  { href: '/feed', icon: 'directions_boat', label: 'Vessels', desc: 'Live vessel activity feed' },
  { href: '/global', icon: 'public', label: 'Global Command', desc: 'Commodity deep-dives' },
  { href: '/flows', icon: 'swap_calls', label: 'Flows', desc: 'Bilateral trade corridors' },
  { href: '/signals', icon: 'notifications_active', label: 'Signals', desc: 'Automated trade alerts' },
  { href: '/demand', icon: 'trending_up', label: 'Demand', desc: 'Importer intelligence' },
  { href: '/map', icon: 'map', label: 'Route Map', desc: 'Port-to-destination routes' },
];

function formatValue(usd: number): string {
  if (usd >= 1e9) return `$${(usd / 1e9).toFixed(1)}B`;
  if (usd >= 1e6) return `$${(usd / 1e6).toFixed(0)}M`;
  return `$${(usd / 1e3).toFixed(0)}K`;
}

export default function LandingPage() {
  const [stats, setStats] = useState<GlobalStats | null>(null);

  useEffect(() => {
    fetch('/api/global')
      .then(r => r.ok ? r.json() : null)
      .then(d => d && setStats(d))
      .catch(() => {});
  }, []);

  const countryCount = stats ? new Set(stats.corridors.map(c => c.country)).size : 0;
  const commodityCount = stats?.commodities.length || 0;
  const totalFlows = stats?.commodities.reduce((s, c) => s + c.shipment_count, 0) || 0;
  const totalValue = stats?.commodities.reduce((s, c) => s + c.total_value_usd, 0) || 0;

  return (
    <div className="p-4 sm:p-8 max-w-6xl mx-auto">
      {/* Hero */}
      <div className="py-8 sm:py-14">
        <h1 className="text-3xl sm:text-5xl font-thin tracking-wide text-[#C6A86B] mb-3" style={{ fontFamily: 'Sora, Manrope' }}>
          NAUTILUS
        </h1>
        <p className="text-lg sm:text-xl text-[#8a9bb0] font-light mb-1" style={{ fontFamily: 'Manrope' }}>
          Global Commodity Intelligence
        </p>
        <p className="text-sm text-[#6b7a8d] max-w-2xl leading-relaxed">
          Real-time tracking of bulk commodity movements across every major corridor.
          Confidence-scored intelligence from UN Comtrade, IMF PortWatch, and VesselFinder.
        </p>
      </div>

      {/* Live stats bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-px bg-[#1e2535] mb-10">
        <StatCell label="Countries" value={countryCount > 0 ? String(countryCount) : '—'} />
        <StatCell label="Commodities" value={commodityCount > 0 ? String(commodityCount) : '—'} />
        <StatCell label="Trade Flows" value={totalFlows > 0 ? totalFlows.toLocaleString() : '—'} />
        <StatCell label="Total Value" value={totalValue > 0 ? formatValue(totalValue) : '—'} />
      </div>

      {/* Quick navigation */}
      <div className="mb-10">
        <h2 className="text-xs font-semibold text-[#4C6A92] uppercase tracking-[0.15em] mb-4" style={{ fontFamily: 'Manrope' }}>
          Navigate
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-px bg-[#1e2535]">
          {NAV_SECTIONS.map(s => (
            <a
              key={s.href}
              href={s.href}
              className="bg-[#121722] p-4 hover:bg-[#1a2030] transition-colors group"
            >
              <div className="flex items-center gap-3 mb-1.5">
                <span className="material-symbols-outlined text-[#4C6A92] group-hover:text-[#C6A86B] transition-colors" style={{ fontSize: '18px' }}>{s.icon}</span>
                <span className="text-sm font-medium text-[#e0e6ed]" style={{ fontFamily: 'Manrope' }}>{s.label}</span>
              </div>
              <p className="text-[11px] text-[#6b7a8d]">{s.desc}</p>
            </a>
          ))}
        </div>
      </div>

      {/* What NAUTILUS tracks */}
      <div className="mb-10">
        <h2 className="text-xs font-semibold text-[#4C6A92] uppercase tracking-[0.15em] mb-4" style={{ fontFamily: 'Manrope' }}>
          Active Corridors
        </h2>
        <div className="bg-[#121722] border border-[#1e2535] overflow-x-auto">
          <table className="w-full text-sm min-w-[500px]">
            <thead>
              <tr className="border-b border-[#1e2535]">
                <th className="text-left px-4 py-2.5 text-[9px] text-[#6b7a8d] uppercase tracking-wider font-medium" style={{ fontFamily: 'Manrope' }}>Commodity</th>
                <th className="text-left px-4 py-2.5 text-[9px] text-[#6b7a8d] uppercase tracking-wider font-medium" style={{ fontFamily: 'Manrope' }}>Origin</th>
                <th className="text-center px-4 py-2.5 text-[9px] text-[#6b7a8d] uppercase tracking-wider font-medium" style={{ fontFamily: 'Manrope' }}></th>
                <th className="text-left px-4 py-2.5 text-[9px] text-[#6b7a8d] uppercase tracking-wider font-medium" style={{ fontFamily: 'Manrope' }}>Destination</th>
              </tr>
            </thead>
            <tbody>
              {CORRIDORS_DISPLAY.map((c, i) => (
                <tr key={i} className="border-b border-[#1e2535]/50 hover:bg-[#1a2030] transition-colors">
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-[#4C6A92]" style={{ fontSize: '14px' }}>{c.icon}</span>
                      <span className="text-[#e0e6ed] text-xs" style={{ fontFamily: 'Manrope' }}>{c.commodity}</span>
                    </div>
                  </td>
                  <td className="px-4 py-2.5 text-xs text-[#8a9bb0]" style={{ fontFamily: 'JetBrains Mono, monospace' }}>{c.from}</td>
                  <td className="px-4 py-2.5 text-center text-[#4C6A92] text-xs">→</td>
                  <td className="px-4 py-2.5 text-xs text-[#C6A86B]" style={{ fontFamily: 'JetBrains Mono, monospace' }}>{c.to}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Data sources */}
      <div className="border-t border-[#1e2535] pt-6 pb-4">
        <div className="flex flex-wrap gap-6 text-[10px] text-[#6b7a8d]" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
          <span>UN Comtrade bilateral trade</span>
          <span>IMF PortWatch satellite AIS</span>
          <span>VesselFinder vessel registry</span>
          <span>HS code classification</span>
        </div>
      </div>
    </div>
  );
}

function StatCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-[#121722] p-4">
      <p className="text-[9px] text-[#6b7a8d] uppercase tracking-wider mb-1" style={{ fontFamily: 'Manrope' }}>{label}</p>
      <p className="text-xl font-semibold text-[#e0e6ed]" style={{ fontFamily: 'JetBrains Mono, monospace' }}>{value}</p>
    </div>
  );
}
