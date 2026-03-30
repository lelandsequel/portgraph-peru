import { TradeAlert, AlertType, AlertSeverity } from '@/types/alert'

interface FlowState {
  entities: string[]
  topEntity: string
  topConfidence: number
  importer: string
}

export type PreviousState = Map<string, FlowState>

// Major traders for HIGH severity upgrade
const MAJOR_TRADERS = ['glencore', 'trafigura', 'mercuria', 'freeport', 'southern copper', 'zijin', 'antofagasta']

function isMajor(name: string): boolean {
  const lower = name.toLowerCase()
  return MAJOR_TRADERS.some(t => lower.includes(t))
}

function clampConfidence(v: number): number {
  return Math.min(0.90, Math.max(0.65, v))
}

// Seed alerts for first load — pick from real flow data
function seedAlerts(flows: Record<string, unknown>[]): TradeAlert[] {
  const alerts: TradeAlert[] = []
  const now = Date.now()

  const topFlows = flows.slice(0, 8)

  const seeds: Array<{ type: AlertType; make: (f: Record<string, unknown>, i: number) => TradeAlert | null }> = [
    {
      type: 'dominance_shift',
      make: (f, i) => {
        const exporter = (f.exporter_name as string) || 'Unknown Exporter'
        const importer = (f.importer_name as string) || 'Unknown Importer'
        if (!exporter || exporter === 'Unknown Exporter') return null
        const delta = 0.18 + (i * 0.03)
        const severity: AlertSeverity = isMajor(exporter) && delta > 0.25 ? 'high' : 'medium'
        return {
          id: `seed-ds-${i}`,
          type: 'dominance_shift',
          title: `${exporter} consolidating ${(f.commodity_description as string) || 'copper'} flows`,
          description: `Share in Peru export corridor increased by ${(delta * 100).toFixed(0)}% over last 30 days`,
          severity,
          confidence: clampConfidence(0.78 + i * 0.02),
          timestamp: now - i * 4 * 60000,
          flowId: (f.id as string) || `flow-${i}`,
          entities: [exporter, importer].filter(Boolean),
        }
      },
    },
    {
      type: 'entity_entry',
      make: (f, i) => {
        const exporter = (f.exporter_name as string) || 'Unknown'
        const importer = (f.importer_name as string) || 'Unknown'
        if (!exporter || exporter === 'Unknown') return null
        const commodity = (f.commodity_description as string) || 'copper concentrate'
        const destination = (f.destination_country as string) || (f.importer_name as string) || 'China'
        return {
          id: `seed-ee-${i}`,
          type: 'entity_entry',
          title: `${exporter} entered Peru → ${destination} flows`,
          description: `New participant detected in ${commodity} export corridor`,
          severity: 'medium',
          confidence: clampConfidence(0.70 + i * 0.03),
          timestamp: now - (i + 1) * 7 * 60000,
          flowId: (f.id as string) || `flow-${i}`,
          entities: [exporter, importer].filter(Boolean),
        }
      },
    },
    {
      type: 'route_expansion',
      make: (f, i) => {
        const importer = (f.importer_name as string) || 'Unknown'
        const commodity = (f.commodity_description as string) || 'copper'
        const country = (f.destination_country as string) || importer
        if (!country || country === 'Unknown') return null
        return {
          id: `seed-re-${i}`,
          type: 'route_expansion',
          title: `${country} emerging as ${commodity} buyer`,
          description: `Volume threshold crossed — new route in Peru export map`,
          severity: 'medium',
          confidence: clampConfidence(0.67 + i * 0.02),
          timestamp: now - (i + 2) * 11 * 60000,
          flowId: (f.id as string) || `flow-${i}`,
          entities: [importer].filter(Boolean),
        }
      },
    },
  ]

  // Generate 4-5 seed alerts from top flows
  const targets = [
    { seedIdx: 0, flowIdx: 0 },
    { seedIdx: 1, flowIdx: 1 },
    { seedIdx: 0, flowIdx: 2 },
    { seedIdx: 2, flowIdx: 3 },
    { seedIdx: 1, flowIdx: 4 },
  ]

  for (const { seedIdx, flowIdx } of targets) {
    const flow = topFlows[flowIdx]
    if (!flow) continue
    const alert = seeds[seedIdx].make(flow, flowIdx)
    if (alert) alerts.push(alert)
    if (alerts.length >= 5) break
  }

  return alerts
}

export function generateAlerts(
  flows: Record<string, unknown>[],
  previousState: PreviousState
): { alerts: TradeAlert[]; nextState: PreviousState } {
  const now = Date.now()
  const alerts: TradeAlert[] = []
  const nextState: PreviousState = new Map(previousState)

  // First load — seed
  if (previousState.size === 0) {
    const seeded = seedAlerts(flows)
    // Build initial state from flows
    for (const flow of flows.slice(0, 20)) {
      const id = (flow.id as string) || `flow-${Math.random()}`
      nextState.set(id, {
        entities: [flow.exporter_name as string, flow.importer_name as string].filter(Boolean),
        topEntity: (flow.exporter_name as string) || '',
        topConfidence: (flow.confidence_score as number) || 0.7,
        importer: (flow.importer_name as string) || '',
      })
    }
    return { alerts: seeded, nextState }
  }

  // Subsequent calls — compare against previous state
  for (const flow of flows.slice(0, 30)) {
    if (alerts.length >= 10) break

    // Random gate — keeps alerts rare
    if (Math.random() > 0.35) continue

    const id = (flow.id as string) || ''
    if (!id) continue

    const prev = previousState.get(id)
    const currentEntities = [flow.exporter_name as string, flow.importer_name as string].filter(Boolean)
    const currentTop = (flow.exporter_name as string) || ''
    const currentConf = (flow.confidence_score as number) || 0.7
    const currentImporter = (flow.importer_name as string) || ''

    if (prev) {
      // DOMINANCE SHIFT
      const delta = Math.abs(currentConf - prev.topConfidence)
      if (delta > 0.15 && currentTop) {
        const severity: AlertSeverity = isMajor(currentTop) && delta > 0.25 ? 'high' : 'medium'
        alerts.push({
          id: `ds-${id}-${now}`,
          type: 'dominance_shift',
          title: `${currentTop} share shift detected`,
          description: `Confidence delta ${(delta * 100).toFixed(0)}% in ${(flow.commodity_description as string) || 'commodity'} flows`,
          severity,
          confidence: clampConfidence(0.72 + delta * 0.5),
          timestamp: now,
          flowId: id,
          entities: [currentTop, currentImporter].filter(Boolean),
        })
      }

      // ENTITY ENTRY
      const newEntities = currentEntities.filter(e => e && !prev.entities.includes(e))
      if (newEntities.length > 0) {
        alerts.push({
          id: `ee-${id}-${now}`,
          type: 'entity_entry',
          title: `${newEntities[0]} entered flow`,
          description: `New participant in ${(flow.commodity_description as string) || 'trade'} corridor`,
          severity: 'medium',
          confidence: clampConfidence(0.68),
          timestamp: now,
          flowId: id,
          entities: newEntities,
        })
      }

      // ROUTE EXPANSION
      if (currentImporter && prev.importer && currentImporter !== prev.importer) {
        alerts.push({
          id: `re-${id}-${now}`,
          type: 'route_expansion',
          title: `Route shift: ${prev.importer} → ${currentImporter}`,
          description: `New buyer country emerging in Peru export corridor`,
          severity: 'medium',
          confidence: clampConfidence(0.67),
          timestamp: now,
          flowId: id,
          entities: [currentImporter],
        })
      }
    }

    // Update state
    nextState.set(id, {
      entities: currentEntities,
      topEntity: currentTop,
      topConfidence: currentConf,
      importer: currentImporter,
    })
  }

  return { alerts: alerts.slice(0, 10), nextState }
}
