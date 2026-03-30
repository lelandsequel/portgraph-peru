'use client';

import { useState, useEffect } from 'react';

const COMMODITY_STYLE: Record<string, { color: string; bg: string; icon: string }> = {
  copper_ore:     { color: '#f59e0b', bg: 'rgba(245,158,11,0.15)', icon: 'bolt' },
  refined_copper: { color: '#f59e0b', bg: 'rgba(245,158,11,0.15)', icon: 'bolt' },
  copper_matte:   { color: '#f59e0b', bg: 'rgba(245,158,11,0.15)', icon: 'bolt' },
  iron_ore:       { color: '#ef4444', bg: 'rgba(239,68,68,0.15)',  icon: 'landscape' },
  coal:           { color: '#6b7280', bg: 'rgba(107,114,128,0.15)',icon: 'local_fire_department' },
  soy:            { color: '#22c55e', bg: 'rgba(34,197,94,0.15)',  icon: 'grass' },
  nickel_ore:     { color: '#8b5cf6', bg: 'rgba(139,92,246,0.15)', icon: 'diamond' },
  cobalt:         { color: '#3b82f6', bg: 'rgba(59,130,246,0.15)', icon: 'science' },
  zinc_ore:       { color: '#a855f7', bg: 'rgba(168,85,247,0.15)', icon: 'hexagon' },
  lead_ore:       { color: '#64748b', bg: 'rgba(100,116,139,0.15)',icon: 'weight' },
  platinum:       { color: '#e2e8f0', bg: 'rgba(226,232,240,0.1)', icon: 'star' },
  potash:         { color: '#f97316', bg: 'rgba(249,115,22,0.15)', icon: 'grain' },
  wheat:          { color: '#eab308', bg: 'rgba(234,179,8,0.15)',  icon: 'agriculture' },
  corn:           { color: '#84cc16', bg: 'rgba(132,204,22,0.15)', icon: 'eco' },
  fertilizer:     { color: '#14b8a6', bg: 'rgba(20,184,166,0.15)',icon: 'spa' },
  uranium:        { color: '#facc15', bg: 'rgba(250,204,21,0.15)',icon: 'radio_button_checked' },
  bauxite:        { color: '#dc2626', bg: 'rgba(220,38,38,0.15)', icon: 'terrain' },
  lng:            { color: '#06b6d4', bg: 'rgba(6,182,212,0.15)',  icon: 'local_gas_station' },
  lithium_carbonate: { color: '#10b981', bg: 'rgba(16,185,129,0.15)', icon: 'battery_charging_full' },
  lithium_ore:    { color: '#059669', bg: 'rgba(5,150,105,0.15)',  icon: 'battery_charging_full' },
  rare_earths:    { color: '#d946ef', bg: 'rgba(217,70,239,0.15)', icon: 'auto_awesome' },
  crude_oil:      { color: '#1e293b', bg: 'rgba(30,41,59,0.2)',    icon: 'oil_barrel' },
  alumina:        { color: '#f43f5e', bg: 'rgba(244,63,94,0.15)',  icon: 'factory' },
  chromium:       { color: '#7c3aed', bg: 'rgba(124,58,237,0.15)', icon: 'shield' },
  manganese:      { color: '#be185d', bg: 'rgba(190,24,93,0.15)',  icon: 'workspaces' },
  phosphate:      { color: '#0d9488', bg: 'rgba(13,148,136,0.15)', icon: 'compost' },
};

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
  if (total === 0) return <span className="text-[#2a3545]">--</span>;
  const ratio = recent / total;
  if (ratio > 0.4) return <span className="text-emerald-400 font-semibold">&#9650;</span>;
  if (ratio > 0.15) return <span className="text-amber-400 font-semibold">&#9654;</span>;
  return <span className="text-red-400 font-semibold">&#9660;</span>;
}

export default function GlobalPage() {
  const [commodities, setCommodities] = useState<CommodityData[]>([]);
  const [corridors, setCorridors] = useState<CorridorData[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<string | null>(null);
  const [lastUpdated] = useState(() => new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }));

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/api/global');
        if (res.ok) {
          const data = await res.json();
          setCommodities(data.commodities || []);
          setCorridors(data.corridors || []);
          if (data.commodities?.length > 0) {
            setSelected(data.commodities[0].category);
          }
        }
      } catch (err) {
        console.error('Failed to load global data:', err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const selectedCommodity = commodities.find(c => c.category === selected);

  // Build per-commodity corridor data
  const selectedCorridors = corridors.filter(c =>
    c.commodities.some(cm => cm.toLowerCase().includes((selectedCommodity?.commodity || '').toLowerCase().split(' ')[0]))
  );

  // Simulated alerts for selected commodity
  const alerts = selectedCommodity ? [
    { text: `${selectedCommodity.recent_count} shipments in last 30 days`, type: 'info' as const },
    { text: `Top destination: ${selectedCommodity.top_destination}`, type: 'info' as const },
    ...(selectedCommodity.recent_count > selectedCommodity.shipment_count * 0.3
      ? [{ text: 'Above-average activity detected', type: 'warn' as const }]
      : []),
    { text: `Primary exporter: ${selectedCommodity.top_exporter}`, type: 'info' as const },
  ] : [];

  return (
    <div className="h-[calc(100vh-6rem)] flex flex-col">
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 sm:px-6 py-3 border-b border-[#1e2535] shrink-0">
        <div className="flex items-center gap-3">
          <h1 className="text-base font-thin tracking-wide text-[#C6A86B]" style={{ fontFamily: 'Sora, Manrope' }}>
            Global Command Center
          </h1>
          <span className="text-[9px] text-[#6b7a8d] bg-[#121722] px-2 py-0.5 border border-[#1e2535]" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
            {commodities.length} commodities
          </span>
        </div>
        <span className="text-[10px] text-[#6b7a8d]" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
          Updated {lastUpdated}
        </span>
      </div>

      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-[#4C6A92]/30 border-t-[#4C6A92] rounded-full animate-spin" />
        </div>
      ) : (
        <div className="flex-1 flex min-h-0 overflow-hidden">
          {/* LEFT PANEL — Commodity selector */}
          <div className="w-56 lg:w-60 shrink-0 border-r border-[#1e2535] overflow-y-auto hidden sm:block" style={{ scrollbarWidth: 'none' }}>
            <div className="py-2">
              {commodities.map(c => {
                const style = COMMODITY_STYLE[c.category] || { color: '#6b7a8d', bg: 'rgba(107,122,141,0.1)', icon: 'category' };
                const isActive = selected === c.category;
                return (
                  <button
                    key={c.category}
                    onClick={() => setSelected(c.category)}
                    className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors relative ${
                      isActive ? 'bg-[#1a2030]' : 'hover:bg-[#121722]'
                    }`}
                  >
                    {isActive && <div className="absolute left-0 top-1 bottom-1 w-[2px] bg-[#C6A86B]" />}
                    <div className="w-7 h-7 flex items-center justify-center shrink-0" style={{ backgroundColor: style.bg }}>
                      <span className="material-symbols-outlined" style={{ color: style.color, fontSize: '14px' }}>{style.icon}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-xs font-medium truncate ${isActive ? 'text-[#e0e6ed]' : 'text-[#8a9bb0]'}`} style={{ fontFamily: 'Manrope' }}>
                        {c.commodity}
                      </p>
                      <p className="text-[9px] text-[#6b7a8d]">{formatValue(c.total_value_usd)}</p>
                    </div>
                    <span className="text-[10px] text-[#6b7a8d] bg-[#1a2030] px-1.5 py-0.5 shrink-0" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
                      {c.shipment_count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Mobile commodity selector */}
          <div className="sm:hidden border-b border-[#1e2535] p-3 shrink-0 overflow-x-auto flex gap-2">
            {commodities.map(c => (
              <button
                key={c.category}
                onClick={() => setSelected(c.category)}
                className={`px-3 py-1.5 text-xs whitespace-nowrap shrink-0 ${
                  selected === c.category ? 'bg-[#C6A86B] text-[#0B0E13]' : 'bg-[#121722] text-[#8a9bb0] border border-[#1e2535]'
                }`}
              >
                {c.commodity}
              </button>
            ))}
          </div>

          {/* CENTER — Commodity deep-dive */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 min-w-0">
            {selectedCommodity ? (
              <>
                {/* Header */}
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 flex items-center justify-center" style={{ backgroundColor: (COMMODITY_STYLE[selectedCommodity.category] || { bg: '#1a2030' }).bg }}>
                    <span className="material-symbols-outlined" style={{ color: (COMMODITY_STYLE[selectedCommodity.category] || { color: '#6b7a8d' }).color, fontSize: '22px' }}>
                      {(COMMODITY_STYLE[selectedCommodity.category] || { icon: 'category' }).icon}
                    </span>
                  </div>
                  <div>
                    <h2 className="text-lg font-medium text-[#e0e6ed]" style={{ fontFamily: 'Manrope' }}>{selectedCommodity.commodity}</h2>
                    <p className="text-[10px] text-[#6b7a8d] uppercase tracking-wider">{selectedCommodity.category.replace(/_/g, ' ')}</p>
                  </div>
                </div>

                {/* Stats row */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-px bg-[#1e2535] mb-6">
                  <div className="bg-[#121722] p-3">
                    <p className="text-[9px] text-[#6b7a8d] uppercase tracking-wider mb-1" style={{ fontFamily: 'Manrope' }}>Value</p>
                    <p className="text-lg font-semibold text-[#e0e6ed]" style={{ fontFamily: 'JetBrains Mono, monospace' }}>{formatValue(selectedCommodity.total_value_usd)}</p>
                  </div>
                  <div className="bg-[#121722] p-3">
                    <p className="text-[9px] text-[#6b7a8d] uppercase tracking-wider mb-1" style={{ fontFamily: 'Manrope' }}>Volume</p>
                    <p className="text-lg font-semibold text-[#e0e6ed]" style={{ fontFamily: 'JetBrains Mono, monospace' }}>{formatWeight(selectedCommodity.total_weight_kg)}</p>
                  </div>
                  <div className="bg-[#121722] p-3">
                    <p className="text-[9px] text-[#6b7a8d] uppercase tracking-wider mb-1" style={{ fontFamily: 'Manrope' }}>Shipments</p>
                    <p className="text-lg font-semibold text-[#e0e6ed]" style={{ fontFamily: 'JetBrains Mono, monospace' }}>{selectedCommodity.shipment_count}</p>
                  </div>
                  <div className="bg-[#121722] p-3">
                    <p className="text-[9px] text-[#6b7a8d] uppercase tracking-wider mb-1" style={{ fontFamily: 'Manrope' }}>30d Trend</p>
                    <div className="flex items-center gap-2 mt-1">
                      <TrendArrow recent={selectedCommodity.recent_count} total={selectedCommodity.shipment_count} />
                      <span className="text-sm text-[#8a9bb0]" style={{ fontFamily: 'JetBrains Mono, monospace' }}>{selectedCommodity.recent_count}</span>
                    </div>
                  </div>
                </div>

                {/* Exporters */}
                <div className="mb-6">
                  <h3 className="text-[9px] text-[#4C6A92] uppercase tracking-[0.15em] font-semibold mb-3" style={{ fontFamily: 'Manrope' }}>
                    Top Exporters
                  </h3>
                  <div className="bg-[#121722] border border-[#1e2535]">
                    <div className="px-4 py-2.5 border-b border-[#1e2535] flex">
                      <span className="text-[9px] text-[#6b7a8d] uppercase tracking-wider flex-1" style={{ fontFamily: 'Manrope' }}>Country</span>
                      <span className="text-[9px] text-[#6b7a8d] uppercase tracking-wider w-24 text-right" style={{ fontFamily: 'Manrope' }}>Value</span>
                      <span className="text-[9px] text-[#6b7a8d] uppercase tracking-wider w-16 text-right" style={{ fontFamily: 'Manrope' }}>Flows</span>
                    </div>
                    {selectedCorridors.length > 0 ? selectedCorridors.slice(0, 8).map((c, i) => (
                      <div key={i} className="px-4 py-2.5 flex items-center border-b border-[#1e2535]/30 hover:bg-[#1a2030] transition-colors">
                        <span className="text-xs text-[#e0e6ed] flex-1" style={{ fontFamily: 'Manrope' }}>{c.country}</span>
                        <span className="text-xs text-[#8a9bb0] w-24 text-right" style={{ fontFamily: 'JetBrains Mono, monospace' }}>{formatValue(c.value_usd)}</span>
                        <span className="text-xs text-[#6b7a8d] w-16 text-right" style={{ fontFamily: 'JetBrains Mono, monospace' }}>{c.flow_count}</span>
                      </div>
                    )) : (
                      <div className="px-4 py-3 text-xs text-[#6b7a8d]">
                        Primary exporter: {selectedCommodity.top_exporter}
                      </div>
                    )}
                  </div>
                </div>

                {/* Top importer */}
                <div className="mb-6">
                  <h3 className="text-[9px] text-[#4C6A92] uppercase tracking-[0.15em] font-semibold mb-3" style={{ fontFamily: 'Manrope' }}>
                    Top Destination
                  </h3>
                  <div className="bg-[#121722] border border-[#1e2535] px-4 py-3">
                    <div className="flex items-center gap-3">
                      <span className="text-[#C6A86B] text-sm" style={{ fontFamily: 'JetBrains Mono, monospace' }}>{selectedCommodity.top_destination}</span>
                      <span className="text-[10px] text-[#6b7a8d]">primary importer</span>
                    </div>
                  </div>
                </div>

                {/* Regions active */}
                {selectedCommodity.regions.length > 0 && (
                  <div>
                    <h3 className="text-[9px] text-[#4C6A92] uppercase tracking-[0.15em] font-semibold mb-3" style={{ fontFamily: 'Manrope' }}>
                      Active Regions
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {selectedCommodity.regions.map(r => (
                        <span key={r} className="text-[10px] px-3 py-1 bg-[#121722] border border-[#1e2535] text-[#8a9bb0]">{r}</span>
                      ))}
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="flex items-center justify-center h-full text-[#6b7a8d] text-sm">
                Select a commodity to view details
              </div>
            )}
          </div>

          {/* RIGHT PANEL — Alerts */}
          <div className="w-48 lg:w-52 shrink-0 border-l border-[#1e2535] overflow-y-auto hidden lg:block" style={{ scrollbarWidth: 'none' }}>
            <div className="p-3 border-b border-[#1e2535]">
              <p className="text-[9px] text-[#4C6A92] uppercase tracking-[0.15em] font-semibold" style={{ fontFamily: 'Manrope' }}>Alerts</p>
            </div>
            <div className="p-2 space-y-2">
              {alerts.map((a, i) => (
                <div key={i} className={`p-2.5 text-[11px] leading-relaxed border-l-2 ${
                  a.type === 'warn' ? 'border-l-amber-500 bg-amber-500/5 text-amber-300' : 'border-l-[#4C6A92] bg-[#121722] text-[#8a9bb0]'
                }`}>
                  {a.text}
                </div>
              ))}
              {selectedCommodity && (
                <div className="p-2.5 text-[10px] text-[#6b7a8d] border-t border-[#1e2535] mt-4">
                  <p style={{ fontFamily: 'JetBrains Mono, monospace' }}>Regions: {selectedCommodity.regions.join(', ')}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
