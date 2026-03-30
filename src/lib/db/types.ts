// NAUTILUS — Global Bulk Commodity Intelligence Types

export type ConfidenceTier = 'HIGH' | 'MEDIUM' | 'LOW';
export type EntityType = 'vessel' | 'company' | 'port';
export type AnomalyType = 'new_destination' | 'volume_spike' | 'new_counterparty' | 'flag_change';
export type CommodityCategory =
  | 'copper_ore' | 'zinc_ore' | 'lead_ore' | 'copper_matte' | 'refined_copper'
  | 'iron_ore' | 'coal' | 'soy' | 'nickel_ore' | 'cobalt' | 'platinum';
export type IntelligenceSection = 'observed' | 'enriched' | 'inferred';
export type Region = 'South America' | 'Asia-Pacific' | 'Africa' | 'Oceania';

export interface ProvenanceRecord {
  source_name: string;
  source_url?: string;
  fetch_timestamp: string;
  field: string;
  raw_value?: string;
  normalized_value?: string;
}

export interface RawVesselCall {
  id?: string;
  source_name: string;
  source_url?: string;
  fetch_timestamp?: string;
  raw_data: Record<string, unknown>;
  vessel_name?: string;
  imo_number?: string;
  mmsi?: string;
  flag_state?: string;
  vessel_type?: string;
  dwt?: number;
  port_unlocode: string;
  port_name_raw?: string;
  arrival_time?: string;
  departure_time?: string;
  origin_port?: string;
  origin_unlocode?: string;
  destination_port?: string;
  destination_unlocode?: string;
}

export interface RawCargoManifest {
  id?: string;
  source_name: string;
  source_url?: string;
  fetch_timestamp?: string;
  raw_data: Record<string, unknown>;
  manifest_number?: string;
  declaration_date?: string;
  exporter_name_raw?: string;
  importer_name_raw?: string;
  hs_code?: string;
  hs_description?: string;
  commodity_description?: string;
  weight_kg?: number;
  declared_value_usd?: number;
  country_of_origin?: string;
  country_of_destination?: string;
  port_unlocode: string;
  vessel_name_raw?: string;
  vessel_imo?: string;
}

export interface Entity {
  id?: string;
  entity_type: EntityType;
  canonical_name: string;
  imo_number?: string;
  flag_state?: string;
  country?: string;
  unlocode?: string;
  aliases: string[];
  resolution_confidence: number;
  resolution_method?: string;
  is_resolved: boolean;
  metadata?: Record<string, unknown>;
}

export interface PortCall {
  id?: string;
  vessel_entity_id?: string;
  port_entity_id?: string;
  raw_vessel_call_id?: string;
  vessel_name: string;
  imo_number?: string;
  flag_state?: string;
  vessel_type?: string;
  dwt?: number;
  port_unlocode: string;
  port_name: string;
  arrival_time?: string;
  departure_time?: string;
  origin_port?: string;
  origin_country?: string;
  destination_port?: string;
  destination_country?: string;
  source_name: string;
  source_url?: string;
  fetch_timestamp: string;
  confidence_score: number;
  confidence_tier: ConfidenceTier;
  provenance: ProvenanceRecord[];
}

export interface CargoManifest {
  id?: string;
  vessel_entity_id?: string;
  exporter_entity_id?: string;
  importer_entity_id?: string;
  port_entity_id?: string;
  raw_manifest_id?: string;
  manifest_number?: string;
  declaration_date?: string;
  exporter_name?: string;
  importer_name?: string;
  hs_code: string;
  hs_description?: string;
  commodity_description?: string;
  commodity_category?: CommodityCategory;
  weight_kg?: number;
  declared_value_usd?: number;
  country_of_origin?: string;
  country_of_destination?: string;
  port_unlocode: string;
  vessel_name?: string;
  vessel_imo?: string;
  source_name: string;
  source_url?: string;
  fetch_timestamp: string;
  confidence_score: number;
  confidence_tier: ConfidenceTier;
  provenance: ProvenanceRecord[];
}

export interface TradeFlow {
  id?: string;
  port_call_id?: string;
  manifest_id?: string;
  vessel_entity_id?: string;
  exporter_entity_id?: string;
  importer_entity_id?: string;
  vessel_name?: string;
  imo_number?: string;
  flag_state?: string;
  exporter_name?: string;
  importer_name?: string;
  commodity?: string;
  hs_code?: string;
  commodity_category?: CommodityCategory;
  weight_kg?: number;
  declared_value_usd?: number;
  origin_country?: string;
  origin_port?: string;
  peru_port: string;
  peru_port_unlocode: string;
  destination_port?: string;
  destination_country?: string;
  arrival_time?: string;
  departure_time?: string;
  region?: string;
  reporter_country?: string;
  match_method?: string;
  match_details?: Record<string, unknown>;
  confidence_score: number;
  confidence_tier: ConfidenceTier;
  provenance: ProvenanceRecord[];
  is_flagged: boolean;
  flag_reasons: string[];
  created_at?: string;
}

export interface AnomalyFlag {
  id?: string;
  trade_flow_id?: string;
  entity_id?: string;
  anomaly_type: AnomalyType;
  description: string;
  severity: ConfidenceTier;
  supporting_data?: Record<string, unknown>;
  created_at?: string;
}

// Trade Intelligence Profile — hero workflow output
export interface IntelligenceFact {
  label: string;
  value: string;
  section: IntelligenceSection;
  confidence_score: number;
  confidence_tier: ConfidenceTier;
  source: string;
  provenance: ProvenanceRecord[];
}

export interface TradeIntelligenceProfile {
  entity: string;
  entity_type: string;
  observed: IntelligenceFact[];
  enriched: IntelligenceFact[];
  inferred: IntelligenceFact[];
  anomalies: AnomalyFlag[];
  chain_view?: {
    origin?: string;
    peru_port: string;
    vessel?: string;
    destination?: string;
    consignee?: string;
    confidence_tier: ConfidenceTier;
    sources: string[];
  }[];
  generated_at: string;
}

// Query types
export type QueryType = 'vessel' | 'company' | 'commodity' | 'country' | 'port';

export interface IntelligenceQuery {
  query: string;
  type: QueryType;
}

// HS Code mapping for mining + bulk commodities (global)
export const MINING_HS_CODES: Record<string, { description: string; category: CommodityCategory }> = {
  // Copper
  '2603': { description: 'Copper ores and concentrates', category: 'copper_ore' },
  '260300': { description: 'Copper ores and concentrates', category: 'copper_ore' },
  '7401': { description: 'Copper mattes; cement copper', category: 'copper_matte' },
  '740100': { description: 'Copper mattes; cement copper', category: 'copper_matte' },
  '7403': { description: 'Refined copper and alloys, unwrought', category: 'refined_copper' },
  '740311': { description: 'Refined copper cathodes', category: 'refined_copper' },
  '740319': { description: 'Other refined copper, unwrought', category: 'refined_copper' },
  // Zinc
  '2608': { description: 'Zinc ores and concentrates', category: 'zinc_ore' },
  '260800': { description: 'Zinc ores and concentrates', category: 'zinc_ore' },
  // Lead
  '2607': { description: 'Lead ores and concentrates', category: 'lead_ore' },
  '260700': { description: 'Lead ores and concentrates', category: 'lead_ore' },
  // Iron Ore
  '2601': { description: 'Iron ores and concentrates', category: 'iron_ore' },
  '260111': { description: 'Iron ore, non-agglomerated', category: 'iron_ore' },
  '260112': { description: 'Iron ore, agglomerated', category: 'iron_ore' },
  // Coal
  '2701': { description: 'Coal', category: 'coal' },
  '270112': { description: 'Bituminous coal', category: 'coal' },
  '270119': { description: 'Other coal', category: 'coal' },
  // Soy
  '1201': { description: 'Soybeans', category: 'soy' },
  '120100': { description: 'Soybeans', category: 'soy' },
  '120190': { description: 'Soybeans, other', category: 'soy' },
  // Nickel
  '2604': { description: 'Nickel ores and concentrates', category: 'nickel_ore' },
  '260400': { description: 'Nickel ores and concentrates', category: 'nickel_ore' },
  // Cobalt
  '2605': { description: 'Cobalt ores and concentrates', category: 'cobalt' },
  '810520': { description: 'Cobalt mattes and intermediates', category: 'cobalt' },
};

// Legacy Peru port mapping (backwards compat)
export const PERU_PORTS: Record<string, { name: string; name_es: string; lat: number; lng: number }> = {
  'PECLL': { name: 'Callao', name_es: 'El Callao', lat: -12.0464, lng: -77.1425 },
  'PEMRI': { name: 'Matarani', name_es: 'Matarani', lat: -17.0003, lng: -72.1044 },
};

// Global port registry
export const GLOBAL_PORTS: Record<string, {
  name: string; country: string; region: Region;
  lat: number; lng: number; commodities: string[];
}> = {
  // Peru
  'PECLL': { name: 'Callao', country: 'Peru', region: 'South America', lat: -12.0464, lng: -77.1425, commodities: ['Copper', 'Zinc'] },
  'PEMRI': { name: 'Matarani', country: 'Peru', region: 'South America', lat: -17.0003, lng: -72.1044, commodities: ['Copper'] },
  'PEILO': { name: 'Ilo', country: 'Peru', region: 'South America', lat: -17.6394, lng: -71.3375, commodities: ['Copper'] },
  // Chile
  'CLANT': { name: 'Antofagasta', country: 'Chile', region: 'South America', lat: -23.6509, lng: -70.3975, commodities: ['Copper'] },
  'CLIQQ': { name: 'Iquique', country: 'Chile', region: 'South America', lat: -20.2141, lng: -70.1524, commodities: ['Copper'] },
  'CLMJS': { name: 'Mejillones', country: 'Chile', region: 'South America', lat: -23.1000, lng: -70.4500, commodities: ['Copper'] },
  // Australia
  'AUPHE': { name: 'Port Hedland', country: 'Australia', region: 'Oceania', lat: -20.3106, lng: 118.6017, commodities: ['Iron Ore'] },
  'AUNTL': { name: 'Newcastle', country: 'Australia', region: 'Oceania', lat: -32.9283, lng: 151.7817, commodities: ['Coal'] },
  'AUGLT': { name: 'Gladstone', country: 'Australia', region: 'Oceania', lat: -23.8489, lng: 151.2872, commodities: ['Coal'] },
  // Brazil
  'BRSSZ': { name: 'Santos', country: 'Brazil', region: 'South America', lat: -23.9608, lng: -46.3336, commodities: ['Soy', 'Iron Ore'] },
  'BRVIX': { name: 'Tubarão', country: 'Brazil', region: 'South America', lat: -20.2867, lng: -40.2858, commodities: ['Iron Ore'] },
  'BRPNG': { name: 'Paranaguá', country: 'Brazil', region: 'South America', lat: -25.5161, lng: -48.5225, commodities: ['Soy'] },
  // Indonesia
  'IDSMR': { name: 'Samarinda', country: 'Indonesia', region: 'Asia-Pacific', lat: -0.5022, lng: 117.1536, commodities: ['Coal'] },
  'IDBPN': { name: 'Balikpapan', country: 'Indonesia', region: 'Asia-Pacific', lat: -1.2654, lng: 116.8312, commodities: ['Coal'] },
  'IDMRW': { name: 'Morowali', country: 'Indonesia', region: 'Asia-Pacific', lat: -2.4000, lng: 121.6000, commodities: ['Nickel'] },
  // South Africa
  'ZARCB': { name: 'Richards Bay', country: 'South Africa', region: 'Africa', lat: -28.7830, lng: 32.0377, commodities: ['Coal', 'Platinum'] },
  'ZADUR': { name: 'Durban', country: 'South Africa', region: 'Africa', lat: -29.8587, lng: 31.0218, commodities: ['Coal'] },
  // DRC
  'CDMAT': { name: 'Matadi', country: 'DRC', region: 'Africa', lat: -5.8167, lng: 13.4500, commodities: ['Cobalt', 'Copper'] },
  'CDBOM': { name: 'Boma', country: 'DRC', region: 'Africa', lat: -5.8500, lng: 13.0500, commodities: ['Cobalt'] },
};

// Commodity display config
export const COMMODITY_CONFIG: Record<string, { label: string; color: string; icon: string }> = {
  copper_ore: { label: 'Copper', color: '#f59e0b', icon: 'bolt' },
  refined_copper: { label: 'Copper', color: '#f59e0b', icon: 'bolt' },
  copper_matte: { label: 'Copper', color: '#f59e0b', icon: 'bolt' },
  iron_ore: { label: 'Iron Ore', color: '#ef4444', icon: 'landscape' },
  coal: { label: 'Coal', color: '#6b7280', icon: 'local_fire_department' },
  soy: { label: 'Soy', color: '#22c55e', icon: 'grass' },
  nickel_ore: { label: 'Nickel', color: '#8b5cf6', icon: 'diamond' },
  cobalt: { label: 'Cobalt', color: '#3b82f6', icon: 'science' },
  zinc_ore: { label: 'Zinc', color: '#a855f7', icon: 'hexagon' },
  lead_ore: { label: 'Lead', color: '#64748b', icon: 'weight' },
  platinum: { label: 'Platinum', color: '#e2e8f0', icon: 'star' },
};
