// COSMIC LNG Pipeline — METEOR → COMET → NEBULA → QUASAR + AURORA gate
// All LNG signals must pass through this pipeline before reaching the UI

import { resolveEntityChain } from '../cosmic/meteor';
import { evaluateRouteContinuity } from '../cosmic/comet';
import { quantifyUncertainty } from '../cosmic/nebula';
import { rankSignal } from '../cosmic/quasar';
import type { LNGSignal } from './signals';

const AURORA_THRESHOLD = 0.65;

export interface EnrichedLNGSignal {
  signal: LNGSignal;
  cosmic: {
    meteor_confidence: number;
    comet_continuity: number;
    comet_status: 'confirmed' | 'partial' | 'broken';
    comet_anomalies: string[];
    nebula_confidence: number;
    nebula_band: 'low' | 'medium' | 'high';
    nebula_contradictions: string[];
    quasar_impact: number;
    quasar_category: 'routine' | 'notable' | 'critical';
  };
  final_confidence: number;
  impact_score: number;
  status: 'active' | 'suppressed';
  suppression_reason?: string;
  freshness_score: number;
}

function getDestinationFromSignal(signal: LNGSignal): { port?: string; country?: string } {
  switch (signal.type) {
    case 'destination_prediction':
      return { port: signal.predicted_destination, country: signal.predicted_country };
    case 'reroute':
      return { port: signal.new_likely_destination };
    case 'delay':
      return {};
  }
}

function computeFreshness(timestamp: string): number {
  const ageMs = Date.now() - new Date(timestamp).getTime();
  const ageHours = ageMs / 3600000;
  if (ageHours < 1) return 98;
  if (ageHours < 6) return 90;
  if (ageHours < 24) return 75;
  if (ageHours < 72) return 50;
  return 25;
}

export function runLNGCosmicPipeline(rawSignal: LNGSignal): EnrichedLNGSignal {
  const dest = getDestinationFromSignal(rawSignal);

  // METEOR — entity linking: vessel → terminal → destination buyer
  const meteor = resolveEntityChain({
    vessel_imo: rawSignal.imo,
    vessel_name: rawSignal.vessel,
    port_name: rawSignal.origin_terminal,
    destination_port: dest.port,
    destination_country: dest.country,
  });

  // COMET — route continuity score
  const comet = evaluateRouteContinuity({
    origin_country: 'USA',
    origin_port: rawSignal.origin_terminal,
    loading_port: rawSignal.origin_terminal,
    vessel_name: rawSignal.vessel,
    vessel_imo: rawSignal.imo,
    destination_port: dest.port,
    destination_country: dest.country,
    expected_destination: rawSignal.type === 'reroute' ? rawSignal.original_destination : undefined,
  });

  // NEBULA — uncertainty quantification
  const nebula = quantifyUncertainty({
    data_age_hours: (Date.now() - new Date(rawSignal.timestamp).getTime()) / 3600000,
    source_count: 2,
    sources_agree: true,
    historical_pattern_match: rawSignal.type === 'destination_prediction' ? rawSignal.confidence > 0.75 : undefined,
    missing_fields: dest.country ? [] : ['destination_country'],
    confidence_scores: [rawSignal.confidence, meteor.composite_confidence, comet.continuity_score],
    has_vessel_imo: !!rawSignal.imo,
    has_destination: !!dest.port,
  });

  // QUASAR — impact score
  const quasar = rankSignal({
    commodity_category: 'lng',
    destination_country: dest.country,
    alert_type: rawSignal.type === 'reroute' ? 'route_expansion' : rawSignal.type === 'delay' ? 'supply_disruption' : 'route_confirmed',
    confidence: nebula.confidence,
  });

  // Final blended confidence: 50% NEBULA + 30% METEOR + 20% COMET
  const final_confidence = parseFloat(
    (nebula.confidence * 0.5 + meteor.composite_confidence * 0.3 + comet.continuity_score * 0.2).toFixed(3)
  );

  const freshness_score = computeFreshness(rawSignal.timestamp);

  // AURORA GATE — suppress low-confidence signals
  const suppressed = final_confidence < AURORA_THRESHOLD;

  if (suppressed) {
    console.log(
      `[AURORA] SUPPRESSED: ${rawSignal.vessel} | type=${rawSignal.type} | confidence=${final_confidence} < ${AURORA_THRESHOLD}`
    );
  }

  return {
    signal: rawSignal,
    cosmic: {
      meteor_confidence: meteor.composite_confidence,
      comet_continuity: comet.continuity_score,
      comet_status: comet.route_status,
      comet_anomalies: comet.anomalies,
      nebula_confidence: nebula.confidence,
      nebula_band: nebula.uncertainty_band,
      nebula_contradictions: nebula.contradictions,
      quasar_impact: quasar.impact_score,
      quasar_category: quasar.category,
    },
    final_confidence,
    impact_score: quasar.impact_score,
    status: suppressed ? 'suppressed' : 'active',
    suppression_reason: suppressed ? `Confidence ${final_confidence} below AURORA threshold ${AURORA_THRESHOLD}` : undefined,
    freshness_score,
  };
}

// Batch pipeline: filters out suppressed signals for UI, returns both sets
export function processLNGSignalBatch(signals: LNGSignal[]): {
  active: EnrichedLNGSignal[];
  suppressed: EnrichedLNGSignal[];
} {
  const results = signals.map(runLNGCosmicPipeline);
  return {
    active: results.filter(r => r.status === 'active').sort((a, b) => b.impact_score - a.impact_score),
    suppressed: results.filter(r => r.status === 'suppressed'),
  };
}
