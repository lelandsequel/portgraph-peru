'use client';

import { useState, useEffect } from 'react';

interface ResolvedEntity {
  id: string;
  name: string;
  role: string;
  confidence: number;
}

interface TradeChainLink {
  role: string;
  entity: { id: string; name: string };
  confidence: number;
}

interface TradeChainResult {
  chain: TradeChainLink[];
  overall_confidence: number;
  confidence_tier: 'HIGH' | 'MEDIUM' | 'LOW';
}

interface EntityPanelProps {
  exporter: string;
  importer: string;
  commodity: string;
  value: number;
  onClose: () => void;
}

function confidenceColor(c: number): string {
  if (c >= 0.8) return 'bg-cyan-400';
  if (c >= 0.6) return 'bg-yellow-400';
  return 'bg-gray-500';
}

function confidenceTextColor(c: number): string {
  if (c >= 0.8) return 'text-cyan-400';
  if (c >= 0.6) return 'text-yellow-400';
  return 'text-gray-400';
}

function tierBadgeClass(tier: string): string {
  if (tier === 'HIGH') return 'bg-cyan-900/50 text-cyan-400 border-cyan-700';
  if (tier === 'MEDIUM') return 'bg-yellow-900/50 text-yellow-400 border-yellow-700';
  return 'bg-gray-800 text-gray-400 border-gray-600';
}

export default function EntityPanel({ exporter, importer, commodity, value, onClose }: EntityPanelProps) {
  const [entities, setEntities] = useState<ResolvedEntity[]>([]);
  const [tradeChain, setTradeChain] = useState<TradeChainResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    async function resolve() {
      setLoading(true);
      setError(false);
      try {
        const params = new URLSearchParams({
          exporter, importer, commodity, value: String(value),
        });
        const res = await fetch(`/api/entities?${params}`);
        if (!res.ok) throw new Error();
        const data = await res.json();
        setEntities(data.entities || []);
        setTradeChain(data.trade_chain || null);
      } catch {
        setError(true);
      } finally {
        setLoading(false);
      }
    }
    resolve();
  }, [exporter, importer, commodity, value]);

  const grouped: Record<string, ResolvedEntity[]> = { producer: [], trader: [], buyer: [] };
  for (const e of entities) {
    if (grouped[e.role]) grouped[e.role].push(e);
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-gray-900 border-l border-gray-800 overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-gray-900/95 backdrop-blur border-b border-gray-800 px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-white">Entity Resolution</h2>
            <p className="text-xs text-gray-500 font-mono">{exporter} &rarr; {importer} &middot; {commodity}</p>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-white text-xl leading-none">&times;</button>
        </div>

        <div className="px-6 py-5 space-y-6">
          {loading ? (
            <div className="space-y-4">
              {[1, 2, 3].map(i => (
                <div key={i} className="animate-pulse">
                  <div className="h-4 bg-gray-800 rounded w-24 mb-2" />
                  <div className="h-16 bg-gray-800 rounded" />
                </div>
              ))}
            </div>
          ) : error ? (
            <div className="text-center py-12 text-gray-500">Resolution unavailable</div>
          ) : (
            <>
              {/* SECTION 1: Trade Chain */}
              {tradeChain && (
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <h3 className="text-xs text-gray-500 uppercase font-medium">Trade Chain</h3>
                    <span className={`text-xs px-2 py-0.5 rounded border font-medium ${tierBadgeClass(tradeChain.confidence_tier)}`}>
                      {tradeChain.confidence_tier}
                    </span>
                    <span className="text-xs text-gray-600 font-mono">{(tradeChain.overall_confidence * 100).toFixed(0)}%</span>
                  </div>
                  <div className="flex items-center gap-1 text-sm">
                    {tradeChain.chain.map((link, i) => (
                      <div key={link.role} className="flex items-center gap-1">
                        {i > 0 && <span className="text-gray-600 mx-1">&rarr;</span>}
                        <div className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-center min-w-[120px]">
                          <div className="text-[10px] text-gray-500 uppercase mb-0.5">{link.role}</div>
                          <div className="text-white font-medium text-xs truncate">{link.entity.name}</div>
                          <div className={`text-xs font-mono ${confidenceTextColor(link.confidence)}`}>
                            {(link.confidence * 100).toFixed(0)}%
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* SECTION 2: Entity Cards */}
              {(['producer', 'trader', 'buyer'] as const).map(role => (
                <div key={role}>
                  <h3 className="text-xs text-gray-500 uppercase font-medium mb-2">
                    {role === 'producer' ? 'Producers' : role === 'trader' ? 'Traders' : 'Buyers'}
                  </h3>
                  <div className="space-y-2">
                    {grouped[role].map(entity => (
                      <div key={entity.id} className="bg-gray-800 border border-gray-700 rounded-lg p-3">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium text-white">{entity.name}</span>
                          <span className={`text-xs font-mono ${confidenceTextColor(entity.confidence)}`}>
                            {(entity.confidence * 100).toFixed(0)}%
                          </span>
                        </div>
                        <div className="w-full bg-gray-700 rounded-full h-1.5">
                          <div
                            className={`h-1.5 rounded-full ${confidenceColor(entity.confidence)}`}
                            style={{ width: `${entity.confidence * 100}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}

              {/* SECTION 3: Data Note */}
              <div className="border-t border-gray-800 pt-4">
                <p className="text-xs text-gray-600 leading-relaxed">
                  Entity resolution is probabilistic. Based on commodity, geography, and market presence signals. Not a confirmed transaction record.
                </p>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
