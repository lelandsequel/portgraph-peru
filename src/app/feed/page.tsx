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
    <div className="p-4 sm:p-10">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 sm:mb-10">
        <div>
          <h1 className="text-xl sm:text-2xl font-thin tracking-wide text-[#00263f]" style={{ fontFamily: 'Sora, Manrope' }}>Trade Feed</h1>
          <p className="text-[#72777e] text-sm mt-1">Chronological vessel activity at Callao + Matarani</p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={portFilter}
            onChange={e => setPortFilter(e.target.value)}
            className="bg-white border-none rounded-full px-4 py-2 text-sm text-[#42474e] shadow-sm focus:outline-none focus:ring-2 focus:ring-[#006a62]/20 min-h-[44px]"
          >
            <option value="all">All Ports</option>
            <option value="PECLL">Callao</option>
            <option value="PEMRI">Matarani</option>
          </select>
          <select
            value={confidenceFilter}
            onChange={e => setConfidenceFilter(e.target.value)}
            className="bg-white border-none rounded-full px-4 py-2 text-sm text-[#42474e] shadow-sm focus:outline-none focus:ring-2 focus:ring-[#006a62]/20 min-h-[44px]"
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
          <div className="w-8 h-8 border-2 border-[#006a62]/30 border-t-[#006a62] rounded-full animate-spin" />
        </div>
      ) : filteredFlows.length === 0 ? (
        <div className="text-center py-16 text-[#72777e]">
          <p className="text-lg mb-2">No trade flows found</p>
          <p className="text-sm">Adjust filters or seed data.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filteredFlows.map((flow, i) => (
            <Link
              key={flow.id || i}
              href={`/?q=${encodeURIComponent(flow.vessel_name || '')}&type=vessel`}
              className="block bg-white rounded-lg p-5 hover:bg-[#f1f4f6] transition-colors shadow-[0_1px_3px_rgba(24,28,30,0.06)]"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 sm:gap-3 mb-1.5 flex-wrap">
                    <span className="text-sm font-semibold text-[#00263f]" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
                      {flow.vessel_name || 'Unknown Vessel'}
                    </span>
                    {flow.flag_state && <span className="text-xs text-[#72777e]">{flow.flag_state}</span>}
                    {flow.imo_number && <span className="text-xs text-[#c2c7ce]" style={{ fontFamily: 'JetBrains Mono, monospace' }}>IMO {flow.imo_number}</span>}
                    <ConfidenceDots tier={flow.confidence_tier} />
                  </div>

                  <div className="flex items-center gap-2 text-xs text-[#42474e] mb-2" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
                    {flow.origin_country && <span>{flow.origin_country}</span>}
                    {flow.origin_country && <span className="text-[#c2c7ce]">→</span>}
                    <span className="text-[#00263f] font-medium">{flow.peru_port}</span>
                    <span className="text-[#c2c7ce]">→</span>
                    <span className="text-[#006a62] font-medium">{flow.destination_country || '?'}</span>
                  </div>

                  <div className="flex items-center gap-3 text-xs text-[#72777e]">
                    {flow.commodity && (
                      <span className="bg-[#f1f4f6] px-2 py-0.5 rounded-full">{flow.commodity}</span>
                    )}
                    {flow.weight_kg && <span>{(flow.weight_kg / 1000).toFixed(1)}t</span>}
                    {flow.exporter_name && <span>↑ {flow.exporter_name}</span>}
                    {flow.arrival_time && <span>{new Date(flow.arrival_time).toLocaleDateString()}</span>}
                  </div>
                </div>

                <div className="flex flex-col items-end gap-1.5 ml-4">
                  <ConfidenceBadge tier={flow.confidence_tier} />
                  {flow.is_flagged && (
                    <span className="text-xs text-[#ba1a1a] bg-[#ffdad6] px-2 py-0.5 rounded-full">FLAGGED</span>
                  )}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      <div className="mt-8 text-center text-xs text-[#72777e]">
        Showing {filteredFlows.length} of {flows.length} trade flows
      </div>
    </div>
  );
}
