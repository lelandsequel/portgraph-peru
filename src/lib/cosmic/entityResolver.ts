import entitiesData from '@/data/entities.json';

export interface EntityRecord {
  id: string;
  name: string;
  type: string;
  commodities: string[];
  regions: string[];
  roles: string[];
  market_presence: 'major' | 'significant' | 'regional';
}

export interface ResolvedEntity {
  id: string;
  name: string;
  role: string;
  confidence: number;
}

export interface ResolvedEntitiesResult {
  entities: ResolvedEntity[];
  timestamp: string;
}

const entities: EntityRecord[] = entitiesData as EntityRecord[];

// Deterministic hash for pseudo-variance (no Math.random)
function deterministicHash(str: string): number {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash + str.charCodeAt(i)) & 0x7fffffff;
  }
  return (hash % 1000) / 1000; // 0..0.999
}

// Normalize country names to match entity regions
function normalizeCountry(country: string): string[] {
  const c = country.toLowerCase().trim();
  const map: Record<string, string[]> = {
    peru: ['peru'],
    china: ['china'],
    japan: ['japan'],
    korea: ['korea'],
    'south korea': ['korea'],
    'republic of korea': ['korea'],
    india: ['india'],
    germany: ['europe'],
    spain: ['europe'],
    netherlands: ['europe'],
    belgium: ['europe'],
    finland: ['europe'],
    sweden: ['europe'],
    italy: ['europe'],
    france: ['europe'],
    'united kingdom': ['europe'],
    uk: ['europe'],
    chile: ['chile'],
    australia: ['australia'],
    usa: ['global'],
    'united states': ['global'],
    brazil: ['global'],
    canada: ['global'],
    taiwan: ['china'],
    philippines: ['global'],
    thailand: ['global'],
  };
  return map[c] || ['global'];
}

function normalizeCommodity(commodity: string): string {
  const c = commodity.toLowerCase().trim();
  if (c.includes('copper')) return 'copper';
  if (c.includes('zinc')) return 'zinc';
  if (c.includes('lead')) return 'lead';
  if (c.includes('iron') || c.includes('ore')) return 'iron_ore';
  return c;
}

// Module-level cache
const resolverCache = new Map<string, ResolvedEntitiesResult>();

function flowCacheKey(exporter: string, importer: string, commodity: string): string {
  return `${exporter.toLowerCase()}|${importer.toLowerCase()}|${commodity.toLowerCase()}`;
}

export function resolveEntities(flow: {
  exporter_country: string;
  importer_country: string;
  commodity: string;
  value: number;
}): ResolvedEntitiesResult {
  const cacheKey = flowCacheKey(flow.exporter_country, flow.importer_country, flow.commodity);
  const cached = resolverCache.get(cacheKey);
  if (cached) return cached;

  const exporterRegions = normalizeCountry(flow.exporter_country);
  const importerRegions = normalizeCountry(flow.importer_country);
  const normalizedCommodity = normalizeCommodity(flow.commodity);

  // Score each entity
  const scored: Array<{ entity: EntityRecord; role: string; confidence: number }> = [];

  for (const entity of entities) {
    for (const role of entity.roles) {
      // 1. Geography Match (0.30)
      let geoScore = 0;
      if (role === 'producer') {
        geoScore = entity.regions.some(r => exporterRegions.includes(r)) ? 1 : 0;
      } else if (role === 'buyer') {
        geoScore = entity.regions.some(r => importerRegions.includes(r)) ? 1 : 0;
      } else {
        // Traders: match if global or either side
        geoScore = entity.regions.includes('global') ||
          entity.regions.some(r => exporterRegions.includes(r)) ||
          entity.regions.some(r => importerRegions.includes(r)) ? 1 : 0;
      }

      // 2. Commodity Match (0.30)
      const commodityScore = entity.commodities.includes(normalizedCommodity) ? 1 : 0;

      // 3. Role Compatibility (0.20)
      const roleScore = 1; // already filtering by role

      // 4. Market Presence (0.085 — reduced from 0.10)
      const presenceScore = entity.market_presence === 'major' ? 1.0
        : entity.market_presence === 'significant' ? 0.7
        : 0.3;

      // 5. Deterministic Variance (0.115 — increased from 0.10, adds spread between candidates)
      // Two independent hash seeds for richer entropy across top-3
      const hashInput = entity.id + normalizedCommodity + flow.exporter_country.toLowerCase();
      const hashInput2 = entity.id + flow.importer_country.toLowerCase() + role;
      const v1 = deterministicHash(hashInput);
      const v2 = deterministicHash(hashInput2);
      const variance = (v1 * 0.65 + v2 * 0.35); // blend two seeds

      const raw = Math.min(1, Math.max(0,
        geoScore * 0.30 +
        commodityScore * 0.30 +
        roleScore * 0.20 +
        presenceScore * 0.085 +
        variance * 0.115
      ));

      // Scale raw [0..1] into [0.62..0.92] — keeps full spread, avoids ceiling clustering
      const confidence = 0.62 + raw * 0.30;

      scored.push({ entity, role, confidence });
    }
  }

  // Group by role, sort desc, take top 3 each
  const byRole: Record<string, typeof scored> = { producer: [], trader: [], buyer: [] };
  for (const s of scored) {
    if (byRole[s.role]) byRole[s.role].push(s);
  }

  const result: ResolvedEntity[] = [];
  for (const role of ['producer', 'trader', 'buyer']) {
    byRole[role].sort((a, b) => b.confidence - a.confidence);
    for (const s of byRole[role].slice(0, 3)) {
      result.push({
        id: s.entity.id,
        name: s.entity.name,
        role,
        // Round to 2dp for display — keeps values distinct between top-3
        confidence: Math.round(s.confidence * 100) / 100,
      });
    }
  }

  const out: ResolvedEntitiesResult = {
    entities: result,
    timestamp: new Date().toISOString(),
  };

  resolverCache.set(cacheKey, out);
  return out;
}
