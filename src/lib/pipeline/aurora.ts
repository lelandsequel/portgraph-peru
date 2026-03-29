/**
 * AURORA — Trust Validation + Provenance Pipeline
 *
 * Assigns confidence score per record/relationship, provenance chain,
 * contradiction flags, missing-data markers.
 * Rule: AURORA score < 0.80 on an inferred relationship = flagged, not hidden.
 */

import { SupabaseClient } from '@supabase/supabase-js';
import { ConfidenceTier, ProvenanceRecord, AnomalyFlag } from '../db/types';

export function computeConfidenceTier(score: number): ConfidenceTier {
  if (score >= 0.85) return 'HIGH';
  if (score >= 0.6) return 'MEDIUM';
  return 'LOW';
}

interface ValidationResult {
  confidence_score: number;
  confidence_tier: ConfidenceTier;
  is_flagged: boolean;
  flag_reasons: string[];
  provenance: ProvenanceRecord[];
}

/**
 * Validate and score a port call record.
 */
export function validatePortCall(record: {
  vessel_name?: string;
  imo_number?: string;
  port_unlocode?: string;
  arrival_time?: string;
  source_name: string;
  source_url?: string;
}): ValidationResult {
  let score = 0.5; // base
  const flags: string[] = [];
  const provenance: ProvenanceRecord[] = [];

  // IMO present = +0.2
  if (record.imo_number) {
    score += 0.2;
    provenance.push({
      source_name: record.source_name,
      source_url: record.source_url,
      fetch_timestamp: new Date().toISOString(),
      field: 'imo_number',
      raw_value: record.imo_number,
    });
  } else {
    flags.push('missing_imo');
  }

  // Vessel name present = +0.15
  if (record.vessel_name) {
    score += 0.15;
    provenance.push({
      source_name: record.source_name,
      source_url: record.source_url,
      fetch_timestamp: new Date().toISOString(),
      field: 'vessel_name',
      raw_value: record.vessel_name,
    });
  } else {
    flags.push('missing_vessel_name');
  }

  // Valid arrival time = +0.1
  if (record.arrival_time) {
    const d = new Date(record.arrival_time);
    if (!isNaN(d.getTime())) {
      score += 0.1;
    } else {
      flags.push('invalid_arrival_time');
    }
  } else {
    flags.push('missing_arrival_time');
  }

  // Valid port = +0.05
  if (record.port_unlocode && ['PECLL', 'PEMRI'].includes(record.port_unlocode)) {
    score += 0.05;
  }

  const tier = computeConfidenceTier(score);
  return {
    confidence_score: Math.min(score, 1.0),
    confidence_tier: tier,
    is_flagged: score < 0.8 || flags.length > 0,
    flag_reasons: flags,
    provenance,
  };
}

/**
 * Validate and score a cargo manifest record.
 */
export function validateManifest(record: {
  exporter_name?: string;
  importer_name?: string;
  hs_code?: string;
  weight_kg?: number;
  declared_value_usd?: number;
  vessel_name?: string;
  vessel_imo?: string;
  source_name: string;
  source_url?: string;
}): ValidationResult {
  let score = 0.5;
  const flags: string[] = [];
  const provenance: ProvenanceRecord[] = [];

  if (record.exporter_name) {
    score += 0.1;
    provenance.push({
      source_name: record.source_name,
      source_url: record.source_url,
      fetch_timestamp: new Date().toISOString(),
      field: 'exporter_name',
      raw_value: record.exporter_name,
    });
  } else {
    flags.push('missing_exporter');
  }

  if (record.importer_name) {
    score += 0.1;
    provenance.push({
      source_name: record.source_name,
      source_url: record.source_url,
      fetch_timestamp: new Date().toISOString(),
      field: 'importer_name',
      raw_value: record.importer_name,
    });
  } else {
    flags.push('missing_importer');
  }

  if (record.hs_code) {
    score += 0.1;
    provenance.push({
      source_name: record.source_name,
      source_url: record.source_url,
      fetch_timestamp: new Date().toISOString(),
      field: 'hs_code',
      raw_value: record.hs_code,
    });
  } else {
    flags.push('missing_hs_code');
  }

  if (record.weight_kg && record.weight_kg > 0) {
    score += 0.05;
  }

  if (record.declared_value_usd && record.declared_value_usd > 0) {
    score += 0.05;
  }

  if (record.vessel_imo) {
    score += 0.1;
  } else if (record.vessel_name) {
    score += 0.05;
    flags.push('manifest_vessel_name_only');
  } else {
    flags.push('missing_vessel_reference');
  }

  const tier = computeConfidenceTier(score);
  return {
    confidence_score: Math.min(score, 1.0),
    confidence_tier: tier,
    is_flagged: score < 0.8 || flags.length > 0,
    flag_reasons: flags,
    provenance,
  };
}

/**
 * Detect anomalies across trade flows.
 */
export async function detectAnomalies(supabase: SupabaseClient): Promise<AnomalyFlag[]> {
  const anomalies: AnomalyFlag[] = [];

  // Fetch all trade flows
  const { data: flows } = await supabase
    .from('peru_trade_flows')
    .select('*')
    .order('arrival_time', { ascending: false });

  if (!flows || flows.length === 0) return [];

  // 1. New destination detection
  const destinationFirstSeen: Record<string, { flow_id: string; date: string }> = {};
  const destinationHistory: Record<string, number> = {};

  // Sort by arrival time ascending for history building
  const sortedFlows = [...flows].sort((a, b) =>
    new Date(a.arrival_time || 0).getTime() - new Date(b.arrival_time || 0).getTime()
  );

  for (const flow of sortedFlows) {
    const dest = flow.destination_country;
    if (!dest) continue;

    if (!destinationHistory[dest]) {
      destinationHistory[dest] = 0;
      destinationFirstSeen[dest] = { flow_id: flow.id, date: flow.arrival_time };
    }
    destinationHistory[dest]++;
  }

  // Flag destinations with very few appearances (new corridors)
  for (const [dest, count] of Object.entries(destinationHistory)) {
    if (count <= 2 && destinationFirstSeen[dest]) {
      anomalies.push({
        trade_flow_id: destinationFirstSeen[dest].flow_id,
        anomaly_type: 'new_destination',
        description: `New destination country: ${dest} (first seen: ${destinationFirstSeen[dest].date}, ${count} call(s))`,
        severity: 'MEDIUM',
        supporting_data: { destination: dest, call_count: count, first_seen: destinationFirstSeen[dest].date },
      });
    }
  }

  // 2. Volume spike detection per port
  const portVolumes: Record<string, number[]> = {};
  for (const flow of sortedFlows) {
    const port = flow.peru_port_unlocode;
    if (!port || !flow.weight_kg) continue;
    if (!portVolumes[port]) portVolumes[port] = [];
    portVolumes[port].push(flow.weight_kg);
  }

  for (const [port, volumes] of Object.entries(portVolumes)) {
    if (volumes.length < 3) continue;
    const avg = volumes.slice(0, -1).reduce((a, b) => a + b, 0) / (volumes.length - 1);
    const latest = volumes[volumes.length - 1];
    const stddev = Math.sqrt(volumes.slice(0, -1).map(v => (v - avg) ** 2).reduce((a, b) => a + b, 0) / (volumes.length - 1));

    if (stddev > 0 && (latest - avg) / stddev > 2) {
      anomalies.push({
        anomaly_type: 'volume_spike',
        description: `Volume spike at ${port}: latest shipment ${Math.round(latest / 1000)}t vs ${Math.round(avg / 1000)}t average (>${Math.round(((latest - avg) / avg) * 100)}%)`,
        severity: 'HIGH',
        supporting_data: { port, latest_kg: latest, average_kg: avg, std_deviations: (latest - avg) / stddev },
      });
    }
  }

  // 3. New counterparty detection
  const importerHistory: Record<string, { count: number; first_flow_id: string; first_date: string }> = {};
  for (const flow of sortedFlows) {
    if (!flow.importer_name) continue;
    if (!importerHistory[flow.importer_name]) {
      importerHistory[flow.importer_name] = { count: 0, first_flow_id: flow.id, first_date: flow.arrival_time };
    }
    importerHistory[flow.importer_name].count++;
  }

  for (const [importer, data] of Object.entries(importerHistory)) {
    if (data.count <= 1) {
      anomalies.push({
        trade_flow_id: data.first_flow_id,
        anomaly_type: 'new_counterparty',
        description: `New counterparty: ${importer} (first appearance, ${data.count} transaction(s))`,
        severity: 'MEDIUM',
        supporting_data: { importer, first_seen: data.first_date },
      });
    }
  }

  // Insert anomalies into database
  if (anomalies.length > 0) {
    const { error } = await supabase
      .from('anomaly_flags')
      .insert(anomalies);

    if (error) {
      console.error('AURORA: Failed to insert anomalies:', error.message);
    }
  }

  return anomalies;
}

/**
 * Run AURORA validation on all trade flows — flag low confidence records.
 */
export async function runAuroraPipeline(supabase: SupabaseClient): Promise<{
  flows_validated: number;
  flagged_count: number;
  anomalies_detected: number;
}> {
  // Re-score existing trade flows
  const { data: flows } = await supabase
    .from('peru_trade_flows')
    .select('*');

  let flows_validated = 0;
  let flagged_count = 0;

  if (flows) {
    for (const flow of flows) {
      const isFlagged = flow.confidence_score < 0.8;
      const flags = [...(flow.flag_reasons || [])];

      if (isFlagged && !flags.includes('aurora_low_confidence')) {
        flags.push('aurora_low_confidence');
      }

      // Check for missing data
      if (!flow.exporter_name) flags.push('missing_exporter');
      if (!flow.importer_name) flags.push('missing_importer');
      if (!flow.hs_code) flags.push('missing_commodity');
      if (!flow.destination_country) flags.push('missing_destination');

      const needsUpdate = isFlagged !== flow.is_flagged || flags.length !== (flow.flag_reasons || []).length;
      if (needsUpdate) {
        await supabase
          .from('peru_trade_flows')
          .update({
            is_flagged: isFlagged || flags.length > 0,
            flag_reasons: [...new Set(flags)],
            confidence_tier: computeConfidenceTier(flow.confidence_score),
          })
          .eq('id', flow.id);
      }

      flows_validated++;
      if (isFlagged || flags.length > 0) flagged_count++;
    }
  }

  // Detect anomalies
  const anomalies = await detectAnomalies(supabase);

  return {
    flows_validated,
    flagged_count,
    anomalies_detected: anomalies.length,
  };
}
