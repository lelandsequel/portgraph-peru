// NAUTILUS — Global Bulk Commodity Intelligence Types

export type ConfidenceTier = 'HIGH' | 'MEDIUM' | 'LOW';
export type EntityType = 'vessel' | 'company' | 'port';
export type AnomalyType = 'new_destination' | 'volume_spike' | 'new_counterparty' | 'flag_change';
export type CommodityCategory =
  | 'copper_ore' | 'zinc_ore' | 'lead_ore' | 'copper_matte' | 'refined_copper'
  | 'iron_ore' | 'coal' | 'soy' | 'nickel_ore' | 'cobalt' | 'platinum'
  | 'potash' | 'wheat' | 'corn' | 'fertilizer' | 'uranium' | 'bauxite'
  | 'lng' | 'lithium_carbonate' | 'lithium_ore' | 'rare_earths' | 'crude_oil'
  | 'alumina' | 'chromium' | 'manganese' | 'phosphate';
export type IntelligenceSection = 'observed' | 'enriched' | 'inferred';
export type Region = 'South America' | 'Asia-Pacific' | 'Africa' | 'Oceania' | 'North America' | 'Europe/FSU' | 'West Africa' | 'Middle East';

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

export interface FlowArc {
  id?: string;
  origin_country: string;
  origin_port?: string;
  destination_country: string;
  destination_port?: string;
  commodity: string;
  commodity_category?: CommodityCategory;
  hs_code?: string;
  annual_volume_mt?: number;
  annual_value_usd?: number;
  year: number;
  source: string;
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
  // LNG / Natural Gas
  '271121': { description: 'Natural gas, liquefied (LNG)', category: 'lng' },
  '2711': { description: 'Petroleum gases', category: 'lng' },
  // Lithium
  '283691': { description: 'Lithium carbonate', category: 'lithium_carbonate' },
  '260190': { description: 'Lithium ore / spodumene', category: 'lithium_ore' },
  // Rare Earths
  '280530': { description: 'Rare-earth metals', category: 'rare_earths' },
  '2805': { description: 'Alkali/rare-earth metals', category: 'rare_earths' },
  // Crude Oil
  '270900': { description: 'Crude petroleum oil', category: 'crude_oil' },
  '2709': { description: 'Petroleum oils, crude', category: 'crude_oil' },
  // Alumina
  '281820': { description: 'Aluminium oxide (alumina)', category: 'alumina' },
  // Chromium
  '261000': { description: 'Chromium ores and concentrates', category: 'chromium' },
  '2610': { description: 'Chromium ores', category: 'chromium' },
  // Manganese
  '260200': { description: 'Manganese ores and concentrates', category: 'manganese' },
  '2602': { description: 'Manganese ores', category: 'manganese' },
  // Phosphate
  '310510': { description: 'Mineral or chemical fertilizers (phosphatic)', category: 'phosphate' },
  '3105': { description: 'Phosphatic fertilizers', category: 'phosphate' },
  // Potash (already in global, adding HS here)
  '310420': { description: 'Potash (KCl)', category: 'potash' },
  // Wheat
  '100190': { description: 'Wheat', category: 'wheat' },
  // Corn
  '100590': { description: 'Corn / Maize', category: 'corn' },
  // Fertilizer
  '310210': { description: 'Ammonium nitrate (fertilizer)', category: 'fertilizer' },
  // Uranium
  '261210': { description: 'Uranium ores', category: 'uranium' },
  // Bauxite
  '260600': { description: 'Bauxite (aluminium ore)', category: 'bauxite' },
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
  // Canada
  'CAVAN': { name: 'Vancouver', country: 'Canada', region: 'North America', lat: 49.2827, lng: -123.1207, commodities: ['Potash', 'Wheat'] },
  'CAPRR': { name: 'Prince Rupert', country: 'Canada', region: 'North America', lat: 54.3150, lng: -130.3208, commodities: ['Wheat', 'Corn'] },
  // Russia
  'RUNVS': { name: 'Novorossiysk', country: 'Russia', region: 'Europe/FSU', lat: 44.7237, lng: 37.7685, commodities: ['Wheat', 'Fertilizer'] },
  // Ukraine
  'UAODS': { name: 'Odessa', country: 'Ukraine', region: 'Europe/FSU', lat: 46.4825, lng: 30.7233, commodities: ['Wheat', 'Corn'] },
  // Kazakhstan
  'KZAKU': { name: 'Aktau', country: 'Kazakhstan', region: 'Europe/FSU', lat: 43.6500, lng: 51.1500, commodities: ['Uranium', 'Wheat'] },
  // Guinea
  'GNCKY': { name: 'Conakry', country: 'Guinea', region: 'West Africa', lat: 9.5370, lng: -13.6785, commodities: ['Bauxite'] },

  // ═══ DESTINATION HUBS ═══
  // China
  'CNQIN': { name: 'Qingdao', country: 'China', region: 'Asia-Pacific', lat: 36.0671, lng: 120.3826, commodities: ['Iron Ore', 'Coal', 'Copper'] },
  'CNTJN': { name: 'Tianjin', country: 'China', region: 'Asia-Pacific', lat: 38.9860, lng: 117.7278, commodities: ['Iron Ore', 'Coal'] },
  'CNSHA': { name: 'Shanghai', country: 'China', region: 'Asia-Pacific', lat: 31.2304, lng: 121.4737, commodities: ['Copper', 'Soy', 'LNG'] },
  'CNNGB': { name: 'Ningbo', country: 'China', region: 'Asia-Pacific', lat: 29.8683, lng: 121.5440, commodities: ['Iron Ore', 'Copper'] },
  'CNGZH': { name: 'Guangzhou', country: 'China', region: 'Asia-Pacific', lat: 23.1291, lng: 113.2644, commodities: ['Coal', 'LNG', 'Nickel'] },
  // India
  'INPRT': { name: 'Paradip', country: 'India', region: 'Asia-Pacific', lat: 20.3165, lng: 86.6114, commodities: ['Coal', 'Iron Ore', 'Chromium'] },
  'INVTZ': { name: 'Vizag', country: 'India', region: 'Asia-Pacific', lat: 17.6868, lng: 83.2185, commodities: ['Coal', 'Manganese'] },
  'INKDL': { name: 'Kandla', country: 'India', region: 'Asia-Pacific', lat: 23.0333, lng: 70.2167, commodities: ['Coal', 'Phosphate'] },
  'INBOM': { name: 'Mumbai', country: 'India', region: 'Asia-Pacific', lat: 18.9220, lng: 72.8347, commodities: ['Crude Oil', 'LNG'] },
  // Japan
  'JPNGO': { name: 'Nagoya', country: 'Japan', region: 'Asia-Pacific', lat: 35.0891, lng: 136.8826, commodities: ['Iron Ore', 'Coal', 'LNG'] },
  'JPUKB': { name: 'Kobe', country: 'Japan', region: 'Asia-Pacific', lat: 34.6901, lng: 135.1956, commodities: ['Copper', 'Iron Ore'] },
  'JPYOK': { name: 'Yokohama', country: 'Japan', region: 'Asia-Pacific', lat: 35.4437, lng: 139.6380, commodities: ['LNG', 'Iron Ore'] },
  // South Korea
  'KRPOH': { name: 'Pohang', country: 'South Korea', region: 'Asia-Pacific', lat: 36.0190, lng: 129.3435, commodities: ['Iron Ore', 'Coal'] },
  'KRKWG': { name: 'Gwangyang', country: 'South Korea', region: 'Asia-Pacific', lat: 34.9272, lng: 127.6961, commodities: ['Iron Ore', 'Coal'] },
  'KRPUS': { name: 'Busan', country: 'South Korea', region: 'Asia-Pacific', lat: 35.1796, lng: 129.0756, commodities: ['Coal', 'LNG'] },
  // Netherlands / Germany
  'NLRTM': { name: 'Rotterdam', country: 'Netherlands', region: 'Europe/FSU', lat: 51.9244, lng: 4.4777, commodities: ['Iron Ore', 'Coal', 'LNG', 'Crude Oil'] },
  'DEHAM': { name: 'Hamburg', country: 'Germany', region: 'Europe/FSU', lat: 53.5511, lng: 9.9937, commodities: ['Coal', 'Iron Ore', 'Copper'] },

  // ═══ NEW SUPPLY CORRIDORS ═══
  // Colombia — Coal
  'COPBO': { name: 'Puerto Bolivar', country: 'Colombia', region: 'South America', lat: 12.2225, lng: -71.9648, commodities: ['Coal'] },
  'COBAQ': { name: 'Barranquilla', country: 'Colombia', region: 'South America', lat: 10.9685, lng: -74.7813, commodities: ['Coal'] },
  // Sweden — Iron Ore (exports via Narvik, Norway)
  'NONVK': { name: 'Narvik', country: 'Sweden', region: 'Europe/FSU', lat: 68.4385, lng: 17.4272, commodities: ['Iron Ore'] },
  // New Caledonia — Nickel
  'NCNOU': { name: 'Noumea', country: 'New Caledonia', region: 'Oceania', lat: -22.2763, lng: 166.4580, commodities: ['Nickel'] },
  // Mozambique — Coal + LNG
  'MZBEW': { name: 'Beira', country: 'Mozambique', region: 'Africa', lat: -19.8436, lng: 34.8713, commodities: ['Coal'] },
  'MZMNC': { name: 'Nacala', country: 'Mozambique', region: 'Africa', lat: -14.5429, lng: 40.6727, commodities: ['Coal', 'LNG'] },
  // Zambia — Copper (via Dar es Salaam)
  'TZDAR': { name: 'Dar es Salaam', country: 'Tanzania', region: 'Africa', lat: -6.7924, lng: 39.2083, commodities: ['Copper'] },
  // Argentina — Lithium + Soy
  'ARBUE': { name: 'Buenos Aires', country: 'Argentina', region: 'South America', lat: -34.6037, lng: -58.3816, commodities: ['Lithium', 'Soy'] },
  'ARROS': { name: 'Rosario', country: 'Argentina', region: 'South America', lat: -32.9468, lng: -60.6393, commodities: ['Soy'] },
  // Nigeria — LNG + Oil
  'NGBON': { name: 'Bonny', country: 'Nigeria', region: 'West Africa', lat: 4.4266, lng: 7.1683, commodities: ['LNG', 'Crude Oil'] },
  'NGLOS': { name: 'Lagos', country: 'Nigeria', region: 'West Africa', lat: 6.4531, lng: 3.3958, commodities: ['Crude Oil'] },
  // Angola — Oil + LNG
  'AOLAD': { name: 'Luanda', country: 'Angola', region: 'Africa', lat: -8.8390, lng: 13.2894, commodities: ['Crude Oil', 'LNG'] },
  'AOSOY': { name: 'Soyo', country: 'Angola', region: 'Africa', lat: -6.1349, lng: 12.3714, commodities: ['LNG'] },
  // Qatar — LNG
  'QARAF': { name: 'Ras Laffan', country: 'Qatar', region: 'Middle East', lat: 25.9167, lng: 51.5333, commodities: ['LNG'] },
  // Myanmar — Rare Earths
  'MMRGN': { name: 'Yangon', country: 'Myanmar', region: 'Asia-Pacific', lat: 16.8661, lng: 96.1951, commodities: ['Rare Earths'] },
  // Philippines — Nickel
  'PHSUG': { name: 'Surigao', country: 'Philippines', region: 'Asia-Pacific', lat: 9.7571, lng: 125.5138, commodities: ['Nickel'] },
  'PHGSA': { name: 'General Santos', country: 'Philippines', region: 'Asia-Pacific', lat: 6.1164, lng: 125.1716, commodities: ['Nickel'] },
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
  potash: { label: 'Potash', color: '#f97316', icon: 'grain' },
  wheat: { label: 'Wheat', color: '#eab308', icon: 'agriculture' },
  corn: { label: 'Corn', color: '#84cc16', icon: 'eco' },
  fertilizer: { label: 'Fertilizer', color: '#14b8a6', icon: 'spa' },
  uranium: { label: 'Uranium', color: '#facc15', icon: 'radio_button_checked' },
  bauxite: { label: 'Bauxite', color: '#dc2626', icon: 'terrain' },
  lng: { label: 'LNG', color: '#06b6d4', icon: 'local_gas_station' },
  lithium_carbonate: { label: 'Lithium', color: '#10b981', icon: 'battery_charging_full' },
  lithium_ore: { label: 'Lithium Ore', color: '#059669', icon: 'battery_charging_full' },
  rare_earths: { label: 'Rare Earths', color: '#d946ef', icon: 'auto_awesome' },
  crude_oil: { label: 'Crude Oil', color: '#1e293b', icon: 'oil_barrel' },
  alumina: { label: 'Alumina', color: '#f43f5e', icon: 'factory' },
  chromium: { label: 'Chromium', color: '#7c3aed', icon: 'shield' },
  manganese: { label: 'Manganese', color: '#be185d', icon: 'workspaces' },
  phosphate: { label: 'Phosphate', color: '#0d9488', icon: 'compost' },
};
