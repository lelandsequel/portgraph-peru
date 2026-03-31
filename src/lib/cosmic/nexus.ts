// NEXUS — Final Decision Layer
// Merges all COSMIC engine outputs into final signal object

import { resolveEntityChain, MeteorResult } from './meteor';
import { evaluateRouteContinuity, CometResult } from './comet';
import { quantifyUncertainty, NebulaResult } from './nebula';
import { rankSignal, QuasarResult } from './quasar';

export interface CosmicSignal {
  title: string;
  confidence: number;
  impact_score: number;
  route_status: string;
  explanation: string;
  economic_implication: string;
  action_bias: string;
  // Sub-engine results
  meteor: MeteorResult;
  comet: CometResult;
  nebula: NebulaResult;
  quasar: QuasarResult;
}

export interface NexusInput {
  // Alert/event metadata
  title: string;
  alert_type?: string;
  description?: string;
  // Entity data
  vessel_imo?: string;
  vessel_name?: string;
  port_name?: string;
  port_unlocode?: string;
  origin_country?: string;
  destination_country?: string;
  destination_port?: string;
  exporter_name?: string;
  importer_name?: string;
  mine_name?: string;
  // Route data
  expected_destination?: string;
  match_method?: string;
  arrival_time?: string;
  departure_time?: string;
  // Signal data
  trade_value_usd?: number;
  volume_kg?: number;
  baseline_volume_kg?: number;
  commodity_category?: string;
  commodity?: string;
  // Confidence inputs
  data_age_hours?: number;
  source_count?: number;
  sources_agree?: boolean;
  historical_pattern_match?: boolean;
  confidence_scores?: number[];
}

function deriveExplanation(input: NexusInput, quasar: QuasarResult, comet: CometResult): string {
  const parts: string[] = [];
  if (quasar.category === 'critical') {
    parts.push('HIGH-IMPACT EVENT.');
  }
  if (input.commodity) {
    parts.push(`${input.commodity} flow detected`);
    if (input.origin_country && input.destination_country) {
      parts.push(`on ${input.origin_country} -> ${input.destination_country} corridor.`);
    } else {
      parts.push('on active trade corridor.');
    }
  }
  if (comet.route_status === 'broken') {
    parts.push('Route continuity broken — supply chain disruption possible.');
  } else if (comet.anomalies.length > 0) {
    parts.push(`Route anomaly: ${comet.anomalies[0]}.`);
  }
  return parts.join(' ') || input.description || input.title;
}

function deriveEconomicImplication(input: NexusInput, quasar: QuasarResult): string {
  const cat = (input.commodity_category || '').toLowerCase();
  const dest = (input.destination_country || 'global markets').toLowerCase();

  if (quasar.impact_score >= 80) {
    if (['lithium_carbonate', 'lithium_ore', 'rare_earths', 'cobalt'].includes(cat)) {
      return `Critical mineral supply shift may affect EV/battery sector pricing. ${dest.includes('china') ? 'China strategic stockpiling signal.' : 'Watch for supply reallocation.'}`;
    }
    if (['copper_ore', 'refined_copper'].includes(cat)) {
      return `Copper flow disruption could pressure LME prices. Infrastructure and construction sectors exposed.`;
    }
    return `High-value commodity movement — potential price impact on global ${input.commodity || cat} markets.`;
  }
  if (quasar.impact_score >= 50) {
    return `Moderate trade signal for ${input.commodity || cat}. Monitor for trend confirmation before pricing impact.`;
  }
  return `Routine ${input.commodity || cat} flow. No immediate price implication expected.`;
}

function deriveActionBias(quasar: QuasarResult, comet: CometResult, nebula: NebulaResult): string {
  if (quasar.category === 'critical' && nebula.confidence >= 0.7) {
    return 'ALERT — escalate to analyst desk';
  }
  if (quasar.category === 'critical' && nebula.confidence < 0.7) {
    return 'INVESTIGATE — high impact but uncertain, verify sources';
  }
  if (comet.route_status === 'broken') {
    return 'MONITOR — route disruption detected, await confirmation';
  }
  if (quasar.category === 'notable') {
    return 'WATCH — notable event, add to watchlist';
  }
  return 'LOG — routine activity, archive';
}

export function processSignal(input: NexusInput): CosmicSignal {
  // Run METEOR — entity resolution
  const meteor = resolveEntityChain({
    vessel_imo: input.vessel_imo,
    vessel_name: input.vessel_name,
    port_name: input.port_name,
    port_unlocode: input.port_unlocode,
    origin_country: input.origin_country,
    destination_country: input.destination_country,
    destination_port: input.destination_port,
    exporter_name: input.exporter_name,
    importer_name: input.importer_name,
    mine_name: input.mine_name,
  });

  // Run COMET — route continuity
  const comet = evaluateRouteContinuity({
    origin_country: input.origin_country,
    origin_port: input.port_name,
    loading_port: input.port_name,
    loading_port_unlocode: input.port_unlocode,
    vessel_name: input.vessel_name,
    vessel_imo: input.vessel_imo,
    destination_port: input.destination_port,
    destination_country: input.destination_country,
    expected_destination: input.expected_destination,
    arrival_time: input.arrival_time,
    departure_time: input.departure_time,
    match_method: input.match_method,
    confidence_score: input.confidence_scores?.[0],
  });

  // Determine missing fields for NEBULA
  const missingFields: string[] = [];
  if (!input.vessel_imo && !input.vessel_name) missingFields.push('vessel');
  if (!input.destination_country) missingFields.push('destination');
  if (!input.exporter_name) missingFields.push('exporter');
  if (!input.importer_name) missingFields.push('importer');
  if (!input.trade_value_usd) missingFields.push('trade_value');

  // Run NEBULA — uncertainty quantification
  const nebula = quantifyUncertainty({
    data_age_hours: input.data_age_hours,
    source_count: input.source_count,
    sources_agree: input.sources_agree,
    historical_pattern_match: input.historical_pattern_match,
    missing_fields: missingFields,
    confidence_scores: input.confidence_scores,
    has_vessel_imo: !!input.vessel_imo,
    has_destination: !!input.destination_country,
    has_exporter: !!input.exporter_name,
    has_importer: !!input.importer_name,
  });

  // Run QUASAR — signal ranking
  const quasar = rankSignal({
    trade_value_usd: input.trade_value_usd,
    volume_kg: input.volume_kg,
    baseline_volume_kg: input.baseline_volume_kg,
    commodity_category: input.commodity_category,
    destination_country: input.destination_country,
    alert_type: input.alert_type,
    confidence: nebula.confidence,
  });

  // Merge into final COSMIC signal
  const finalConfidence = parseFloat(
    ((nebula.confidence * 0.5 + meteor.composite_confidence * 0.3 + comet.continuity_score * 0.2)).toFixed(3)
  );

  return {
    title: input.title,
    confidence: Math.max(0, Math.min(1, finalConfidence)),
    impact_score: quasar.impact_score,
    route_status: comet.route_status,
    explanation: deriveExplanation(input, quasar, comet),
    economic_implication: deriveEconomicImplication(input, quasar),
    action_bias: deriveActionBias(quasar, comet, nebula),
    meteor,
    comet,
    nebula,
    quasar,
  };
}
