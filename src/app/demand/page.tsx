'use client';

import { useState, useEffect } from 'react';

const COMMODITY_COLOR: Record<string, string> = {
  copper_ore: '#f59e0b', refined_copper: '#f59e0b', iron_ore: '#ef4444',
  coal: '#6b7280', soy: '#22c55e', nickel_ore: '#8b5cf6', cobalt: '#3b82f6',
  zinc_ore: '#a855f7', potash: '#f97316', wheat: '#eab308', corn: '#84cc16',
  fertilizer: '#14b8a6', uranium: '#facc15', bauxite: '#dc2626', lng: '#06b6d4',
  lithium_carbonate: '#10b981', lithium_ore: '#059669', rare_earths: '#d946ef',
  crude_oil: '#475569', alumina: '#f43f5e', chromium: '#7c3aed',
  manganese: '#be185d', phosphate: '#0d9488',
};

interface CommodityImport {
  name: string;
  category: string;
  value_usd: number;
  volume_mt: number;
  share_pct: number;
}

interface Supplier {
  country: string;
  value_usd: number;
  share_pct: number;
}

interface ImporterProfile {
  country: string;
  total_value_usd: number;
  total_volume_mt: number;
  commodities: CommodityImport[];
  top_suppliers: Supplier[];
  flow_count: number;
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

export default function DemandPage() {
  const [importers, setImporters] = useState<ImporterProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalValue, setTotalValue] = useState(0);
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/api/demand');
        if (res.ok) {
          const data = await res.json();
          setImporters(data.importers || []);
          setTotalValue(data.total_value || 0);
        }
      } catch (err) {
        console.error('Failed to load demand data:', err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  return (
    <div className="p-4 sm:p-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-xl sm:text-2xl font-thin tracking-wide text-[#C6A86B] mb-1" style={{ fontFamily: 'Sora, Manrope' }}>
          Demand Intelligence
        </h1>
        <p className="text-[#6b7a8d] text-sm">
          Who&apos;s buying what — top importer profiles with supplier breakdown
        </p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-6 h-6 border-2 border-[#C6A86B]/30 border-t-[#C6A86B] rounded-full animate-spin" />
        </div>
      ) : (
        <>
          {/* Summary */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-px bg-[#1e2535] mb-6">
            <div className="bg-[#121722] p-4">
              <p className="text-[9px] text-[#6b7a8d] uppercase tracking-wider mb-1" style={{ fontFamily: 'Manrope' }}>Importers Tracked</p>
              <p className="text-xl font-semibold text-[#e0e6ed]" style={{ fontFamily: 'JetBrains Mono, monospace' }}>{importers.length}</p>
            </div>
            <div className="bg-[#121722] p-4">
              <p className="text-[9px] text-[#6b7a8d] uppercase tracking-wider mb-1" style={{ fontFamily: 'Manrope' }}>Total Import Value</p>
              <p className="text-xl font-semibold text-[#e0e6ed]" style={{ fontFamily: 'JetBrains Mono, monospace' }}>{formatValue(totalValue)}</p>
            </div>
            <div className="bg-[#121722] p-4">
              <p className="text-[9px] text-[#6b7a8d] uppercase tracking-wider mb-1" style={{ fontFamily: 'Manrope' }}>Source</p>
              <p className="text-sm font-medium text-[#4C6A92] mt-1" style={{ fontFamily: 'JetBrains Mono, monospace' }}>UN Comtrade</p>
            </div>
          </div>

          {/* Importer cards */}
          <div className="space-y-px bg-[#1e2535]">
            {importers.map(imp => {
              const isExpanded = expanded === imp.country;
              const globalShare = totalValue > 0 ? ((imp.total_value_usd / totalValue) * 100).toFixed(1) : '0';
              return (
                <div key={imp.country} className="bg-[#121722]">
                  {/* Header row */}
                  <button
                    onClick={() => setExpanded(isExpanded ? null : imp.country)}
                    className="w-full px-5 py-4 flex items-center justify-between hover:bg-[#1a2030] transition-colors text-left"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded bg-[#1a2030] flex items-center justify-center text-lg font-semibold text-[#C6A86B]" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
                        {imp.country.slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-[#e0e6ed]" style={{ fontFamily: 'Manrope' }}>{imp.country}</p>
                        <p className="text-[10px] text-[#6b7a8d]" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
                          {globalShare}% of monitored imports &middot; {imp.commodities.length} commodities
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-[#C6A86B]" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
                        {formatValue(imp.total_value_usd)}
                      </p>
                      <p className="text-[10px] text-[#6b7a8d]" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
                        {formatVolume(imp.total_volume_mt)}
                      </p>
                    </div>
                  </button>

                  {/* Expanded details */}
                  {isExpanded && (
                    <div className="px-5 pb-5 border-t border-[#1e2535]">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-4">
                        {/* Commodities imported */}
                        <div>
                          <h3 className="text-[10px] text-[#4C6A92] uppercase tracking-[0.15em] font-semibold mb-3" style={{ fontFamily: 'Manrope' }}>
                            Commodities Imported
                          </h3>
                          <div className="space-y-2">
                            {imp.commodities.slice(0, 10).map((c, i) => (
                              <div key={i} className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: COMMODITY_COLOR[c.category] || '#6b7a8d' }} />
                                  <span className="text-xs text-[#8a9bb0]">{c.name}</span>
                                </div>
                                <div className="text-right">
                                  <span className="text-xs font-medium text-[#e0e6ed]" style={{ fontFamily: 'JetBrains Mono, monospace' }}>{formatValue(c.value_usd)}</span>
                                  <span className="text-[10px] text-[#6b7a8d] ml-2">{c.share_pct.toFixed(0)}%</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Top suppliers */}
                        <div>
                          <h3 className="text-[10px] text-[#4C6A92] uppercase tracking-[0.15em] font-semibold mb-3" style={{ fontFamily: 'Manrope' }}>
                            Top Suppliers
                          </h3>
                          <div className="space-y-2">
                            {imp.top_suppliers.map((s, i) => (
                              <div key={i} className="flex items-center justify-between">
                                <span className="text-xs text-[#8a9bb0]">{s.country}</span>
                                <div className="flex items-center gap-3">
                                  <div className="w-20 h-1.5 bg-[#1a2030] rounded-full overflow-hidden">
                                    <div
                                      className="h-full bg-[#C6A86B]/60 rounded-full"
                                      style={{ width: `${Math.min(s.share_pct, 100)}%` }}
                                    />
                                  </div>
                                  <span className="text-xs font-medium text-[#e0e6ed] w-16 text-right" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
                                    {s.share_pct.toFixed(1)}%
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* Commodity tags */}
                      <div className="mt-4 flex flex-wrap gap-1">
                        {imp.commodities.map((c, i) => (
                          <span
                            key={i}
                            className="text-[10px] px-2 py-0.5 border"
                            style={{
                              color: COMMODITY_COLOR[c.category] || '#8a9bb0',
                              borderColor: (COMMODITY_COLOR[c.category] || '#6b7a8d') + '40',
                              backgroundColor: (COMMODITY_COLOR[c.category] || '#6b7a8d') + '15',
                            }}
                          >
                            {c.name}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
