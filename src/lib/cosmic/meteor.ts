// METEOR — Entity Resolution Engine
// Resolves relationships: Mine -> Port -> Vessel -> Destination -> Buyer

export interface EntityLink {
  type: 'mine' | 'port' | 'vessel' | 'destination' | 'buyer';
  name: string;
  confidence: number;
}

export interface MeteorResult {
  entity_chain: EntityLink[];
  composite_confidence: number;
}

const LINK_WEIGHTS: Record<EntityLink['type'], number> = {
  mine: 0.85,
  port: 0.90,
  vessel: 0.99,
  destination: 0.80,
  buyer: 0.75,
};

function fuzzyMatch(a: string, b: string): number {
  if (!a || !b) return 0;
  const al = a.toLowerCase().trim();
  const bl = b.toLowerCase().trim();
  if (al === bl) return 1.0;
  if (al.includes(bl) || bl.includes(al)) return 0.85;
  // Simple character overlap score
  const setA = new Set(al.split(''));
  const setB = new Set(bl.split(''));
  let overlap = 0;
  setA.forEach(c => { if (setB.has(c)) overlap++; });
  return overlap / Math.max(setA.size, setB.size);
}

export function resolveEntityChain(input: {
  vessel_imo?: string;
  vessel_name?: string;
  port_name?: string;
  port_unlocode?: string;
  origin_country?: string;
  destination_country?: string;
  destination_port?: string;
  exporter_name?: string;
  importer_name?: string;
  mine_name?: string;
}): MeteorResult {
  const chain: EntityLink[] = [];
  let missingLinks = 0;

  // Mine
  if (input.mine_name || input.exporter_name) {
    chain.push({
      type: 'mine',
      name: input.mine_name || input.exporter_name || '',
      confidence: input.mine_name ? LINK_WEIGHTS.mine : LINK_WEIGHTS.mine * 0.8,
    });
  } else {
    missingLinks++;
  }

  // Port
  if (input.port_unlocode || input.port_name) {
    const conf = input.port_unlocode ? LINK_WEIGHTS.port : LINK_WEIGHTS.port * 0.85;
    chain.push({
      type: 'port',
      name: input.port_name || input.port_unlocode || '',
      confidence: conf,
    });
  } else {
    missingLinks++;
  }

  // Vessel
  if (input.vessel_imo || input.vessel_name) {
    const conf = input.vessel_imo ? LINK_WEIGHTS.vessel : LINK_WEIGHTS.vessel * 0.80;
    chain.push({
      type: 'vessel',
      name: input.vessel_name || input.vessel_imo || '',
      confidence: conf,
    });
  } else {
    missingLinks++;
  }

  // Destination
  if (input.destination_country || input.destination_port) {
    // Route history approximation: known major destinations get higher confidence
    const majorDests = ['china', 'japan', 'south korea', 'india', 'germany', 'netherlands'];
    const dest = (input.destination_country || '').toLowerCase();
    const isMajor = majorDests.some(m => dest.includes(m));
    const baseConf = isMajor ? 0.90 : 0.75;
    chain.push({
      type: 'destination',
      name: input.destination_port || input.destination_country || '',
      confidence: input.destination_port ? baseConf : baseConf * 0.85,
    });
  } else {
    missingLinks++;
  }

  // Buyer
  if (input.importer_name) {
    chain.push({
      type: 'buyer',
      name: input.importer_name,
      confidence: LINK_WEIGHTS.buyer,
    });
  } else {
    missingLinks++;
  }

  // Composite confidence: geometric mean of link confidences minus penalty for missing links
  const confidences = chain.map(c => c.confidence);
  const geoMean = confidences.length > 0
    ? Math.pow(confidences.reduce((a, b) => a * b, 1), 1 / confidences.length)
    : 0;
  const penalty = missingLinks * 0.10;
  const composite = Math.max(0, Math.min(1, geoMean - penalty));

  return { entity_chain: chain, composite_confidence: parseFloat(composite.toFixed(3)) };
}

export { fuzzyMatch };
