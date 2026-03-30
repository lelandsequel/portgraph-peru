-- NAUTILUS — Global Bulk Commodity Intelligence Schema
-- Phase 4: Global expansion — Chile, Australia, Brazil, Indonesia, South Africa, DRC
-- Commodity: Copper, Iron Ore, Coal, Soy, Nickel, Cobalt, Zinc

-- ============================================================
-- RAW INGESTED DATA
-- ============================================================

CREATE TABLE IF NOT EXISTS raw_vessel_calls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_name TEXT NOT NULL,            -- 'marinetraffic' | 'vesselfinder' | 'apn'
  source_url TEXT,
  fetch_timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  raw_data JSONB NOT NULL,              -- original scraped record

  -- Parsed fields
  vessel_name TEXT,
  imo_number TEXT,
  mmsi TEXT,
  flag_state TEXT,
  vessel_type TEXT,
  dwt INTEGER,                          -- deadweight tonnage
  port_unlocode TEXT NOT NULL,          -- PECLL or PEMRI
  port_name_raw TEXT,
  arrival_time TIMESTAMPTZ,
  departure_time TIMESTAMPTZ,
  origin_port TEXT,
  origin_unlocode TEXT,
  destination_port TEXT,
  destination_unlocode TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS raw_cargo_manifests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_name TEXT NOT NULL,            -- 'sunat'
  source_url TEXT,
  fetch_timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  raw_data JSONB NOT NULL,

  -- Parsed fields
  manifest_number TEXT,
  declaration_date DATE,
  exporter_name_raw TEXT,
  importer_name_raw TEXT,
  hs_code TEXT,
  hs_description TEXT,
  commodity_description TEXT,
  weight_kg NUMERIC,
  declared_value_usd NUMERIC,
  country_of_origin TEXT,
  country_of_destination TEXT,
  port_unlocode TEXT NOT NULL,
  vessel_name_raw TEXT,
  vessel_imo TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- RESOLVED ENTITIES (METEOR output)
-- ============================================================

CREATE TABLE IF NOT EXISTS entities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type TEXT NOT NULL,            -- 'vessel' | 'company' | 'port'
  canonical_name TEXT NOT NULL,
  imo_number TEXT,                      -- for vessels
  flag_state TEXT,                      -- for vessels
  country TEXT,                         -- for companies/ports
  unlocode TEXT,                        -- for ports
  aliases TEXT[] DEFAULT '{}',
  resolution_confidence NUMERIC NOT NULL DEFAULT 0,  -- 0.0 to 1.0
  resolution_method TEXT,               -- 'exact_imo' | 'fuzzy_name' | 'manual'
  is_resolved BOOLEAN NOT NULL DEFAULT TRUE,
  metadata JSONB DEFAULT '{}',

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- PORT CALLS (normalized, linked to entities)
-- ============================================================

CREATE TABLE IF NOT EXISTS peru_port_calls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vessel_entity_id UUID REFERENCES entities(id),
  port_entity_id UUID REFERENCES entities(id),
  raw_vessel_call_id UUID REFERENCES raw_vessel_calls(id),

  vessel_name TEXT NOT NULL,
  imo_number TEXT,
  flag_state TEXT,
  vessel_type TEXT,
  dwt INTEGER,

  port_unlocode TEXT NOT NULL,
  port_name TEXT NOT NULL,

  arrival_time TIMESTAMPTZ,
  departure_time TIMESTAMPTZ,

  origin_port TEXT,
  origin_country TEXT,
  destination_port TEXT,
  destination_country TEXT,

  -- AURORA provenance
  source_name TEXT NOT NULL,
  source_url TEXT,
  fetch_timestamp TIMESTAMPTZ NOT NULL,
  confidence_score NUMERIC NOT NULL DEFAULT 1.0,
  confidence_tier TEXT NOT NULL DEFAULT 'HIGH',  -- HIGH | MEDIUM | LOW
  provenance JSONB NOT NULL DEFAULT '[]',

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- CARGO MANIFESTS (normalized, linked to entities)
-- ============================================================

CREATE TABLE IF NOT EXISTS peru_cargo_manifests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vessel_entity_id UUID REFERENCES entities(id),
  exporter_entity_id UUID REFERENCES entities(id),
  importer_entity_id UUID REFERENCES entities(id),
  port_entity_id UUID REFERENCES entities(id),
  raw_manifest_id UUID REFERENCES raw_cargo_manifests(id),

  manifest_number TEXT,
  declaration_date DATE,

  exporter_name TEXT,
  importer_name TEXT,

  hs_code TEXT NOT NULL,
  hs_description TEXT,
  commodity_description TEXT,
  commodity_category TEXT,              -- 'copper_ore' | 'zinc_ore' | 'lead_ore' | 'copper_matte' | 'refined_copper'

  weight_kg NUMERIC,
  declared_value_usd NUMERIC,

  country_of_origin TEXT,
  country_of_destination TEXT,
  port_unlocode TEXT NOT NULL,

  vessel_name TEXT,
  vessel_imo TEXT,

  -- AURORA provenance
  source_name TEXT NOT NULL,
  source_url TEXT,
  fetch_timestamp TIMESTAMPTZ NOT NULL,
  confidence_score NUMERIC NOT NULL DEFAULT 1.0,
  confidence_tier TEXT NOT NULL DEFAULT 'HIGH',
  provenance JSONB NOT NULL DEFAULT '[]',

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- TRADE FLOWS / CHAINS (COMET output)
-- ============================================================

CREATE TABLE IF NOT EXISTS peru_trade_flows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  port_call_id UUID REFERENCES peru_port_calls(id),
  manifest_id UUID REFERENCES peru_cargo_manifests(id),
  vessel_entity_id UUID REFERENCES entities(id),
  exporter_entity_id UUID REFERENCES entities(id),
  importer_entity_id UUID REFERENCES entities(id),

  -- Chain fields
  vessel_name TEXT,
  imo_number TEXT,
  flag_state TEXT,

  exporter_name TEXT,
  importer_name TEXT,

  commodity TEXT,
  hs_code TEXT,
  commodity_category TEXT,

  weight_kg NUMERIC,
  declared_value_usd NUMERIC,

  origin_country TEXT,
  origin_port TEXT,
  peru_port TEXT NOT NULL,
  peru_port_unlocode TEXT NOT NULL,
  destination_port TEXT,
  destination_country TEXT,

  arrival_time TIMESTAMPTZ,
  departure_time TIMESTAMPTZ,

  -- Global expansion (Phase 4)
  region TEXT,                           -- 'South America' | 'Asia-Pacific' | 'Africa' | 'Oceania'
  reporter_country TEXT,                 -- ISO name: 'Peru' | 'Chile' | 'Australia' | 'Brazil' | etc.

  -- Chain match metadata
  match_method TEXT,                    -- 'full_match' | 'vessel_time' | 'port_commodity' | 'inferred'
  match_details JSONB DEFAULT '{}',

  -- AURORA provenance
  confidence_score NUMERIC NOT NULL DEFAULT 0,
  confidence_tier TEXT NOT NULL DEFAULT 'LOW',  -- HIGH | MEDIUM | LOW
  provenance JSONB NOT NULL DEFAULT '[]',
  is_flagged BOOLEAN NOT NULL DEFAULT FALSE,
  flag_reasons TEXT[] DEFAULT '{}',

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- ANOMALY FLAGS (QUASAR output — light version for Phase 1)
-- ============================================================

CREATE TABLE IF NOT EXISTS anomaly_flags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trade_flow_id UUID REFERENCES peru_trade_flows(id),
  entity_id UUID REFERENCES entities(id),

  anomaly_type TEXT NOT NULL,           -- 'new_destination' | 'volume_spike' | 'new_counterparty' | 'flag_change'
  description TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'MEDIUM', -- HIGH | MEDIUM | LOW
  supporting_data JSONB DEFAULT '{}',

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- INDEXES for < 2 second query performance
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_port_calls_imo ON peru_port_calls(imo_number);
CREATE INDEX IF NOT EXISTS idx_port_calls_vessel ON peru_port_calls(vessel_name);
CREATE INDEX IF NOT EXISTS idx_port_calls_port ON peru_port_calls(port_unlocode);
CREATE INDEX IF NOT EXISTS idx_port_calls_arrival ON peru_port_calls(arrival_time);

CREATE INDEX IF NOT EXISTS idx_manifests_hs ON peru_cargo_manifests(hs_code);
CREATE INDEX IF NOT EXISTS idx_manifests_exporter ON peru_cargo_manifests(exporter_name);
CREATE INDEX IF NOT EXISTS idx_manifests_importer ON peru_cargo_manifests(importer_name);
CREATE INDEX IF NOT EXISTS idx_manifests_port ON peru_cargo_manifests(port_unlocode);
CREATE INDEX IF NOT EXISTS idx_manifests_vessel ON peru_cargo_manifests(vessel_name);

CREATE INDEX IF NOT EXISTS idx_trade_flows_imo ON peru_trade_flows(imo_number);
CREATE INDEX IF NOT EXISTS idx_trade_flows_vessel ON peru_trade_flows(vessel_name);
CREATE INDEX IF NOT EXISTS idx_trade_flows_exporter ON peru_trade_flows(exporter_name);
CREATE INDEX IF NOT EXISTS idx_trade_flows_importer ON peru_trade_flows(importer_name);
CREATE INDEX IF NOT EXISTS idx_trade_flows_hs ON peru_trade_flows(hs_code);
CREATE INDEX IF NOT EXISTS idx_trade_flows_peru_port ON peru_trade_flows(peru_port_unlocode);
CREATE INDEX IF NOT EXISTS idx_trade_flows_dest ON peru_trade_flows(destination_country);
CREATE INDEX IF NOT EXISTS idx_trade_flows_arrival ON peru_trade_flows(arrival_time);
CREATE INDEX IF NOT EXISTS idx_trade_flows_confidence ON peru_trade_flows(confidence_tier);
CREATE INDEX IF NOT EXISTS idx_trade_flows_commodity ON peru_trade_flows(commodity_category);

CREATE INDEX IF NOT EXISTS idx_entities_type ON entities(entity_type);
CREATE INDEX IF NOT EXISTS idx_entities_name ON entities(canonical_name);
CREATE INDEX IF NOT EXISTS idx_entities_imo ON entities(imo_number);
CREATE INDEX IF NOT EXISTS idx_entities_unlocode ON entities(unlocode);

CREATE INDEX IF NOT EXISTS idx_anomalies_type ON anomaly_flags(anomaly_type);
CREATE INDEX IF NOT EXISTS idx_anomalies_flow ON anomaly_flags(trade_flow_id);

CREATE INDEX IF NOT EXISTS idx_raw_vessels_port ON raw_vessel_calls(port_unlocode);
CREATE INDEX IF NOT EXISTS idx_raw_manifests_port ON raw_cargo_manifests(port_unlocode);

-- Global expansion indexes (Phase 4)
CREATE INDEX IF NOT EXISTS idx_trade_flows_region ON peru_trade_flows(region);
CREATE INDEX IF NOT EXISTS idx_trade_flows_reporter ON peru_trade_flows(reporter_country);

-- ============================================================
-- FLOW ARCS — Bilateral commodity corridors (Phase 5)
-- ============================================================

CREATE TABLE IF NOT EXISTS flow_arcs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  origin_country TEXT NOT NULL,
  origin_port TEXT,
  destination_country TEXT NOT NULL,
  destination_port TEXT,
  commodity TEXT NOT NULL,
  commodity_category TEXT,
  hs_code TEXT,
  annual_volume_mt NUMERIC,            -- metric tons
  annual_value_usd NUMERIC,
  year INTEGER NOT NULL,
  source TEXT NOT NULL DEFAULT 'un_comtrade',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_flow_arcs_origin ON flow_arcs(origin_country);
CREATE INDEX IF NOT EXISTS idx_flow_arcs_dest ON flow_arcs(destination_country);
CREATE INDEX IF NOT EXISTS idx_flow_arcs_commodity ON flow_arcs(commodity_category);
CREATE INDEX IF NOT EXISTS idx_flow_arcs_year ON flow_arcs(year);
CREATE INDEX IF NOT EXISTS idx_flow_arcs_value ON flow_arcs(annual_value_usd);

-- ============================================================
-- MIGRATION: Add global columns to existing table
-- ============================================================

DO $$ BEGIN
  ALTER TABLE peru_trade_flows ADD COLUMN IF NOT EXISTS region TEXT;
  ALTER TABLE peru_trade_flows ADD COLUMN IF NOT EXISTS reporter_country TEXT;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;
