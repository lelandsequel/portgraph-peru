/**
 * OEC (Observatory of Economic Complexity) Tesseract API Ingestor
 *
 * Fetches bilateral trade flow data for Peru's mining exports:
 *   - Copper Ore/Concentrate (HS 2603)
 *   - Zinc Ore (HS 2608)
 *   - Lead Ore (HS 2607)
 *   - Precipitated Copper (HS 7401)
 *   - Refined Copper (HS 7403)
 *
 * Source: OEC BACI dataset (annual bilateral trade, 2019-2022)
 * No API key required. All responses are gzip-compressed.
 */

import { SupabaseClient } from '@supabase/supabase-js';
import { CommodityCategory, ConfidenceTier, ProvenanceRecord } from '../db/types';
import { computeConfidenceTier } from '../pipeline/aurora';

const OEC_BASE = 'https://api.oec.world/tesseract/data.jsonrecords';
const PERU_COUNTRY_ID = 'saper';
const YEARS = [2019, 2020, 2021, 2022];

// OEC HS4 IDs confirmed from API
const OEC_COMMODITIES: {
  hs4_id: number;
  hs_code: string;
  name: string;
  category: CommodityCategory;
}[] = [
  { hs4_id: 52603, hs_code: '2603', name: 'Copper Ore/Concentrate', category: 'copper_ore' },
  { hs4_id: 52608, hs_code: '2608', name: 'Zinc Ore/Concentrate', category: 'zinc_ore' },
  { hs4_id: 52607, hs_code: '2607', name: 'Lead Ore/Concentrate', category: 'lead_ore' },
  { hs4_id: 157401, hs_code: '7401', name: 'Precipitated Copper', category: 'copper_matte' },
  { hs4_id: 157403, hs_code: '7403', name: 'Refined Copper', category: 'refined_copper' },
];

interface OECRecord {
  'Country ID': string;
  'Country': string;
  'HS4 ID': number;
  'HS4': string;
  'Year': number;
  'Trade Value': number;
  'Quantity': number;
}

/**
 * Fetch all Peru mining export data from OEC in a single request.
 */
async function fetchOECData(): Promise<OECRecord[]> {
  const hs4Ids = OEC_COMMODITIES.map(c => c.hs4_id).join(',');
  const yearsParam = YEARS.join(',');
  const url = `${OEC_BASE}?cube=trade_i_baci_a_92&drilldowns=Importer+Country,HS4,Year&measures=Trade+Value,Quantity&Exporter+Country=${PERU_COUNTRY_ID}&HS4=${hs4Ids}&Year=${yearsParam}`;

  console.log('OEC Ingestor: Fetching data...');
  console.log(`  URL: ${url}`);

  const response = await fetch(url, {
    headers: {
      'Accept': 'application/json',
      'Accept-Encoding': 'gzip',
    },
  });

  if (!response.ok) {
    throw new Error(`OEC API returned ${response.status}: ${response.statusText}`);
  }

  const json = await response.json();
  const records: OECRecord[] = json.data || json;

  console.log(`OEC Ingestor: Received ${records.length} records`);
  return records;
}

function lookupCommodity(hs4Id: number) {
  return OEC_COMMODITIES.find(c => c.hs4_id === hs4Id);
}

/**
 * Ingest OEC data into peru_trade_flows.
 * Returns summary stats.
 */
export async function ingestOEC(supabase: SupabaseClient): Promise<{
  fetched: number;
  ingested: number;
  errors: number;
  countries: number;
  years: number[];
}> {
  const records = await fetchOECData();
  let ingested = 0;
  let errors = 0;
  const countrySet = new Set<string>();
  const yearSet = new Set<number>();

  const fetchTimestamp = new Date().toISOString();
  const hs4Ids = OEC_COMMODITIES.map(c => c.hs4_id).join(',');
  const yearsParam = YEARS.join(',');
  const sourceUrl = `${OEC_BASE}?cube=trade_i_baci_a_92&drilldowns=Importer+Country,HS4,Year&measures=Trade+Value,Quantity&Exporter+Country=${PERU_COUNTRY_ID}&HS4=${hs4Ids}&Year=${yearsParam}`;

  for (const rec of records) {
    const commodity = lookupCommodity(rec['HS4 ID']);
    if (!commodity) continue;

    const countryName = rec['Country'] || 'Unknown';
    const year = rec['Year'];
    const tradeValue = rec['Trade Value'] || 0;
    const quantityTons = rec['Quantity'] || 0;
    const weightKg = quantityTons * 1000;

    countrySet.add(countryName);
    yearSet.add(year);

    const confidenceScore = 0.85;
    const confidenceTier: ConfidenceTier = computeConfidenceTier(confidenceScore);

    const provenance: ProvenanceRecord[] = [
      {
        source_name: 'oec_baci',
        source_url: sourceUrl,
        fetch_timestamp: fetchTimestamp,
        field: 'trade_value',
        raw_value: String(tradeValue),
      },
      {
        source_name: 'oec_baci',
        source_url: sourceUrl,
        fetch_timestamp: fetchTimestamp,
        field: 'quantity',
        raw_value: String(quantityTons),
        normalized_value: `${weightKg} kg`,
      },
      {
        source_name: 'oec_baci',
        source_url: sourceUrl,
        fetch_timestamp: fetchTimestamp,
        field: 'importer_country',
        raw_value: rec['Country ID'],
        normalized_value: countryName,
      },
      {
        source_name: 'inferred',
        fetch_timestamp: fetchTimestamp,
        field: 'peru_port',
        raw_value: 'probable_callao',
        normalized_value: 'Callao (PECLL) — ~75% of Peru mining exports; vessel-level port unknown in annual aggregate data',
      },
    ];

    const flow = {
      // No vessel-level data in annual aggregates
      vessel_name: null,
      imo_number: null,
      flag_state: null,
      exporter_name: null, // We know it's Peru
      importer_name: countryName,
      commodity: commodity.name,
      hs_code: commodity.hs_code,
      commodity_category: commodity.category,
      weight_kg: weightKg,
      declared_value_usd: tradeValue,
      origin_country: 'Peru',
      origin_port: null,
      peru_port: 'Callao',
      peru_port_unlocode: 'PECLL',
      destination_port: null,
      destination_country: countryName,
      arrival_time: `${year}-01-01T00:00:00Z`,
      departure_time: null,
      match_method: 'aggregate_trade_flow',
      match_details: {
        data_source: 'oec_baci',
        granularity: 'annual',
        year,
        oec_hs4_id: rec['HS4 ID'],
        oec_country_id: rec['Country ID'],
        port_assignment: 'probable_callao',
      },
      confidence_score: confidenceScore,
      confidence_tier: confidenceTier,
      provenance,
      is_flagged: false,
      flag_reasons: [] as string[],
    };

    const { error } = await supabase.from('peru_trade_flows').insert(flow);
    if (error) {
      console.error(`OEC Ingestor: Insert error for ${countryName}/${commodity.name}/${year}: ${error.message}`);
      errors++;
    } else {
      ingested++;
    }
  }

  console.log(`OEC Ingestor: Complete — ${ingested} flows ingested, ${errors} errors`);
  console.log(`  Countries: ${countrySet.size}, Years: ${[...yearSet].sort().join(', ')}`);

  return {
    fetched: records.length,
    ingested,
    errors,
    countries: countrySet.size,
    years: [...yearSet].sort(),
  };
}
