import type { TradeAlert } from '@/types/alert';
import type { ResolvedEntitiesResult } from '@/lib/cosmic/entityResolver';

interface FlowState {
  entities: string[];
  topEntity: string;
  topConfidence: number;
  importer: string;
}

// Module-level persistent state
const previousState = new Map<string, FlowState>();

// Deterministic hash — same algo as entityResolver
function deterministicHash(str: string): number {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash + str.charCodeAt(i)) & 0x7fffffff;
  }
  return hash % 100;
}

function clampConfidence(value: number): number {
  return Math.min(0.90, Math.max(0.65, value));
}

export function generateAlerts(
  flows: Array<{ id: string; destination_country: string; commodity: string; importer_name?: string }>,
  resolvedMap: Map<string, ResolvedEntitiesResult>
): TradeAlert[] {
  const alerts: TradeAlert[] = [];
  const dayKey = new Date().toISOString().slice(0, 10);

  // Count destination frequency across all previous states
  const destFrequency = new Map<string, number>();
  for (const [, state] of previousState) {
    destFrequency.set(state.importer, (destFrequency.get(state.importer) || 0) + 1);
  }

  for (const flow of flows) {
    if (alerts.length >= 10) break;

    const resolved = resolvedMap.get(flow.id);
    if (!resolved || resolved.entities.length === 0) continue;

    // 35% deterministic sampling gate
    const gateValue = deterministicHash(flow.id + dayKey);
    if (gateValue >= 35) continue;

    const producers = resolved.entities
      .filter(e => e.role === 'producer')
      .sort((a, b) => b.confidence - a.confidence);

    const allEntities = [...resolved.entities].sort((a, b) => b.confidence - a.confidence);
    const topEntity = allEntities[0];

    const currentState: FlowState = {
      entities: resolved.entities.map(e => e.id),
      topEntity: topEntity.id,
      topConfidence: topEntity.confidence,
      importer: flow.destination_country,
    };

    const prev = previousState.get(flow.id);

    // ENTITY ENTRY: new id in current top-3 producers not in previous entity list
    if (prev && producers.length > 0) {
      const prevIds = new Set(prev.entities);
      const top3Producers = producers.slice(0, 3);
      for (const producer of top3Producers) {
        if (!prevIds.has(producer.id) && alerts.length < 10) {
          alerts.push({
            id: `entry-${flow.id}-${producer.id}`,
            type: 'entity_entry',
            title: `${producer.name} entered ${flow.commodity} flows`,
            description: `New trader active in Peru \u2192 ${flow.destination_country} ${flow.commodity} route`,
            severity: 'medium',
            confidence: clampConfidence(producer.confidence * 1.05),
            timestamp: Date.now(),
            flowId: flow.id,
            entities: [producer.name],
          });
        }
      }
    }

    // DOMINANCE SHIFT: significant confidence change in top entity
    if (prev && alerts.length < 10) {
      const delta = Math.abs(currentState.topConfidence - prev.topConfidence);
      if (delta > 0.15) {
        const severity = delta > 0.25 ? 'high' : 'medium';
        const entity = allEntities.find(e => e.id === currentState.topEntity) || topEntity;
        alerts.push({
          id: `dominance-${flow.id}`,
          type: 'dominance_shift',
          title: `${entity.name} strengthening position in ${flow.commodity}`,
          description: `Control signal increased from ${Math.round(prev.topConfidence * 100)}% to ${Math.round(currentState.topConfidence * 100)}% on Peru \u2192 ${flow.destination_country} route`,
          severity,
          confidence: clampConfidence(entity.confidence * (1 + delta)),
          timestamp: Date.now(),
          flowId: flow.id,
          entities: [entity.name],
        });
      }
    }

    // ROUTE EXPANSION: new importer or low-frequency destination
    if (alerts.length < 10) {
      const isNewImporter = prev && prev.importer !== currentState.importer;
      const isLowFreqDest = (destFrequency.get(flow.destination_country) || 0) < 3;

      if (isNewImporter || (!prev && isLowFreqDest)) {
        alerts.push({
          id: `route-${flow.id}-${flow.destination_country}`,
          type: 'route_expansion',
          title: `${flow.destination_country} emerging as ${flow.commodity} buyer`,
          description: `New route detected: Peru \u2192 ${flow.destination_country} (${flow.commodity})`,
          severity: 'medium',
          confidence: clampConfidence(topEntity.confidence * 0.95),
          timestamp: Date.now(),
          flowId: flow.id,
          entities: allEntities.slice(0, 3).map(e => e.name),
        });
      }
    }

    // Update state for next invocation
    previousState.set(flow.id, currentState);
  }

  return alerts.slice(0, 10);
}
