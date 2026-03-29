/**
 * COMET — Lineage Reconstruction Pipeline
 *
 * Links vessel call (AIS) → manifest (SUNAT) via time window + port + vessel match.
 * Output: full origin→Peru→destination chain with confidence.
 * HIGH = all three match, MEDIUM = two sources, LOW = inferred from pattern only.
 */

import { SupabaseClient } from '@supabase/supabase-js';
import { TradeFlow, ConfidenceTier, ProvenanceRecord, MINING_HS_CODES } from '../db/types';
import { normalizeVesselName, resolveVessel, resolveCompany } from './meteor';

const TIME_WINDOW_HOURS = 48;

interface MatchCandidate {
  port_call: Record<string, unknown>;
  manifest: Record<string, unknown>;
  match_score: number;
  match_reasons: string[];
}

function getConfidenceTier(score: number): ConfidenceTier {
  if (score >= 0.85) return 'HIGH';
  if (score >= 0.6) return 'MEDIUM';
  return 'LOW';
}

function hoursApart(a: string | null, b: string | null): number | null {
  if (!a || !b) return null;
  const diff = Math.abs(new Date(a).getTime() - new Date(b).getTime());
  return diff / (1000 * 60 * 60);
}

function buildProvenance(sources: { name: string; url?: string; field: string; raw?: string; normalized?: string }[]): ProvenanceRecord[] {
  return sources.map(s => ({
    source_name: s.name,
    source_url: s.url,
    fetch_timestamp: new Date().toISOString(),
    field: s.field,
    raw_value: s.raw,
    normalized_value: s.normalized,
  }));
}

/**
 * Match port calls to cargo manifests and build trade flow chains.
 */
export async function runCometPipeline(supabase: SupabaseClient): Promise<{
  chains_built: number;
  high_confidence: number;
  medium_confidence: number;
  low_confidence: number;
  unmatched_calls: number;
}> {
  let chains_built = 0;
  let high_confidence = 0;
  let medium_confidence = 0;
  let low_confidence = 0;
  let unmatched_calls = 0;

  // Fetch all normalized port calls
  const { data: portCalls } = await supabase
    .from('peru_port_calls')
    .select('*')
    .order('arrival_time', { ascending: false });

  // Fetch all normalized cargo manifests
  const { data: manifests } = await supabase
    .from('peru_cargo_manifests')
    .select('*');

  if (!portCalls || portCalls.length === 0) {
    return { chains_built: 0, high_confidence: 0, medium_confidence: 0, low_confidence: 0, unmatched_calls: 0 };
  }

  for (const call of portCalls) {
    const candidates: MatchCandidate[] = [];

    if (manifests) {
      for (const manifest of manifests) {
        let matchScore = 0;
        const reasons: string[] = [];

        // Port match
        if (call.port_unlocode === manifest.port_unlocode) {
          matchScore += 0.3;
          reasons.push('port_match');
        }

        // Vessel name match
        if (call.vessel_name && manifest.vessel_name) {
          const callName = normalizeVesselName(call.vessel_name);
          const manifestName = normalizeVesselName(manifest.vessel_name);
          if (callName === manifestName) {
            matchScore += 0.35;
            reasons.push('vessel_name_exact');
          }
        }

        // IMO match
        if (call.imo_number && manifest.vessel_imo && call.imo_number === manifest.vessel_imo) {
          matchScore += 0.4;
          reasons.push('imo_match');
        }

        // Time window match
        const timeDiff = hoursApart(call.arrival_time, manifest.declaration_date);
        if (timeDiff !== null && timeDiff <= TIME_WINDOW_HOURS) {
          matchScore += 0.2;
          reasons.push(`time_window_${Math.round(timeDiff)}h`);
        }

        // Commodity is mining-related
        if (manifest.hs_code) {
          const prefix = manifest.hs_code.substring(0, 4);
          if (MINING_HS_CODES[prefix]) {
            matchScore += 0.05;
            reasons.push('mining_commodity');
          }
        }

        if (reasons.length >= 2 && matchScore > 0.4) {
          candidates.push({ port_call: call, manifest, match_score: matchScore, match_reasons: reasons });
        }
      }
    }

    if (candidates.length === 0) {
      // Create a flow from port call alone (low confidence)
      const flow = await buildFlowFromCallOnly(supabase, call);
      if (flow) {
        low_confidence++;
        chains_built++;
      } else {
        unmatched_calls++;
      }
      continue;
    }

    // Pick best match
    candidates.sort((a, b) => b.match_score - a.match_score);
    const best = candidates[0];
    const tier = getConfidenceTier(best.match_score);

    const flow = await buildFullFlow(supabase, best, tier);
    if (flow) {
      chains_built++;
      if (tier === 'HIGH') high_confidence++;
      else if (tier === 'MEDIUM') medium_confidence++;
      else low_confidence++;
    }
  }

  return { chains_built, high_confidence, medium_confidence, low_confidence, unmatched_calls };
}

async function buildFullFlow(
  supabase: SupabaseClient,
  match: MatchCandidate,
  tier: ConfidenceTier
): Promise<TradeFlow | null> {
  const call = match.port_call as Record<string, string | number | null>;
  const manifest = match.manifest as Record<string, string | number | null>;

  // Resolve entities
  let vesselEntityId: string | undefined;
  let exporterEntityId: string | undefined;
  let importerEntityId: string | undefined;

  if (call.vessel_name) {
    const vr = await resolveVessel(supabase, call.vessel_name as string, call.imo_number as string | undefined);
    vesselEntityId = vr.entity.id;
  }
  if (manifest.exporter_name) {
    const er = await resolveCompany(supabase, manifest.exporter_name as string, 'PE');
    exporterEntityId = er.entity.id;
  }
  if (manifest.importer_name) {
    const ir = await resolveCompany(supabase, manifest.importer_name as string, manifest.country_of_destination as string | undefined);
    importerEntityId = ir.entity.id;
  }

  const hsPrefix = manifest.hs_code ? (manifest.hs_code as string).substring(0, 4) : '';
  const commodityInfo = MINING_HS_CODES[hsPrefix];

  const provenance = buildProvenance([
    { name: call.source_name as string, url: call.source_url as string, field: 'vessel_call', raw: call.vessel_name as string },
    { name: manifest.source_name as string, url: manifest.source_url as string, field: 'manifest', raw: manifest.manifest_number as string },
  ]);

  const flowData = {
    port_call_id: call.id as string,
    manifest_id: manifest.id as string,
    vessel_entity_id: vesselEntityId,
    exporter_entity_id: exporterEntityId,
    importer_entity_id: importerEntityId,
    vessel_name: call.vessel_name as string,
    imo_number: call.imo_number as string | null,
    flag_state: call.flag_state as string | null,
    exporter_name: manifest.exporter_name as string | null,
    importer_name: manifest.importer_name as string | null,
    commodity: commodityInfo?.description || manifest.commodity_description as string | null,
    hs_code: manifest.hs_code as string | null,
    commodity_category: commodityInfo?.category || null,
    weight_kg: manifest.weight_kg as number | null,
    declared_value_usd: manifest.declared_value_usd as number | null,
    origin_country: manifest.country_of_origin as string || call.origin_country as string,
    origin_port: call.origin_port as string | null,
    peru_port: call.port_name as string,
    peru_port_unlocode: call.port_unlocode as string,
    destination_port: call.destination_port as string | null,
    destination_country: manifest.country_of_destination as string || call.destination_country as string,
    arrival_time: call.arrival_time as string | null,
    departure_time: call.departure_time as string | null,
    match_method: match.match_reasons.includes('imo_match') ? 'full_match' : match.match_reasons.includes('vessel_name_exact') ? 'vessel_time' : 'port_commodity',
    match_details: { score: match.match_score, reasons: match.match_reasons },
    confidence_score: match.match_score,
    confidence_tier: tier,
    provenance,
    is_flagged: tier === 'LOW' || match.match_score < 0.8,
    flag_reasons: match.match_score < 0.8 ? ['low_confidence_match'] : [],
  };

  const { data, error } = await supabase
    .from('peru_trade_flows')
    .insert(flowData)
    .select()
    .single();

  if (error) {
    console.error('COMET: Failed to insert trade flow:', error.message);
    return null;
  }

  return data as TradeFlow;
}

async function buildFlowFromCallOnly(
  supabase: SupabaseClient,
  call: Record<string, unknown>
): Promise<TradeFlow | null> {
  let vesselEntityId: string | undefined;
  if (call.vessel_name) {
    const vr = await resolveVessel(supabase, call.vessel_name as string, call.imo_number as string | undefined);
    vesselEntityId = vr.entity.id;
  }

  const provenance = buildProvenance([
    { name: call.source_name as string, url: call.source_url as string, field: 'vessel_call', raw: call.vessel_name as string },
  ]);

  const flowData = {
    vessel_entity_id: vesselEntityId,
    vessel_name: call.vessel_name as string,
    imo_number: call.imo_number as string | null,
    flag_state: call.flag_state as string | null,
    origin_country: call.origin_country as string | null,
    origin_port: call.origin_port as string | null,
    peru_port: call.port_name as string,
    peru_port_unlocode: call.port_unlocode as string,
    destination_port: call.destination_port as string | null,
    destination_country: call.destination_country as string | null,
    arrival_time: call.arrival_time as string | null,
    departure_time: call.departure_time as string | null,
    match_method: 'inferred',
    match_details: { note: 'No manifest match — vessel call only' },
    confidence_score: 0.3,
    confidence_tier: 'LOW' as ConfidenceTier,
    provenance,
    is_flagged: true,
    flag_reasons: ['no_manifest_match'],
  };

  const { data, error } = await supabase
    .from('peru_trade_flows')
    .insert(flowData)
    .select()
    .single();

  if (error) {
    console.error('COMET: Failed to insert call-only flow:', error.message);
    return null;
  }

  return data as TradeFlow;
}
