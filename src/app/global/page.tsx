'use client';

import { useState, useEffect, useRef } from 'react';
import { generateCosmicSignals, CosmicAlert, PreviousState } from '@/lib/signals/cosmicSignalEngine';
import { getAllPrices, CommodityPrice } from '@/lib/pricing/prices';

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

const IMPACT_COLOR: Record<string, string> = {
  routine: '#22c55e',
  notable: '#eab308',
  critical: '#ef4444',
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

function ConfidenceBar({ value }: { value: number }) {
  const pct = Math.round(value * 100);
  const color = pct >= 80 ? '#22c55e' : pct >= 55 ? '#eab308' : '#ef4444';
  return (
    <div className="w-full h-[2px] bg-[#1a2030] mt-0.5">
      <div className="h-full" style={{ width: `${pct}%`, backgroundColor: color }} />
    </div>
  );
}

function CriticalTicker({ alerts }: { alerts: CosmicAlert[] }) {
  const critical = alerts.filter(a => a.impact_category === 'critical');
  if (critical.length === 0) return null;

  return (
    <div className="bg-red-900/10 border-b border-red-900/30 overflow-hidden h-6 flex items-center shrink-0">
      <span className="text-[9px] text-red-400 px-2 shrink-0 font-bold uppercase tracking-wider bg-red-900/20">CRITICAL</span>
      <div className="overflow-hidden flex-1">
        <div className="flex gap-8 animate-scroll whitespace-nowrap">
          {critical.map(a => (
            <span key={a.id} className="text-[10px] text-red-300 font-mono">
              [{a.impact_score}] {a.title} — {a.commodity.toUpperCase()}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function GlobalPage() {
  const [commodities, setCommodities] = useState<CommodityData[]>([]);
  const [corridors, setCorridors] = useState<CorridorData[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<string | null>(null);
  const [lastUpdated] = useState(() => new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }));
  const [signals, setSignals] = useState<CosmicAlert[]>([]);
  const [prices] = useState<CommodityPrice[]>(() => getAllPrices());
  const prevStateRef = useRef<PreviousState>(new Map());

  useEffect(() => {
    async function load() {
      try {
        const [globalRes, feedRes] = await Promise.all([
          fetch('/api/global'),
          fetch('/api/feed'),
        ]);
        if (globalRes.ok) {
          const data = await globalRes.json();
          setCommodities(data.commodities || []);
          setCorridors(data.corridors || []);
          if (data.commodities?.length > 0) {
            setSelected(data.commodities[0].category);
          }
        }
        if (feedRes.ok) {
          const feedData = await feedRes.json();
          const flows = feedData.flows || [];
          const { alerts, nextState } = generateCosmicSignals(flows, prevStateRef.current);
          prevStateRef.current = nextState;
          setSignals(alerts);
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
  const selectedCorridors = corridors.filter(c =>
    c.commodities.some(cm => cm.toLowerCase().includes((selectedCommodity?.commodity || '').toLowerCase().split(' ')[0]))
  );
  const topSignals = signals.slice(0, 5);

  return (
    <div className="h-[calc(100vh-6rem)] flex flex-col">
      {/* Critical events ticker */}
      <CriticalTicker alerts={signals} />

      {/* Top bar */}
      <div className="flex items-center justify-between px-4 sm:px-6 py-2 border-b border-[#1e2535] shrink-0">
        <div className="flex items-center gap-3">
          <h1 className="text-base font-thin tracking-wide text-[#C6A86B]" style={{ fontFamily: 'Sora, Manrope' }}>
            Global Command Center
          </h1>
          <span className="text-[9px] text-[#6b7a8d] bg-[#121722] px-2 py-0.5 border border-[#1e2535] font-mono">
            {commodities.length} commodities
          </span>
        </div>
        <div className="flex items-center gap-3">
          {/* Freshness indicators */}
          <div className="hidden sm:flex items-center gap-2">
            {['Comtrade', 'PortWatch', 'VesselFinder'].map(src => (
              <span key={src} className="text-[8px] text-[#6b7a8d] font-mono flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
                {src}
              </span>
            ))}
          </div>
          <span className="text-[10px] text-[#6b7a8d] font-mono">
            {lastUpdated}
          </span>
        </div>
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
                    <span className="text-[10px] text-[#6b7a8d] bg-[#1a2030] px-1.5 py-0.5 shrink-0 font-mono">
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
          <div className="flex-1 overflow-y-auto p-4 sm:p-5 min-w-0">
            {selectedCommodity ? (
              <>
                {/* Header */}
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-9 h-9 flex items-center justify-center" style={{ backgroundColor: (COMMODITY_STYLE[selectedCommodity.category] || { bg: '#1a2030' }).bg }}>
                    <span className="material-symbols-outlined" style={{ color: (COMMODITY_STYLE[selectedCommodity.category] || { color: '#6b7a8d' }).color, fontSize: '20px' }}>
                      {(COMMODITY_STYLE[selectedCommodity.category] || { icon: 'category' }).icon}
                    </span>
                  </div>
                  <div>
                    <h2 className="text-base font-medium text-[#e0e6ed]" style={{ fontFamily: 'Manrope' }}>{selectedCommodity.commodity}</h2>
                    <p className="text-[9px] text-[#6b7a8d] uppercase tracking-wider">{selectedCommodity.category.replace(/_/g, ' ')}</p>
                  </div>
                </div>

                {/* Stats row */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-px bg-[#1e2535] mb-4">
                  <div className="bg-[#121722] p-3">
                    <p className="text-[9px] text-[#6b7a8d] uppercase tracking-wider mb-1" style={{ fontFamily: 'Manrope' }}>Value</p>
                    <p className="text-lg font-semibold text-[#e0e6ed] font-mono">{formatValue(selectedCommodity.total_value_usd)}</p>
                  </div>
                  <div className="bg-[#121722] p-3">
                    <p className="text-[9px] text-[#6b7a8d] uppercase tracking-wider mb-1" style={{ fontFamily: 'Manrope' }}>Volume</p>
                    <p className="text-lg font-semibold text-[#e0e6ed] font-mono">{formatWeight(selectedCommodity.total_weight_kg)}</p>
                  </div>
                  <div className="bg-[#121722] p-3">
                    <p className="text-[9px] text-[#6b7a8d] uppercase tracking-wider mb-1" style={{ fontFamily: 'Manrope' }}>Shipments</p>
                    <p className="text-lg font-semibold text-[#e0e6ed] font-mono">{selectedCommodity.shipment_count}</p>
                  </div>
                  <div className="bg-[#121722] p-3">
                    <p className="text-[9px] text-[#6b7a8d] uppercase tracking-wider mb-1" style={{ fontFamily: 'Manrope' }}>30d Trend</p>
                    <div className="flex items-center gap-2 mt-1">
                      <TrendArrow recent={selectedCommodity.recent_count} total={selectedCommodity.shipment_count} />
                      <span className="text-sm text-[#8a9bb0] font-mono">{selectedCommodity.recent_count}</span>
                    </div>
                  </div>
                </div>

                {/* Price context */}
                {(() => {
                  const price = prices.find(p => {
                    const catMap: Record<string, string> = {
                      copper_ore: 'Copper', refined_copper: 'Copper', iron_ore: 'Iron Ore',
                      coal: 'Coal (thermal)', soy: 'Soy', nickel_ore: 'Nickel', cobalt: 'Cobalt',
                      zinc_ore: 'Zinc', wheat: 'Wheat', lng: 'LNG (JKM)',
                      lithium_carbonate: 'Lithium Carbonate', rare_earths: 'Rare Earths (NdPr oxide)',
                    };
                    return p.commodity === (catMap[selectedCommodity.category] || '');
                  });
                  if (!price) return null;
                  return (
                    <div className="bg-[#121722] border border-[#1e2535] px-4 py-2.5 mb-4 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="text-[9px] text-[#4C6A92] uppercase tracking-wider font-semibold">Price</span>
                        <span className="text-sm text-[#C6A86B] font-mono">{price.price.toLocaleString()} {price.unit}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className={`text-xs font-mono ${price.change_24h >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                          {price.change_24h >= 0 ? '+' : ''}{price.change_24h}%
                        </span>
                        <span className="text-[8px] text-[#6b7a8d] font-mono">{price.source}</span>
                      </div>
                    </div>
                  );
                })()}

                {/* Data source badge */}
                <div className="mb-4 flex items-center gap-2">
                  <span className="text-[9px] px-2 py-0.5 bg-[#0d2847] border border-[#1e3a5f] text-[#4C9AFF] font-mono uppercase tracking-wider">
                    UN Comtrade
                  </span>
                  <span className="text-[9px] text-[#6b7a8d]">Annual trade flow data</span>
                </div>

                {/* Exporters */}
                <div className="mb-4">
                  <h3 className="text-[9px] text-[#4C6A92] uppercase tracking-[0.15em] font-semibold mb-2" style={{ fontFamily: 'Manrope' }}>
                    Top Exporters
                  </h3>
                  <div className="bg-[#121722] border border-[#1e2535]">
                    <div className="px-4 py-2 border-b border-[#1e2535] flex">
                      <span className="text-[9px] text-[#6b7a8d] uppercase tracking-wider flex-1" style={{ fontFamily: 'Manrope' }}>Country</span>
                      <span className="text-[9px] text-[#6b7a8d] uppercase tracking-wider w-24 text-right" style={{ fontFamily: 'Manrope' }}>Value</span>
                      <span className="text-[9px] text-[#6b7a8d] uppercase tracking-wider w-16 text-right" style={{ fontFamily: 'Manrope' }}>Flows</span>
                    </div>
                    {selectedCorridors.length > 0 ? selectedCorridors.slice(0, 8).map((c, i) => (
                      <div key={i} className="px-4 py-2 flex items-center border-b border-[#1e2535]/30 hover:bg-[#1a2030] transition-colors">
                        <span className="text-xs text-[#e0e6ed] flex-1" style={{ fontFamily: 'Manrope' }}>{c.country}</span>
                        <span className="text-xs text-[#8a9bb0] w-24 text-right font-mono">{formatValue(c.value_usd)}</span>
                        <span className="text-xs text-[#6b7a8d] w-16 text-right font-mono">{c.flow_count}</span>
                      </div>
                    )) : (
                      <div className="px-4 py-3 text-xs text-[#6b7a8d]">
                        Primary exporter: {selectedCommodity.top_exporter}
                      </div>
                    )}
                  </div>
                </div>

                {/* Top destination */}
                <div className="mb-4">
                  <h3 className="text-[9px] text-[#4C6A92] uppercase tracking-[0.15em] font-semibold mb-2" style={{ fontFamily: 'Manrope' }}>
                    Top Destination
                  </h3>
                  <div className="bg-[#121722] border border-[#1e2535] px-4 py-2.5">
                    <div className="flex items-center gap-3">
                      <span className="text-[#C6A86B] text-sm font-mono">{selectedCommodity.top_destination}</span>
                      <span className="text-[10px] text-[#6b7a8d]">primary importer</span>
                    </div>
                  </div>
                </div>

                {/* Active regions */}
                {selectedCommodity.regions.length > 0 && (
                  <div>
                    <h3 className="text-[9px] text-[#4C6A92] uppercase tracking-[0.15em] font-semibold mb-2" style={{ fontFamily: 'Manrope' }}>
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

          {/* RIGHT PANEL — Top Signals */}
          <div className="w-56 lg:w-64 shrink-0 border-l border-[#1e2535] overflow-y-auto hidden lg:block" style={{ scrollbarWidth: 'none' }}>
            <div className="p-3 border-b border-[#1e2535]">
              <p className="text-[9px] text-[#4C6A92] uppercase tracking-[0.15em] font-semibold" style={{ fontFamily: 'Manrope' }}>
                Top COSMIC Signals
              </p>
            </div>
            <div className="p-2 space-y-1">
              {topSignals.length === 0 ? (
                <div className="p-3 text-[10px] text-[#6b7a8d] font-mono">Monitoring...</div>
              ) : topSignals.map(s => (
                <div
                  key={s.id}
                  className="p-2 border-l-2 bg-[#0d1117]"
                  style={{ borderLeftColor: IMPACT_COLOR[s.impact_category] || '#6b7a8d' }}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[9px] font-bold font-mono" style={{ color: IMPACT_COLOR[s.impact_category] }}>
                      {s.impact_score}
                    </span>
                    <span className="text-[9px] text-[#6b7a8d] font-mono">
                      {Math.round(s.confidence * 100)}%
                    </span>
                  </div>
                  <p className="text-[10px] text-[#e0e6ed] leading-snug mb-1" style={{ fontFamily: 'Manrope' }}>
                    {s.title}
                  </p>
                  <ConfidenceBar value={s.confidence} />
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-[8px] text-[#6b7a8d] font-mono uppercase">{s.commodity}</span>
                    <span className="text-[8px] font-mono" style={{ color: s.route_status === 'confirmed' ? '#22c55e' : s.route_status === 'partial' ? '#eab308' : '#ef4444' }}>
                      {s.route_status}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* Data freshness */}
            <div className="p-3 border-t border-[#1e2535]">
              <p className="text-[9px] text-[#4C6A92] uppercase tracking-[0.15em] font-semibold mb-2" style={{ fontFamily: 'Manrope' }}>
                Data Freshness
              </p>
              {[
                { source: 'UN Comtrade', fresh: 0.70 },
                { source: 'IMF PortWatch', fresh: 0.85 },
                { source: 'VesselFinder', fresh: 0.92 },
              ].map(d => (
                <div key={d.source} className="flex items-center justify-between mb-1">
                  <span className="text-[9px] text-[#6b7a8d] font-mono">{d.source}</span>
                  <div className="w-16 h-[3px] bg-[#1a2030]">
                    <div className="h-full" style={{
                      width: `${d.fresh * 100}%`,
                      backgroundColor: d.fresh >= 0.8 ? '#22c55e' : d.fresh >= 0.5 ? '#eab308' : '#ef4444',
                    }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        @keyframes scroll {
          0% { transform: translateX(100%); }
          100% { transform: translateX(-100%); }
        }
        .animate-scroll {
          animation: scroll 20s linear infinite;
        }
      `}</style>
    </div>
  );
}
