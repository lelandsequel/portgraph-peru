// PortGraph Peru — Core Types

export type ConfidenceTier = 'HIGH' | 'MEDIUM' | 'LOW';
export type EntityType = 'vessel' | 'company' | 'port';
export type AnomalyType = 'new_destination' | 'volume_spike' | 'new_counterparty' | 'flag_change';
export type CommodityCategory = 'copper_ore' | 'zinc_ore' | 'lead_ore' | 'copper_matte' | 'refined_copper';
export type IntelligenceSection = 'observed' | 'enriched' | 'inferred';

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

// HS Code mapping for mining commodities
export const MINING_HS_CODES: Record<string, { description: string; category: CommodityCategory }> = {
  '2603': { description: 'Copper ores and concentrates', category: 'copper_ore' },
  '260300': { description: 'Copper ores and concentrates', category: 'copper_ore' },
  '2608': { description: 'Zinc ores and concentrates', category: 'zinc_ore' },
  '260800': { description: 'Zinc ores and concentrates', category: 'zinc_ore' },
  '2607': { description: 'Lead ores and concentrates', category: 'lead_ore' },
  '260700': { description: 'Lead ores and concentrates', category: 'lead_ore' },
  '7401': { description: 'Copper mattes; cement copper', category: 'copper_matte' },
  '740100': { description: 'Copper mattes; cement copper', category: 'copper_matte' },
  '7403': { description: 'Refined copper and alloys, unwrought', category: 'refined_copper' },
  '740311': { description: 'Refined copper cathodes', category: 'refined_copper' },
  '740319': { description: 'Other refined copper, unwrought', category: 'refined_copper' },
};

// Port mapping
export const PERU_PORTS: Record<string, { name: string; name_es: string; lat: number; lng: number }> = {
  'PECLL': { name: 'Callao', name_es: 'El Callao', lat: -12.0464, lng: -77.1425 },
  'PEMRI': { name: 'Matarani', name_es: 'Matarani', lat: -17.0003, lng: -72.1044 },
};
