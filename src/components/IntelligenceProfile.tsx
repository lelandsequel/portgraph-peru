'use client';

import { TradeIntelligenceProfile, IntelligenceFact } from '@/lib/db/types';
import ProvenancePanel, { ConfidenceDots, SectionBadge, ConfidenceBadge } from './ProvenancePanel';

interface IntelligenceProfileProps {
  profile: TradeIntelligenceProfile;
}

function FactRow({ fact }: { fact: IntelligenceFact }) {
  return (
    <div className="flex items-start justify-between py-2 border-b border-gray-800 last:border-0">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <span className="text-sm text-gray-400">{fact.label}</span>
          <ConfidenceDots tier={fact.confidence_tier} />
        </div>
        <p className="text-sm text-gray-100 font-medium">{fact.value}</p>
      </div>
      <div className="ml-3 flex-shrink-0">
        <ProvenancePanel
          provenance={fact.provenance}
          confidence_score={fact.confidence_score}
          confidence_tier={fact.confidence_tier}
          source={fact.source}
        />
      </div>
    </div>
  );
}

export default function IntelligenceProfile({ profile }: IntelligenceProfileProps) {
  const isEmpty = profile.observed.length === 0 && profile.enriched.length === 0 && profile.inferred.length === 0;

  if (isEmpty) {
    return (
      <div className="bg-gray-900 border border-gray-800  p-8 text-center">
        <div className="text-gray-500 text-lg mb-2">No intelligence found</div>
        <p className="text-gray-600 text-sm">
          No trade flow data matches &quot;{profile.entity}&quot;. Try a different search term,
          or run the ingestion pipeline to populate the database.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-gray-900 border border-gray-800  p-6">
        <div className="flex items-center justify-between mb-1">
          <h2 className="text-xl font-bold text-white font-mono tracking-wide">
            {profile.entity}
          </h2>
          <span className="text-xs text-gray-500 font-mono">
            {new Date(profile.generated_at).toLocaleString()}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs px-2 py-0.5 rounded bg-gray-800 text-gray-400 uppercase">
            {profile.entity_type}
          </span>
          <span className="text-xs text-gray-500">
            {profile.observed.length + profile.enriched.length + profile.inferred.length} facts
          </span>
        </div>
      </div>

      {/* Observed Section */}
      {profile.observed.length > 0 && (
        <div className="bg-gray-900 border border-blue-900/50  p-5">
          <div className="flex items-center gap-2 mb-3">
            <SectionBadge section="observed" />
            <span className="text-xs text-gray-500">Direct records from structured public sources</span>
          </div>
          <div className="space-y-0">
            {profile.observed.map((fact, i) => (
              <FactRow key={i} fact={fact} />
            ))}
          </div>
        </div>
      )}

      {/* Enriched Section */}
      {profile.enriched.length > 0 && (
        <div className="bg-gray-900 border border-purple-900/50  p-5">
          <div className="flex items-center gap-2 mb-3">
            <SectionBadge section="enriched" />
            <span className="text-xs text-gray-500">Normalized and cross-source matched</span>
          </div>
          <div className="space-y-0">
            {profile.enriched.map((fact, i) => (
              <FactRow key={i} fact={fact} />
            ))}
          </div>
        </div>
      )}

      {/* Inferred Section */}
      {profile.inferred.length > 0 && (
        <div className="bg-gray-900 border border-orange-900/50  p-5">
          <div className="flex items-center gap-2 mb-3">
            <SectionBadge section="inferred" />
            <span className="text-xs text-gray-500">COSMIC pipeline intelligence — always labeled as inferred</span>
          </div>
          <div className="space-y-0">
            {profile.inferred.map((fact, i) => (
              <FactRow key={i} fact={fact} />
            ))}
          </div>
        </div>
      )}

      {/* Anomaly Flags */}
      {profile.anomalies.length > 0 && (
        <div className="bg-gray-900 border border-red-900/50  p-5">
          <div className="flex items-center gap-2 mb-3">
            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border bg-red-900/50 text-red-400 border-red-700">
              ANOMALY FLAGS
            </span>
            <span className="text-xs text-gray-500">{profile.anomalies.length} flag(s) detected</span>
          </div>
          <div className="space-y-2">
            {profile.anomalies.map((anomaly, i) => (
              <div key={i} className="flex items-start gap-3 py-2 border-b border-gray-800 last:border-0">
                <span className="text-red-400 mt-0.5">&#8594;</span>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-200">{anomaly.description}</span>
                    <ConfidenceBadge tier={anomaly.severity} />
                  </div>
                  <span className="text-xs text-gray-500 uppercase">{anomaly.anomaly_type}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Chain View */}
      {profile.chain_view && profile.chain_view.length > 0 && (
        <div className="bg-gray-900 border border-gray-800  p-5">
          <h3 className="text-sm font-semibold text-gray-300 mb-3 uppercase tracking-wider">Chain View</h3>
          <div className="space-y-3">
            {profile.chain_view.map((chain, i) => (
              <div key={i} className="bg-gray-800  p-3">
                <div className="flex items-center gap-2 text-sm font-mono text-gray-300 flex-wrap">
                  {chain.origin && <span className="text-gray-400">[{chain.origin}]</span>}
                  {chain.origin && <span className="text-gray-600">&#8594;</span>}
                  <span className="text-blue-400 font-semibold">{chain.peru_port}</span>
                  <span className="text-gray-600">&#8594;</span>
                  {chain.vessel && <span className="text-gray-300">[{chain.vessel}]</span>}
                  {chain.vessel && <span className="text-gray-600">&#8594;</span>}
                  {chain.destination && <span className="text-emerald-400">{chain.destination}</span>}
                  {chain.consignee && (
                    <>
                      <span className="text-gray-600">&#8594;</span>
                      <span className="text-purple-400">[{chain.consignee}]</span>
                    </>
                  )}
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <ConfidenceDots tier={chain.confidence_tier} />
                  {chain.sources.length > 0 && (
                    <span className="text-xs text-gray-500">Sources: {[...new Set(chain.sources)].join(' + ')}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
