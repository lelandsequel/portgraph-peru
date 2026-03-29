import { ResolvedEntity } from './entityResolver';

export interface TradeChainLink {
  role: string;
  entity: { id: string; name: string };
  confidence: number;
}

export interface TradeChainResult {
  chain: TradeChainLink[];
  overall_confidence: number;
  confidence_tier: 'HIGH' | 'MEDIUM' | 'LOW';
}

export function buildTradeChain(resolvedEntities: ResolvedEntity[]): TradeChainResult {
  const byRole: Record<string, ResolvedEntity | undefined> = {};

  for (const role of ['producer', 'trader', 'buyer']) {
    const candidates = resolvedEntities.filter(e => e.role === role);
    if (candidates.length > 0) {
      byRole[role] = candidates.reduce((a, b) => a.confidence >= b.confidence ? a : b);
    }
  }

  const chain: TradeChainLink[] = [];
  for (const role of ['producer', 'trader', 'buyer']) {
    const entity = byRole[role];
    if (entity) {
      chain.push({
        role,
        entity: { id: entity.id, name: entity.name },
        confidence: entity.confidence,
      });
    }
  }

  const overall = chain.length > 0
    ? Math.round((chain.reduce((s, l) => s + l.confidence, 0) / chain.length) * 100) / 100
    : 0;

  const confidence_tier: 'HIGH' | 'MEDIUM' | 'LOW' =
    overall > 0.8 ? 'HIGH' : overall >= 0.6 ? 'MEDIUM' : 'LOW';

  return { chain, overall_confidence: overall, confidence_tier };
}
