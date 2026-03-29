/**
 * METEOR — Entity Resolution Pipeline
 *
 * Normalizes vessel names, company names, port names across 3+ sources.
 * Outputs canonical entity records with confidence score per match.
 * Logic: fuzzy match + IMO anchor + country-of-registration cross-check.
 * Flags: unresolved entities shown in UI as "unverified".
 */

import { SupabaseClient } from '@supabase/supabase-js';
import { Entity, PERU_PORTS } from '../db/types';

// ============================================================
// NAME NORMALIZATION
// ============================================================

const VESSEL_SUFFIXES = /\b(MV|MT|MS|SS|M\/V|M\/T|HSC|MY|SY|RV|TV|FV|GTS|TSS)\b\.?\s*/gi;
const COMPANY_SUFFIXES = /\b(S\.?A\.?C\.?|S\.?A\.?|S\.?R\.?L\.?|LLC|LTD|INC|CORP|CO\.?|E\.?I\.?R\.?L\.?|SOCIEDAD ANONIMA|LIMITADA)\b\.?\s*/gi;

export function normalizeVesselName(name: string): string {
  if (!name) return '';
  return name
    .toUpperCase()
    .replace(VESSEL_SUFFIXES, '')
    .replace(/[^A-Z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export function normalizeCompanyName(name: string): string {
  if (!name) return '';
  return name
    .toUpperCase()
    .replace(COMPANY_SUFFIXES, '')
    .replace(/[^A-Z0-9\s&]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

// Port name variant mapping (Spanish ↔ English + common variants)
const PORT_NAME_VARIANTS: Record<string, string> = {
  'CALLAO': 'PECLL',
  'EL CALLAO': 'PECLL',
  'PUERTO DEL CALLAO': 'PECLL',
  'PORT OF CALLAO': 'PECLL',
  'PECLL': 'PECLL',
  'MATARANI': 'PEMRI',
  'PUERTO DE MATARANI': 'PEMRI',
  'PORT OF MATARANI': 'PEMRI',
  'PEMRI': 'PEMRI',
  'ISLAY': 'PEMRI', // Matarani is in Islay province
};

export function resolvePortName(name: string): { unlocode: string; canonical_name: string } | null {
  if (!name) return null;
  const normalized = name.toUpperCase().trim();
  const unlocode = PORT_NAME_VARIANTS[normalized];
  if (unlocode && PERU_PORTS[unlocode]) {
    return { unlocode, canonical_name: PERU_PORTS[unlocode].name };
  }
  // Try partial match
  for (const [variant, code] of Object.entries(PORT_NAME_VARIANTS)) {
    if (normalized.includes(variant) || variant.includes(normalized)) {
      return { unlocode: code, canonical_name: PERU_PORTS[code].name };
    }
  }
  return null;
}

// ============================================================
// FUZZY MATCHING
// ============================================================

function levenshtein(a: string, b: string): number {
  const matrix: number[][] = [];
  for (let i = 0; i <= b.length; i++) matrix[i] = [i];
  for (let j = 0; j <= a.length; j++) matrix[0][j] = j;
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      matrix[i][j] = b[i - 1] === a[j - 1]
        ? matrix[i - 1][j - 1]
        : Math.min(matrix[i - 1][j - 1] + 1, matrix[i][j - 1] + 1, matrix[i - 1][j] + 1);
    }
  }
  return matrix[b.length][a.length];
}

export function nameSimilarity(a: string, b: string): number {
  if (!a || !b) return 0;
  const maxLen = Math.max(a.length, b.length);
  if (maxLen === 0) return 1;
  return 1 - levenshtein(a, b) / maxLen;
}

// ============================================================
// ENTITY RESOLUTION
// ============================================================

const SIMILARITY_THRESHOLD = 0.85;

export interface ResolutionResult {
  entity: Entity;
  matched_from: string;
  confidence: number;
  method: string;
}

export async function resolveVessel(
  supabase: SupabaseClient,
  vesselName: string,
  imo?: string,
  flagState?: string
): Promise<ResolutionResult> {
  const normalizedName = normalizeVesselName(vesselName);

  // Strategy 1: Exact IMO match (highest confidence)
  if (imo) {
    const { data: existing } = await supabase
      .from('entities')
      .select('*')
      .eq('entity_type', 'vessel')
      .eq('imo_number', imo)
      .limit(1);

    if (existing && existing.length > 0) {
      const entity = existing[0] as Entity;
      // Add alias if name variant is new
      if (!entity.aliases.includes(normalizedName) && entity.canonical_name !== normalizedName) {
        await supabase
          .from('entities')
          .update({ aliases: [...entity.aliases, normalizedName], updated_at: new Date().toISOString() })
          .eq('id', entity.id);
      }
      return { entity, matched_from: vesselName, confidence: 0.98, method: 'exact_imo' };
    }
  }

  // Strategy 2: Fuzzy name match against existing entities
  const { data: candidates } = await supabase
    .from('entities')
    .select('*')
    .eq('entity_type', 'vessel');

  if (candidates && candidates.length > 0) {
    let bestMatch: Entity | null = null;
    let bestScore = 0;

    for (const candidate of candidates) {
      const score = nameSimilarity(normalizedName, candidate.canonical_name);
      // Also check aliases
      const aliasScores = (candidate.aliases || []).map((a: string) => nameSimilarity(normalizedName, a));
      const maxScore = Math.max(score, ...aliasScores);

      if (maxScore > bestScore && maxScore >= SIMILARITY_THRESHOLD) {
        bestScore = maxScore;
        bestMatch = candidate as Entity;
      }
    }

    if (bestMatch) {
      // Cross-check flag state if available
      let confidence = bestScore * 0.9;
      if (flagState && bestMatch.flag_state && flagState.toUpperCase() === bestMatch.flag_state.toUpperCase()) {
        confidence = Math.min(confidence + 0.08, 0.96);
      }
      if (!bestMatch.aliases.includes(normalizedName) && bestMatch.canonical_name !== normalizedName) {
        await supabase
          .from('entities')
          .update({ aliases: [...bestMatch.aliases, normalizedName], updated_at: new Date().toISOString() })
          .eq('id', bestMatch.id);
      }
      return { entity: bestMatch, matched_from: vesselName, confidence, method: 'fuzzy_name' };
    }
  }

  // Strategy 3: Create new entity
  const newEntity: Partial<Entity> = {
    entity_type: 'vessel',
    canonical_name: normalizedName,
    imo_number: imo || undefined,
    flag_state: flagState?.toUpperCase(),
    aliases: [vesselName.trim()],
    resolution_confidence: imo ? 0.95 : 0.7,
    resolution_method: imo ? 'exact_imo' : 'new_entity',
    is_resolved: !!imo,
  };

  const { data: created, error } = await supabase
    .from('entities')
    .insert(newEntity)
    .select()
    .single();

  if (error) throw new Error(`METEOR: Failed to create vessel entity: ${error.message}`);

  return {
    entity: created as Entity,
    matched_from: vesselName,
    confidence: newEntity.resolution_confidence!,
    method: newEntity.resolution_method!,
  };
}

export async function resolveCompany(
  supabase: SupabaseClient,
  companyName: string,
  country?: string
): Promise<ResolutionResult> {
  const normalizedName = normalizeCompanyName(companyName);
  if (!normalizedName) {
    return {
      entity: {
        entity_type: 'company',
        canonical_name: 'UNKNOWN',
        aliases: [],
        resolution_confidence: 0,
        is_resolved: false,
      },
      matched_from: companyName,
      confidence: 0,
      method: 'unresolved',
    };
  }

  // Check existing
  const { data: candidates } = await supabase
    .from('entities')
    .select('*')
    .eq('entity_type', 'company');

  if (candidates && candidates.length > 0) {
    let bestMatch: Entity | null = null;
    let bestScore = 0;

    for (const candidate of candidates) {
      const score = nameSimilarity(normalizedName, candidate.canonical_name);
      const aliasScores = (candidate.aliases || []).map((a: string) => nameSimilarity(normalizedName, a));
      const maxScore = Math.max(score, ...aliasScores);

      if (maxScore > bestScore && maxScore >= SIMILARITY_THRESHOLD) {
        bestScore = maxScore;
        bestMatch = candidate as Entity;
      }
    }

    if (bestMatch) {
      let confidence = bestScore * 0.9;
      if (country && bestMatch.country && country.toUpperCase() === bestMatch.country.toUpperCase()) {
        confidence = Math.min(confidence + 0.05, 0.95);
      }
      if (!bestMatch.aliases.includes(normalizedName) && bestMatch.canonical_name !== normalizedName) {
        await supabase
          .from('entities')
          .update({ aliases: [...bestMatch.aliases, normalizedName], updated_at: new Date().toISOString() })
          .eq('id', bestMatch.id);
      }
      return { entity: bestMatch, matched_from: companyName, confidence, method: 'fuzzy_name' };
    }
  }

  // Create new
  const newEntity: Partial<Entity> = {
    entity_type: 'company',
    canonical_name: normalizedName,
    country: country?.toUpperCase(),
    aliases: [companyName.trim()],
    resolution_confidence: 0.75,
    resolution_method: 'new_entity',
    is_resolved: true,
  };

  const { data: created, error } = await supabase
    .from('entities')
    .insert(newEntity)
    .select()
    .single();

  if (error) throw new Error(`METEOR: Failed to create company entity: ${error.message}`);

  return {
    entity: created as Entity,
    matched_from: companyName,
    confidence: 0.75,
    method: 'new_entity',
  };
}

export async function resolvePort(
  supabase: SupabaseClient,
  portName: string
): Promise<ResolutionResult | null> {
  const resolved = resolvePortName(portName);
  if (!resolved) return null;

  // Check if port entity exists
  const { data: existing } = await supabase
    .from('entities')
    .select('*')
    .eq('entity_type', 'port')
    .eq('unlocode', resolved.unlocode)
    .limit(1);

  if (existing && existing.length > 0) {
    return {
      entity: existing[0] as Entity,
      matched_from: portName,
      confidence: 0.99,
      method: 'port_lookup',
    };
  }

  const portInfo = PERU_PORTS[resolved.unlocode];
  const newEntity: Partial<Entity> = {
    entity_type: 'port',
    canonical_name: resolved.canonical_name,
    unlocode: resolved.unlocode,
    country: 'PE',
    aliases: [portName.trim(), portInfo.name_es],
    resolution_confidence: 0.99,
    resolution_method: 'port_lookup',
    is_resolved: true,
    metadata: { lat: portInfo.lat, lng: portInfo.lng },
  };

  const { data: created, error } = await supabase
    .from('entities')
    .insert(newEntity)
    .select()
    .single();

  if (error) throw new Error(`METEOR: Failed to create port entity: ${error.message}`);

  return {
    entity: created as Entity,
    matched_from: portName,
    confidence: 0.99,
    method: 'port_lookup',
  };
}

/**
 * Run METEOR resolution on all raw vessel calls and cargo manifests.
 * Must be run BEFORE COMET chain building.
 */
export async function runMeteorPipeline(supabase: SupabaseClient): Promise<{
  vessels_resolved: number;
  companies_resolved: number;
  ports_resolved: number;
  unresolved_count: number;
}> {
  let vessels_resolved = 0;
  let companies_resolved = 0;
  let ports_resolved = 0;
  let unresolved_count = 0;

  // Resolve port entities first
  for (const [unlocode] of Object.entries(PERU_PORTS)) {
    await resolvePort(supabase, unlocode);
    ports_resolved++;
  }

  // Resolve vessels from raw_vessel_calls
  const { data: rawCalls } = await supabase
    .from('raw_vessel_calls')
    .select('vessel_name, imo_number, flag_state')
    .not('vessel_name', 'is', null);

  if (rawCalls) {
    const seen = new Set<string>();
    for (const call of rawCalls) {
      const key = call.imo_number || call.vessel_name;
      if (seen.has(key)) continue;
      seen.add(key);

      const result = await resolveVessel(supabase, call.vessel_name, call.imo_number, call.flag_state);
      if (result.entity.is_resolved) {
        vessels_resolved++;
      } else {
        unresolved_count++;
      }
    }
  }

  // Resolve companies from raw_cargo_manifests
  const { data: rawManifests } = await supabase
    .from('raw_cargo_manifests')
    .select('exporter_name_raw, importer_name_raw, country_of_origin, country_of_destination');

  if (rawManifests) {
    const seen = new Set<string>();
    for (const manifest of rawManifests) {
      if (manifest.exporter_name_raw) {
        const key = normalizeCompanyName(manifest.exporter_name_raw);
        if (!seen.has(key)) {
          seen.add(key);
          const result = await resolveCompany(supabase, manifest.exporter_name_raw, 'PE');
          if (result.entity.is_resolved) companies_resolved++;
          else unresolved_count++;
        }
      }
      if (manifest.importer_name_raw) {
        const key = normalizeCompanyName(manifest.importer_name_raw);
        if (!seen.has(key)) {
          seen.add(key);
          const result = await resolveCompany(supabase, manifest.importer_name_raw, manifest.country_of_destination);
          if (result.entity.is_resolved) companies_resolved++;
          else unresolved_count++;
        }
      }
    }
  }

  return { vessels_resolved, companies_resolved, ports_resolved, unresolved_count };
}
