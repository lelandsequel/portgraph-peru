'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ConfidenceDots, ConfidenceBadge } from '@/components/ProvenancePanel';
import { TradeFlow } from '@/lib/db/types';

export default function TradeFeedPage() {
  const [flows, setFlows] = useState<TradeFlow[]>([]);
  const [loading, setLoading] = useState(true);
  const [portFilter, setPortFilter] = useState<string>('all');
  const [confidenceFilter, setConfidenceFilter] = useState<string>('all');

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

  const filteredFlows = flows.filter(f => {
    if (portFilter !== 'all' && f.peru_port_unlocode !== portFilter) return false;
    if (confidenceFilter !== 'all' && f.confidence_tier !== confidenceFilter) return false;
    return true;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Trade Feed</h1>
          <p className="text-gray-400 text-sm">Chronological vessel activity at Callao + Matarani</p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={portFilter}
            onChange={e => setPortFilter(e.target.value)}
            className="bg-gray-900 border border-gray-700 rounded-md px-3 py-1.5 text-sm text-gray-300"
          >
            <option value="all">All Ports</option>
            <option value="PECLL">Callao</option>
            <option value="PEMRI">Matarani</option>
          </select>
          <select
            value={confidenceFilter}
            onChange={e => setConfidenceFilter(e.target.value)}
            className="bg-gray-900 border border-gray-700 rounded-md px-3 py-1.5 text-sm text-gray-300"
          >
            <option value="all">All Confidence</option>
            <option value="HIGH">HIGH</option>
            <option value="MEDIUM">MEDIUM</option>
            <option value="LOW">LOW</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <svg className="animate-spin h-8 w-8 text-blue-500" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        </div>
      ) : filteredFlows.length === 0 ? (
        <div className="text-center py-16 text-gray-500">
          <p className="text-lg mb-2">No trade flows found</p>
          <p className="text-sm">Run the seed script to populate data, or adjust filters.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filteredFlows.map((flow, i) => (
            <Link
              key={flow.id || i}
              href={`/?q=${encodeURIComponent(flow.vessel_name || '')}&type=vessel`}
              className="block bg-gray-900 border border-gray-800 hover:border-gray-700 rounded-lg p-4 transition-colors"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-1">
                    <span className="text-sm font-semibold text-white font-mono">
                      {flow.vessel_name || 'Unknown Vessel'}
                    </span>
                    {flow.flag_state && (
                      <span className="text-xs text-gray-500">{flow.flag_state}</span>
                    )}
                    {flow.imo_number && (
                      <span className="text-xs text-gray-600 font-mono">IMO: {flow.imo_number}</span>
                    )}
                    <ConfidenceDots tier={flow.confidence_tier} />
                  </div>

                  <div className="flex items-center gap-2 text-xs text-gray-400 font-mono mb-2">
                    {flow.origin_country && <span>{flow.origin_country}</span>}
                    {flow.origin_country && <span className="text-gray-600">&#8594;</span>}
                    <span className="text-blue-400 font-semibold">{flow.peru_port}</span>
                    <span className="text-gray-600">&#8594;</span>
                    <span className="text-emerald-400">{flow.destination_country || '?'}</span>
                  </div>

                  <div className="flex items-center gap-4 text-xs text-gray-500">
                    {flow.commodity && (
                      <span className="bg-gray-800 px-2 py-0.5 rounded">{flow.commodity}</span>
                    )}
                    {flow.weight_kg && (
                      <span>{(flow.weight_kg / 1000).toFixed(1)}t</span>
                    )}
                    {flow.exporter_name && (
                      <span>Exporter: {flow.exporter_name}</span>
                    )}
                    {flow.arrival_time && (
                      <span>{new Date(flow.arrival_time).toLocaleDateString()}</span>
                    )}
                  </div>
                </div>

                <div className="flex flex-col items-end gap-1 ml-4">
                  <ConfidenceBadge tier={flow.confidence_tier} />
                  {flow.is_flagged && (
                    <span className="text-xs text-red-400">FLAGGED</span>
                  )}
                  {flow.flag_reasons && flow.flag_reasons.length > 0 && (
                    <div className="flex gap-1">
                      {flow.flag_reasons.slice(0, 2).map((reason, j) => (
                        <span key={j} className="text-xs text-red-500/70">{reason}</span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      <div className="mt-6 text-center text-xs text-gray-600">
        Showing {filteredFlows.length} of {flows.length} trade flows
      </div>
    </div>
  );
}
