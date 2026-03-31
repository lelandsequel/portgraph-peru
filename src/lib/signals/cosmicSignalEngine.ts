// COSMIC Signal Engine — replaces alertEngine logic
// Every signal piped through METEOR/COMET/NEBULA/QUASAR/NEXUS

import { processSignal, CosmicSignal } from '@/lib/cosmic/nexus';
import { explainSignal } from '@/lib/explainer/explainer';
import { getPriceContext } from '@/lib/pricing/prices';

export interface CosmicAlert {
  id: string;
  title: string;
  confidence: number;
  impact_score: number;
  impact_category: 'routine' | 'notable' | 'critical';
  route_status: string;
  commodity: string;
  commodity_category: string;
  origin_country: string;
  destination_country: string;
  economic_implication: string;
  why_it_matters: string;
  price_context: string;
  freshness_score: number;
  action_bias: string;
  explanation: string;
  anomaly_explanation: string;
  affected_regions: string[];
  affected_companies: string[];
  entities: string[];
  timestamp: number;
  alert_type: string;
  // Sub-engine data for drilldown
  cosmic: CosmicSignal;
}

// Flow state for comparative alerting
interface FlowState {
  entities: string[];
  topEntity: string;
  topConfidence: number;
  importer: string;
}

export type PreviousState = Map<string, FlowState>;

const MAJOR_TRADERS = ['glencore', 'trafigura', 'mercuria', 'freeport', 'southern copper', 'zijin', 'antofagasta', 'bhp', 'vale', 'rio tinto', 'codelco'];
const ROUTE_CONFIRMED_COUNTRIES = ['china', 'japan', 'south korea', 'india', 'germany', 'taiwan', 'netherlands'];
const CRITICAL_MINERALS = ['lithium_carbonate', 'lithium_ore', 'rare_earths', 'cobalt'];
const MAJOR_IMPORTERS = ['china', 'india', 'japan', 'south korea', 'germany', 'netherlands'];

function isMajor(name: string): boolean {
  const lower = name.toLowerCase();
  return MAJOR_TRADERS.some(t => lower.includes(t));
}

function computeFreshness(timestampMs: number): number {
  const ageHours = (Date.now() - timestampMs) / 3_600_000;
  if (ageHours < 1) return 1.0;
  if (ageHours < 6) return 0.95;
  if (ageHours < 24) return 0.85;
  if (ageHours < 72) return 0.65;
  if (ageHours < 168) return 0.40;
  return 0.20;
}

function buildCosmicAlert(
  id: string,
  alertType: string,
  title: string,
  flow: Record<string, unknown>,
  timestamp: number,
): CosmicAlert {
  const commodity = (flow.commodity as string) || (flow.commodity_description as string) || '';
  const commodityCat = (flow.commodity_category as string) || '';
  const origin = (flow.origin_country as string) || (flow.reporter_country as string) || '';
  const dest = (flow.destination_country as string) || '';
  const md = flow.match_details as Record<string, unknown> | undefined;

  const cosmic = processSignal({
    title,
    alert_type: alertType,
    vessel_imo: (md?.vessel_imo as string) || (flow.imo_number as string),
    vessel_name: (md?.vessel_name as string) || (flow.vessel_name as string),
    port_name: (flow.peru_port as string),
    port_unlocode: (flow.peru_port_unlocode as string),
    origin_country: origin,
    destination_country: dest,
    destination_port: (md?.destination as string) || (flow.destination_port as string),
    exporter_name: (flow.exporter_name as string),
    importer_name: (flow.importer_name as string),
    trade_value_usd: (flow.declared_value_usd as number),
    volume_kg: (flow.weight_kg as number),
    commodity_category: commodityCat,
    commodity,
    match_method: (flow.match_method as string),
    data_age_hours: flow.created_at ? (Date.now() - new Date(flow.created_at as string).getTime()) / 3_600_000 : 48,
    source_count: 1,
    sources_agree: true,
    confidence_scores: [(flow.confidence_score as number) || 0.7],
  });

  const expl = explainSignal({
    commodity_category: commodityCat,
    commodity,
    origin_country: origin,
    destination_country: dest,
    volume_kg: (flow.weight_kg as number),
    trade_value_usd: (flow.declared_value_usd as number),
    impact_score: cosmic.impact_score,
    route_status: cosmic.route_status,
    alert_type: alertType,
    anomalies: cosmic.comet.anomalies,
  });

  const priceCtx = getPriceContext(commodityCat);
  const freshness = computeFreshness(timestamp);

  const entities = [
    flow.exporter_name as string,
    flow.importer_name as string,
    (md?.vessel_name as string) || (flow.vessel_name as string),
    dest,
  ].filter(Boolean);

  return {
    id,
    title: cosmic.title,
    confidence: cosmic.confidence,
    impact_score: cosmic.impact_score,
    impact_category: cosmic.quasar.category,
    route_status: cosmic.route_status,
    commodity: commodity || commodityCat.replace(/_/g, ' '),
    commodity_category: commodityCat,
    origin_country: origin,
    destination_country: dest,
    economic_implication: cosmic.economic_implication,
    why_it_matters: expl.anomaly_explanation,
    price_context: priceCtx,
    freshness_score: freshness,
    action_bias: cosmic.action_bias,
    explanation: cosmic.explanation,
    anomaly_explanation: expl.anomaly_explanation,
    affected_regions: expl.affected_regions,
    affected_companies: expl.affected_companies,
    entities,
    timestamp,
    alert_type: alertType,
    cosmic,
  };
}

export function generateCosmicSignals(
  flows: Record<string, unknown>[],
  previousState: PreviousState,
): { alerts: CosmicAlert[]; nextState: PreviousState } {
  const now = Date.now();
  const alerts: CosmicAlert[] = [];
  const nextState: PreviousState = new Map(previousState);

  // First load — seed signals from real flow data
  if (previousState.size === 0) {
    const topFlows = flows.slice(0, 12);

    for (let i = 0; i < topFlows.length && alerts.length < 8; i++) {
      const f = topFlows[i];
      const id = (f.id as string) || `flow-${i}`;
      const exporter = (f.exporter_name as string) || '';
      const importer = (f.importer_name as string) || '';
      const dest = (f.destination_country as string) || '';
      const commodity = (f.commodity_description as string) || (f.commodity as string) || '';
      const commodityCat = (f.commodity_category as string) || '';
      const md = f.match_details as Record<string, unknown> | undefined;
      const vesselName = md?.vessel_name as string;
      const destCountry = (md?.destination_country as string) || dest;
      const ts = now - i * 4 * 60_000;

      // Determine alert type based on flow characteristics
      if (CRITICAL_MINERALS.includes(commodityCat)) {
        alerts.push(buildCosmicAlert(`seed-cma-${i}`, 'critical_mineral_alert',
          `${commodity || commodityCat} flow from ${(f.origin_country as string) || 'Unknown'}`, f, ts));
      } else if (vesselName && destCountry && ROUTE_CONFIRMED_COUNTRIES.some(c => destCountry.toLowerCase().includes(c))) {
        alerts.push(buildCosmicAlert(`seed-rc-${i}`, 'route_confirmed',
          `${vesselName} heading to ${destCountry}`, f, ts));
      } else if (exporter && isMajor(exporter)) {
        alerts.push(buildCosmicAlert(`seed-ds-${i}`, 'dominance_shift',
          `${exporter} consolidating ${commodity || 'commodity'} flows`, f, ts));
      } else if (dest && MAJOR_IMPORTERS.some(m => dest.toLowerCase().includes(m))) {
        const value = (f.declared_value_usd as number) || 0;
        if (value > 1e8) {
          alerts.push(buildCosmicAlert(`seed-dsurge-${i}`, 'demand_surge',
            `${dest} import surge — ${commodity}`, f, ts));
        } else {
          alerts.push(buildCosmicAlert(`seed-re-${i}`, 'route_expansion',
            `${dest} emerging as ${commodity} buyer`, f, ts));
        }
      } else if (exporter) {
        alerts.push(buildCosmicAlert(`seed-ee-${i}`, 'entity_entry',
          `${exporter} entered ${dest || 'export'} flows`, f, ts));
      }

      // Build initial state
      nextState.set(id, {
        entities: [exporter, importer].filter(Boolean),
        topEntity: exporter,
        topConfidence: (f.confidence_score as number) || 0.7,
        importer,
      });
    }

    return { alerts: alerts.sort((a, b) => b.impact_score - a.impact_score), nextState };
  }

  // Subsequent calls — comparative alerting
  for (const flow of flows.slice(0, 30)) {
    if (alerts.length >= 10) break;
    if (Math.random() > 0.40) continue;

    const id = (flow.id as string) || '';
    if (!id) continue;

    const prev = previousState.get(id);
    const currentEntities = [flow.exporter_name as string, flow.importer_name as string].filter(Boolean);
    const currentTop = (flow.exporter_name as string) || '';
    const currentConf = (flow.confidence_score as number) || 0.7;
    const currentImporter = (flow.importer_name as string) || '';
    const commodity = (flow.commodity_description as string) || (flow.commodity as string) || '';
    const commodityCat = (flow.commodity_category as string) || '';
    const dest = (flow.destination_country as string) || '';

    if (prev) {
      const delta = Math.abs(currentConf - prev.topConfidence);
      if (delta > 0.15 && currentTop) {
        alerts.push(buildCosmicAlert(`ds-${id}-${now}`, 'dominance_shift',
          `${currentTop} share shift detected`, flow, now));
      }

      const newEntities = currentEntities.filter(e => e && !prev.entities.includes(e));
      if (newEntities.length > 0) {
        alerts.push(buildCosmicAlert(`ee-${id}-${now}`, 'entity_entry',
          `${newEntities[0]} entered flow`, flow, now));
      }

      if (currentImporter && prev.importer && currentImporter !== prev.importer) {
        alerts.push(buildCosmicAlert(`re-${id}-${now}`, 'route_expansion',
          `Route shift: ${prev.importer} -> ${currentImporter}`, flow, now));
      }
    }

    // Route confirmed
    const md = flow.match_details as Record<string, unknown> | undefined;
    const vesselName = md?.vessel_name as string;
    const destCountry = (md?.destination_country as string) || dest;
    if (vesselName && destCountry && ROUTE_CONFIRMED_COUNTRIES.some(c => destCountry.toLowerCase().includes(c))) {
      alerts.push(buildCosmicAlert(`rc-${id}-${now}`, 'route_confirmed',
        `${vesselName} heading to ${destCountry}`, flow, now));
    }

    // Demand surge
    if (MAJOR_IMPORTERS.some(m => dest.toLowerCase().includes(m)) && (flow.declared_value_usd as number) > 1e8) {
      alerts.push(buildCosmicAlert(`dsurge-${id}-${now}`, 'demand_surge',
        `${dest} import surge — ${commodity}`, flow, now));
    }

    // Critical mineral
    if (CRITICAL_MINERALS.includes(commodityCat)) {
      const origin = (flow.origin_country as string) || '';
      alerts.push(buildCosmicAlert(`cma-${id}-${now}`, 'critical_mineral_alert',
        `${commodity || commodityCat} flow from ${origin}`, flow, now));
    }

    // New corridor
    if (!prev && currentTop) {
      const origin = (flow.origin_country as string) || '';
      if (dest && origin) {
        alerts.push(buildCosmicAlert(`nc-${id}-${now}`, 'new_corridor',
          `New corridor: ${origin} -> ${dest}`, flow, now));
      }
    }

    nextState.set(id, {
      entities: currentEntities,
      topEntity: currentTop,
      topConfidence: currentConf,
      importer: currentImporter,
    });
  }

  return {
    alerts: alerts.sort((a, b) => b.impact_score - a.impact_score).slice(0, 10),
    nextState,
  };
}
