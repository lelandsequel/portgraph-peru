/**
 * Core Intelligence Query API — Hero Workflow Endpoint
 *
 * POST { query: string, type: 'vessel' | 'company' | 'commodity' | 'country' | 'port' }
 * Returns full Trade Intelligence Profile with observed + enriched + inferred sections.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import {
  TradeIntelligenceProfile,
  IntelligenceFact,
  AnomalyFlag,
  QueryType,
  MINING_HS_CODES,
  PERU_PORTS,
  ConfidenceTier,
} from '@/lib/db/types';
import { normalizeVesselName, normalizeCompanyName } from '@/lib/pipeline/meteor';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://nipwrfsiiajddhisqkex.supabase.co';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || '';

function getSupabase(): SupabaseClient {
  return createClient(supabaseUrl, supabaseKey);
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { query, type } = body as { query: string; type: QueryType };

    if (!query || !type) {
      return NextResponse.json({ error: 'Missing query or type parameter' }, { status: 400 });
    }

    const supabase = getSupabase();
    const profile = await buildIntelligenceProfile(supabase, query.trim(), type);

    return NextResponse.json(profile);
  } catch (error) {
    console.error('Query API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

async function buildIntelligenceProfile(
  supabase: SupabaseClient,
  query: string,
  type: QueryType
): Promise<TradeIntelligenceProfile> {
  const observed: IntelligenceFact[] = [];
  const enriched: IntelligenceFact[] = [];
  const inferred: IntelligenceFact[] = [];
  const anomalies: AnomalyFlag[] = [];
  const chains: TradeIntelligenceProfile['chain_view'] = [];

  switch (type) {
    case 'vessel':
      await queryVessel(supabase, query, observed, enriched, inferred, anomalies, chains);
      break;
    case 'company':
      await queryCompany(supabase, query, observed, enriched, inferred, anomalies, chains);
      break;
    case 'commodity':
      await queryCommodity(supabase, query, observed, enriched, inferred, anomalies, chains);
      break;
    case 'country':
      await queryCountry(supabase, query, observed, enriched, inferred, anomalies, chains);
      break;
    case 'port':
      await queryPort(supabase, query, observed, enriched, inferred, anomalies, chains);
      break;
  }

  return {
    entity: query,
    entity_type: type,
    observed,
    enriched,
    inferred,
    anomalies,
    chain_view: chains,
    generated_at: new Date().toISOString(),
  };
}

// ============================================================
// QUERY BUILDERS
// ============================================================

async function queryVessel(
  supabase: SupabaseClient,
  query: string,
  observed: IntelligenceFact[],
  enriched: IntelligenceFact[],
  inferred: IntelligenceFact[],
  anomalies: AnomalyFlag[],
  chains: NonNullable<TradeIntelligenceProfile['chain_view']>
) {
  const normalized = normalizeVesselName(query);

  // Search trade flows by vessel name or IMO
  const { data: flows } = await supabase
    .from('peru_trade_flows')
    .select('*')
    .or(`vessel_name.ilike.%${normalized}%,imo_number.eq.${query}`)
    .order('arrival_time', { ascending: false })
    .limit(100);

  if (!flows || flows.length === 0) {
    // Try broader search
    const { data: broadFlows } = await supabase
      .from('peru_trade_flows')
      .select('*')
      .ilike('vessel_name', `%${query}%`)
      .order('arrival_time', { ascending: false })
      .limit(100);

    if (broadFlows) flows?.push(...broadFlows);
  }

  if (!flows || flows.length === 0) return;

  // Observed: Port calls
  const portCounts: Record<string, number> = {};
  for (const f of flows) {
    const port = f.peru_port || f.peru_port_unlocode;
    portCounts[port] = (portCounts[port] || 0) + 1;
  }
  const portSummary = Object.entries(portCounts).map(([p, c]) => `${c} at ${p}`).join(', ');
  observed.push(fact('Vessel calls', portSummary, 'observed', 0.95, 'HIGH', 'OEC BACI', flows[0]?.provenance || []));

  // Observed: Primary commodity
  const commodities: Record<string, number> = {};
  for (const f of flows) {
    if (f.commodity) commodities[f.commodity] = (commodities[f.commodity] || 0) + 1;
  }
  if (Object.keys(commodities).length > 0) {
    const primary = Object.entries(commodities).sort((a, b) => b[1] - a[1])[0];
    observed.push(fact('Primary commodity', primary[0], 'observed', 0.9, 'HIGH', 'OEC BACI', []));
  }

  // Observed: Exporter
  const exporters: Record<string, number> = {};
  for (const f of flows) {
    if (f.exporter_name) exporters[f.exporter_name] = (exporters[f.exporter_name] || 0) + 1;
  }
  if (Object.keys(exporters).length > 0) {
    const top = Object.entries(exporters).sort((a, b) => b[1] - a[1])[0];
    observed.push(fact('Exporter', top[0], 'observed', 0.9, 'HIGH', 'OEC BACI', []));
  }

  // Observed: Destinations
  const destinations: Record<string, number> = {};
  for (const f of flows) {
    if (f.destination_country) destinations[f.destination_country] = (destinations[f.destination_country] || 0) + 1;
  }
  if (Object.keys(destinations).length > 0) {
    const destStr = Object.entries(destinations)
      .sort((a, b) => b[1] - a[1])
      .map(([d, c]) => `${d} (${c})`)
      .join(', ');
    observed.push(fact('Destinations', destStr, 'observed', 0.9, 'HIGH', 'OEC BACI', []));
  }

  // Enriched: Flag state, vessel entity
  const flagStates = [...new Set(flows.map(f => f.flag_state).filter(Boolean))];
  if (flagStates.length > 0) {
    enriched.push(fact('Flag state', flagStates.join(', '), 'enriched', 0.85, 'MEDIUM', 'IMO Registry', []));
  }

  // Enriched: Importers/consignees
  const importers: Record<string, number> = {};
  for (const f of flows) {
    if (f.importer_name) importers[f.importer_name] = (importers[f.importer_name] || 0) + 1;
  }
  if (Object.keys(importers).length > 0) {
    const topImporters = Object.entries(importers).sort((a, b) => b[1] - a[1]).slice(0, 3);
    for (const [name, count] of topImporters) {
      enriched.push(fact(`Consignee`, `${name} (${count} shipments)`, 'enriched', 0.75, 'MEDIUM', 'COMET chain', []));
    }
  }

  // Inferred: Destination trends
  const sortedFlows = [...flows].sort((a, b) =>
    new Date(a.arrival_time || 0).getTime() - new Date(b.arrival_time || 0).getTime()
  );
  const recentDest: Record<string, number> = {};
  const olderDest: Record<string, number> = {};
  const midpoint = Math.floor(sortedFlows.length / 2);
  sortedFlows.forEach((f, i) => {
    if (f.destination_country) {
      if (i >= midpoint) recentDest[f.destination_country] = (recentDest[f.destination_country] || 0) + 1;
      else olderDest[f.destination_country] = (olderDest[f.destination_country] || 0) + 1;
    }
  });

  for (const [dest, count] of Object.entries(recentDest)) {
    const oldCount = olderDest[dest] || 0;
    if (count > oldCount && oldCount > 0) {
      const pctChange = Math.round(((count - oldCount) / oldCount) * 100);
      inferred.push(fact(`Emerging corridor`, `${dest} +${pctChange}% recent`, 'inferred', 0.65, 'MEDIUM', 'QUASAR', []));
    }
    if (oldCount === 0 && count >= 1) {
      inferred.push(fact(`New destination`, `${dest} (${count} call(s), no prior history)`, 'inferred', 0.5, 'LOW', 'QUASAR', []));
    }
  }

  // Build chain views
  for (const f of flows.slice(0, 5)) {
    chains.push({
      origin: f.origin_country || f.origin_port,
      peru_port: f.peru_port,
      vessel: f.vessel_name,
      destination: f.destination_country || f.destination_port,
      consignee: f.importer_name,
      confidence_tier: f.confidence_tier,
      sources: (f.provenance || []).map((p: { source_name: string }) => p.source_name),
    });
  }

  // Fetch anomalies
  const flowIds = flows.map(f => f.id);
  if (flowIds.length > 0) {
    const { data: flagData } = await supabase
      .from('anomaly_flags')
      .select('*')
      .in('trade_flow_id', flowIds);
    if (flagData) anomalies.push(...flagData);
  }
}

async function queryCompany(
  supabase: SupabaseClient,
  query: string,
  observed: IntelligenceFact[],
  enriched: IntelligenceFact[],
  inferred: IntelligenceFact[],
  anomalies: AnomalyFlag[],
  chains: NonNullable<TradeIntelligenceProfile['chain_view']>
) {
  const normalized = normalizeCompanyName(query);

  const { data: flows } = await supabase
    .from('peru_trade_flows')
    .select('*')
    .or(`exporter_name.ilike.%${normalized}%,importer_name.ilike.%${normalized}%,exporter_name.ilike.%${query}%,importer_name.ilike.%${query}%`)
    .order('arrival_time', { ascending: false })
    .limit(100);

  if (!flows || flows.length === 0) return;

  const isExporter = flows.some(f => f.exporter_name?.toUpperCase().includes(normalized));
  const role = isExporter ? 'Exporter' : 'Importer';

  observed.push(fact('Role', `${role} (${flows.length} records)`, 'observed', 0.9, 'HIGH', 'OEC BACI', []));

  // Commodities
  const commodities: Record<string, number> = {};
  for (const f of flows) {
    if (f.commodity) commodities[f.commodity] = (commodities[f.commodity] || 0) + 1;
  }
  if (Object.keys(commodities).length > 0) {
    observed.push(fact('Commodities', Object.entries(commodities).sort((a, b) => b[1] - a[1]).map(([c, n]) => `${c} (${n})`).join(', '), 'observed', 0.9, 'HIGH', 'OEC BACI', []));
  }

  // Ports
  const ports: Record<string, number> = {};
  for (const f of flows) ports[f.peru_port] = (ports[f.peru_port] || 0) + 1;
  observed.push(fact('Peru ports', Object.entries(ports).map(([p, c]) => `${p} (${c})`).join(', '), 'observed', 0.9, 'HIGH', 'OEC BACI', []));

  // Total volume
  const totalWeight = flows.reduce((sum, f) => sum + (f.weight_kg || 0), 0);
  if (totalWeight > 0) {
    observed.push(fact('Total volume', `${(totalWeight / 1000).toFixed(1)} tonnes`, 'observed', 0.85, 'HIGH', 'OEC BACI', []));
  }

  // Enriched: counterparties
  const counterparties: Record<string, number> = {};
  for (const f of flows) {
    const cp = isExporter ? f.importer_name : f.exporter_name;
    if (cp) counterparties[cp] = (counterparties[cp] || 0) + 1;
  }
  for (const [name, count] of Object.entries(counterparties).sort((a, b) => b[1] - a[1]).slice(0, 5)) {
    enriched.push(fact('Counterparty', `${name} (${count} transactions)`, 'enriched', 0.75, 'MEDIUM', 'COMET chain', []));
  }

  // Enriched: Vessels used
  const vessels: Record<string, number> = {};
  for (const f of flows) {
    if (f.vessel_name) vessels[f.vessel_name] = (vessels[f.vessel_name] || 0) + 1;
  }
  if (Object.keys(vessels).length > 0) {
    enriched.push(fact('Vessels', Object.entries(vessels).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([v, c]) => `${v} (${c})`).join(', '), 'enriched', 0.8, 'MEDIUM', 'OEC BACI + COMET', []));
  }

  // Destinations/origins
  const countries: Record<string, number> = {};
  for (const f of flows) {
    const c = isExporter ? f.destination_country : f.origin_country;
    if (c) countries[c] = (countries[c] || 0) + 1;
  }
  if (Object.keys(countries).length > 0) {
    enriched.push(fact(isExporter ? 'Destination countries' : 'Origin countries',
      Object.entries(countries).sort((a, b) => b[1] - a[1]).map(([c, n]) => `${c} (${n})`).join(', '),
      'enriched', 0.8, 'MEDIUM', 'COMET', []));
  }

  // Chain views
  for (const f of flows.slice(0, 5)) {
    chains.push({
      origin: f.origin_country,
      peru_port: f.peru_port,
      vessel: f.vessel_name,
      destination: f.destination_country,
      consignee: f.importer_name,
      confidence_tier: f.confidence_tier,
      sources: (f.provenance || []).map((p: { source_name: string }) => p.source_name),
    });
  }
}

async function queryCommodity(
  supabase: SupabaseClient,
  query: string,
  observed: IntelligenceFact[],
  enriched: IntelligenceFact[],
  inferred: IntelligenceFact[],
  anomalies: AnomalyFlag[],
  chains: NonNullable<TradeIntelligenceProfile['chain_view']>
) {
  // Match query to HS code or commodity name
  const queryUpper = query.toUpperCase();
  let hsFilter: string[] = [];

  // Check if query is an HS code
  if (/^\d{4,6}$/.test(query)) {
    hsFilter = [query];
  } else {
    // Search by commodity name
    for (const [code, info] of Object.entries(MINING_HS_CODES)) {
      if (info.description.toUpperCase().includes(queryUpper) || info.category.toUpperCase().includes(queryUpper.replace(/\s+/g, '_'))) {
        hsFilter.push(code);
      }
    }
    // Common aliases
    if (queryUpper.includes('COPPER')) hsFilter.push('2603', '7401', '7403');
    if (queryUpper.includes('ZINC')) hsFilter.push('2608');
    if (queryUpper.includes('LEAD')) hsFilter.push('2607');
  }

  let flows: Record<string, unknown>[] = [];

  if (hsFilter.length > 0) {
    // Build OR filter for HS code prefixes
    const orFilters = hsFilter.map(hs => `hs_code.like.${hs}%`).join(',');
    const { data } = await supabase
      .from('peru_trade_flows')
      .select('*')
      .or(orFilters)
      .order('arrival_time', { ascending: false })
      .limit(200);
    if (data) flows = data;
  }

  if (flows.length === 0) {
    // Try text search on commodity field
    const { data } = await supabase
      .from('peru_trade_flows')
      .select('*')
      .or(`commodity.ilike.%${query}%,commodity_category.ilike.%${query}%`)
      .order('arrival_time', { ascending: false })
      .limit(200);
    if (data) flows = data;
  }

  if (flows.length === 0) return;

  // Total volume
  const totalWeight = flows.reduce((sum, f) => sum + ((f as { weight_kg?: number }).weight_kg || 0), 0);
  observed.push(fact('Total shipments', `${flows.length} records, ${(totalWeight / 1000).toFixed(1)} tonnes`, 'observed', 0.9, 'HIGH', 'OEC BACI', []));

  // Port breakdown
  const ports: Record<string, { count: number; weight: number }> = {};
  for (const f of flows as { peru_port: string; weight_kg?: number }[]) {
    if (!ports[f.peru_port]) ports[f.peru_port] = { count: 0, weight: 0 };
    ports[f.peru_port].count++;
    ports[f.peru_port].weight += f.weight_kg || 0;
  }
  observed.push(fact('Peru ports',
    Object.entries(ports).map(([p, d]) => `${p}: ${d.count} shipments, ${(d.weight / 1000).toFixed(1)}t`).join('; '),
    'observed', 0.9, 'HIGH', 'OEC BACI', []));

  // Top exporters
  const exporters: Record<string, number> = {};
  for (const f of flows as { exporter_name?: string }[]) {
    if (f.exporter_name) exporters[f.exporter_name] = (exporters[f.exporter_name] || 0) + 1;
  }
  for (const [name, count] of Object.entries(exporters).sort((a, b) => b[1] - a[1]).slice(0, 5)) {
    enriched.push(fact('Top exporter', `${name} (${count} shipments)`, 'enriched', 0.8, 'MEDIUM', 'OEC BACI + METEOR', []));
  }

  // Top destination countries
  const destinations: Record<string, number> = {};
  for (const f of flows as { destination_country?: string }[]) {
    if (f.destination_country) destinations[f.destination_country] = (destinations[f.destination_country] || 0) + 1;
  }
  for (const [dest, count] of Object.entries(destinations).sort((a, b) => b[1] - a[1]).slice(0, 5)) {
    enriched.push(fact('Top destination', `${dest} (${count} shipments)`, 'enriched', 0.8, 'MEDIUM', 'OEC BACI + COMET', []));
  }

  // Top importers
  const importers: Record<string, number> = {};
  for (const f of flows as { importer_name?: string }[]) {
    if (f.importer_name) importers[f.importer_name] = (importers[f.importer_name] || 0) + 1;
  }
  for (const [name, count] of Object.entries(importers).sort((a, b) => b[1] - a[1]).slice(0, 3)) {
    inferred.push(fact('Probable buyer', `${name} (${count} linked shipments)`, 'inferred', 0.65, 'MEDIUM', 'COMET chain', []));
  }

  // Year-over-year analysis per destination country
  const byCountryYear: Record<string, Record<number, number>> = {};
  for (const f of flows as { destination_country?: string; arrival_time?: string; declared_value_usd?: number }[]) {
    if (!f.destination_country || !f.arrival_time) continue;
    const year = new Date(f.arrival_time).getFullYear();
    if (!byCountryYear[f.destination_country]) byCountryYear[f.destination_country] = {};
    byCountryYear[f.destination_country][year] = (byCountryYear[f.destination_country][year] || 0) + (f.declared_value_usd || 0);
  }

  const sortedYears = [...new Set(
    (flows as { arrival_time?: string }[])
      .map(f => f.arrival_time ? new Date(f.arrival_time).getFullYear() : 0)
      .filter(y => y > 0)
  )].sort();

  if (sortedYears.length >= 2) {
    const prevYear = sortedYears[sortedYears.length - 2];
    const lastYear = sortedYears[sortedYears.length - 1];

    for (const [country, yearVals] of Object.entries(byCountryYear)) {
      const prev = yearVals[prevYear] || 0;
      const last = yearVals[lastYear] || 0;

      if (prev > 0 && last > 0) {
        const pctChange = Math.round(((last - prev) / prev) * 100);
        if (pctChange > 25) {
          inferred.push(fact(
            'Emerging corridor',
            `${country}: +${pctChange}% YoY (${prevYear}→${lastYear})`,
            'inferred', 0.7, 'MEDIUM', 'QUASAR YoY', []
          ));
        }
      }

      // New relationship: appears only in recent year(s), no prior history
      const appearsIn = Object.keys(yearVals).map(Number).sort();
      if (appearsIn.length <= 2 && appearsIn[0] >= sortedYears[sortedYears.length - 2]) {
        inferred.push(fact(
          'New relationship',
          `${country}: first appeared ${appearsIn[0]}, no prior trade history`,
          'inferred', 0.55, 'LOW', 'QUASAR YoY', []
        ));
      }
    }
  }

  // Chain views
  for (const f of (flows as TradeFlowRow[]).slice(0, 5)) {
    chains.push({
      origin: f.origin_country,
      peru_port: f.peru_port,
      vessel: f.vessel_name,
      destination: f.destination_country,
      consignee: f.importer_name,
      confidence_tier: f.confidence_tier,
      sources: (f.provenance || []).map((p: { source_name: string }) => p.source_name),
    });
  }
}

type TradeFlowRow = {
  origin_country?: string;
  peru_port: string;
  vessel_name?: string;
  destination_country?: string;
  importer_name?: string;
  confidence_tier: ConfidenceTier;
  provenance?: { source_name: string }[];
};

async function queryCountry(
  supabase: SupabaseClient,
  query: string,
  observed: IntelligenceFact[],
  enriched: IntelligenceFact[],
  inferred: IntelligenceFact[],
  anomalies: AnomalyFlag[],
  chains: NonNullable<TradeIntelligenceProfile['chain_view']>
) {
  const queryUpper = query.toUpperCase();

  const { data: flows } = await supabase
    .from('peru_trade_flows')
    .select('*')
    .or(`destination_country.ilike.%${queryUpper}%,origin_country.ilike.%${queryUpper}%`)
    .order('arrival_time', { ascending: false })
    .limit(200);

  if (!flows || flows.length === 0) return;

  observed.push(fact('Trade records', `${flows.length} shipments involving ${query}`, 'observed', 0.9, 'HIGH', 'OEC BACI', []));

  // Commodities
  const commodities: Record<string, number> = {};
  for (const f of flows) {
    if (f.commodity) commodities[f.commodity] = (commodities[f.commodity] || 0) + 1;
  }
  if (Object.keys(commodities).length > 0) {
    observed.push(fact('Commodities',
      Object.entries(commodities).sort((a, b) => b[1] - a[1]).map(([c, n]) => `${c} (${n})`).join(', '),
      'observed', 0.9, 'HIGH', 'OEC BACI', []));
  }

  // Volumes
  const totalWeight = flows.reduce((sum: number, f: { weight_kg?: number }) => sum + (f.weight_kg || 0), 0);
  if (totalWeight > 0) {
    observed.push(fact('Total volume', `${(totalWeight / 1000).toFixed(1)} tonnes`, 'observed', 0.85, 'HIGH', 'OEC BACI', []));
  }

  // Companies
  const companies: Record<string, number> = {};
  for (const f of flows) {
    if (f.importer_name) companies[f.importer_name] = (companies[f.importer_name] || 0) + 1;
    if (f.exporter_name) companies[f.exporter_name] = (companies[f.exporter_name] || 0) + 1;
  }
  for (const [name, count] of Object.entries(companies).sort((a, b) => b[1] - a[1]).slice(0, 5)) {
    enriched.push(fact('Key company', `${name} (${count} transactions)`, 'enriched', 0.75, 'MEDIUM', 'COMET', []));
  }

  for (const f of flows.slice(0, 5)) {
    chains.push({
      origin: f.origin_country,
      peru_port: f.peru_port,
      vessel: f.vessel_name,
      destination: f.destination_country,
      consignee: f.importer_name,
      confidence_tier: f.confidence_tier,
      sources: (f.provenance || []).map((p: { source_name: string }) => p.source_name),
    });
  }
}

async function queryPort(
  supabase: SupabaseClient,
  query: string,
  observed: IntelligenceFact[],
  enriched: IntelligenceFact[],
  inferred: IntelligenceFact[],
  anomalies: AnomalyFlag[],
  chains: NonNullable<TradeIntelligenceProfile['chain_view']>
) {
  const queryUpper = query.toUpperCase();
  let unlocode = queryUpper;

  // Resolve port name to UNLOCODE
  for (const [code, info] of Object.entries(PERU_PORTS)) {
    if (info.name.toUpperCase() === queryUpper || code === queryUpper) {
      unlocode = code;
      break;
    }
  }

  const { data: flows } = await supabase
    .from('peru_trade_flows')
    .select('*')
    .or(`peru_port_unlocode.eq.${unlocode},peru_port.ilike.%${query}%`)
    .order('arrival_time', { ascending: false })
    .limit(200);

  if (!flows || flows.length === 0) return;

  observed.push(fact('Total activity', `${flows.length} trade flows`, 'observed', 0.95, 'HIGH', 'OEC BACI', []));

  // Vessels
  const vessels = [...new Set(flows.map((f: { vessel_name?: string }) => f.vessel_name).filter(Boolean))];
  observed.push(fact('Unique vessels', `${vessels.length}`, 'observed', 0.9, 'HIGH', 'OEC BACI', []));

  // Commodities
  const commodities: Record<string, number> = {};
  for (const f of flows) {
    if (f.commodity) commodities[f.commodity] = (commodities[f.commodity] || 0) + 1;
  }
  if (Object.keys(commodities).length > 0) {
    observed.push(fact('Commodities',
      Object.entries(commodities).sort((a, b) => b[1] - a[1]).map(([c, n]) => `${c} (${n})`).join(', '),
      'observed', 0.9, 'HIGH', 'OEC BACI', []));
  }

  // Destinations
  const destinations: Record<string, number> = {};
  for (const f of flows) {
    if (f.destination_country) destinations[f.destination_country] = (destinations[f.destination_country] || 0) + 1;
  }
  for (const [dest, count] of Object.entries(destinations).sort((a, b) => b[1] - a[1]).slice(0, 5)) {
    enriched.push(fact('Destination', `${dest} (${count} shipments)`, 'enriched', 0.8, 'MEDIUM', 'OEC BACI + COMET', []));
  }

  // Top exporters
  const exporters: Record<string, number> = {};
  for (const f of flows) {
    if (f.exporter_name) exporters[f.exporter_name] = (exporters[f.exporter_name] || 0) + 1;
  }
  for (const [name, count] of Object.entries(exporters).sort((a, b) => b[1] - a[1]).slice(0, 3)) {
    enriched.push(fact('Top exporter', `${name} (${count})`, 'enriched', 0.75, 'MEDIUM', 'OEC BACI + METEOR', []));
  }

  for (const f of flows.slice(0, 5)) {
    chains.push({
      origin: f.origin_country,
      peru_port: f.peru_port,
      vessel: f.vessel_name,
      destination: f.destination_country,
      consignee: f.importer_name,
      confidence_tier: f.confidence_tier,
      sources: (f.provenance || []).map((p: { source_name: string }) => p.source_name),
    });
  }

  // Anomalies for this port
  const flowIds = flows.map((f: { id: string }) => f.id);
  if (flowIds.length > 0) {
    const { data: flagData } = await supabase
      .from('anomaly_flags')
      .select('*')
      .in('trade_flow_id', flowIds);
    if (flagData) anomalies.push(...flagData);
  }
}

// Helper
function fact(
  label: string,
  value: string,
  section: 'observed' | 'enriched' | 'inferred',
  score: number,
  tier: ConfidenceTier,
  source: string,
  provenance: ProvenanceRecord[]
): IntelligenceFact {
  return { label, value, section, confidence_score: score, confidence_tier: tier, source, provenance };
}

type ProvenanceRecord = { source_name: string; source_url?: string; fetch_timestamp: string; field: string };
