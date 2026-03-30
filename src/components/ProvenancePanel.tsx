'use client';

import { useState } from 'react';
import { ProvenanceRecord, ConfidenceTier } from '@/lib/db/types';

interface ProvenancePanelProps {
  provenance: ProvenanceRecord[];
  confidence_score: number;
  confidence_tier: ConfidenceTier;
  source: string;
}

export function ConfidenceDots({ tier }: { tier: ConfidenceTier }) {
  const filled = tier === 'HIGH' ? 4 : tier === 'MEDIUM' ? 3 : 1;
  return (
    <span className="inline-flex items-center gap-0.5" title={`Confidence: ${tier}`}>
      {[1, 2, 3, 4].map(i => (
        <span
          key={i}
          className={`inline-block w-2 h-2 rounded-full ${
            i <= filled
              ? tier === 'HIGH' ? 'bg-emerald-500' : tier === 'MEDIUM' ? 'bg-amber-500' : 'bg-red-500'
              : 'bg-gray-600'
          }`}
        />
      ))}
      <span className="ml-1 text-xs text-gray-400">{tier}</span>
    </span>
  );
}

export function ConfidenceBadge({ tier }: { tier: ConfidenceTier }) {
  const colors = {
    HIGH: 'bg-emerald-900/50 text-emerald-400 border-emerald-700',
    MEDIUM: 'bg-amber-900/50 text-amber-400 border-amber-700',
    LOW: 'bg-red-900/50 text-red-400 border-red-700',
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${colors[tier]}`}>
      {tier}
    </span>
  );
}

export function SectionBadge({ section }: { section: 'observed' | 'enriched' | 'inferred' }) {
  const config = {
    observed: { label: 'OBSERVED', className: 'bg-blue-900/50 text-blue-400 border-blue-700' },
    enriched: { label: 'ENRICHED', className: 'bg-purple-900/50 text-purple-400 border-purple-700' },
    inferred: { label: 'INFERRED', className: 'bg-orange-900/50 text-orange-400 border-orange-700' },
  };
  const { label, className } = config[section];
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${className}`}>
      {label}
    </span>
  );
}

export default function ProvenancePanel({ provenance, confidence_score, confidence_tier, source }: ProvenancePanelProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="text-xs text-gray-500 hover:text-gray-300 underline decoration-dotted transition-colors"
        title="View provenance chain"
      >
        {source}
      </button>

      {isOpen && (
        <div className="absolute z-50 mt-1 right-0 w-[calc(100vw-2rem)] sm:w-80 max-w-80 bg-gray-900 border border-gray-700 shadow-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-semibold text-gray-200">Provenance Chain</h4>
            <button onClick={() => setIsOpen(false)} className="text-gray-500 hover:text-gray-300">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="space-y-2 mb-3">
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-400">Confidence Score</span>
              <span className="text-sm font-mono text-gray-200">{(confidence_score * 100).toFixed(0)}%</span>
            </div>
            <div className="w-full bg-gray-700 rounded-full h-1.5">
              <div
                className={`h-1.5 rounded-full ${
                  confidence_tier === 'HIGH' ? 'bg-emerald-500' : confidence_tier === 'MEDIUM' ? 'bg-amber-500' : 'bg-red-500'
                }`}
                style={{ width: `${confidence_score * 100}%` }}
              />
            </div>
            <div className="flex justify-between">
              <ConfidenceDots tier={confidence_tier} />
            </div>
          </div>

          {provenance.length > 0 ? (
            <div className="space-y-2">
              <h5 className="text-xs font-semibold text-gray-400 uppercase">Source Chain</h5>
              {provenance.map((p, i) => (
                <div key={i} className="bg-gray-800 rounded p-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-300 font-medium">{p.source_name}</span>
                    <span className="text-gray-500">{new Date(p.fetch_timestamp).toLocaleDateString()}</span>
                  </div>
                  <div className="text-gray-400 mt-1">
                    <span className="text-gray-500">Field:</span> {p.field}
                  </div>
                  {p.raw_value && (
                    <div className="text-gray-500 mt-0.5 truncate">
                      Raw: {p.raw_value}
                    </div>
                  )}
                  {p.normalized_value && p.normalized_value !== p.raw_value && (
                    <div className="text-gray-400 mt-0.5 truncate">
                      Normalized: {p.normalized_value}
                    </div>
                  )}
                  {p.source_url && (
                    <a
                      href={p.source_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-400 hover:text-blue-300 mt-1 block truncate"
                    >
                      {p.source_url}
                    </a>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-xs text-gray-500">
              Source: {source}
            </div>
          )}

          {confidence_score < 0.8 && (
            <div className="mt-3 p-2 bg-red-900/30 border border-red-800 rounded text-xs text-red-400">
              AURORA Flag: Confidence below 0.80 threshold. This data should be verified.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
