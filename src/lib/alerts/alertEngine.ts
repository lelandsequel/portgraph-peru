import { TradeAlert, AlertSeverity } from '@/types/alert'

interface FlowState {
  entities: string[]
  topEntity: string
  topConfidence: number
  importer: string
}

export type PreviousState = Map<string, FlowState>

// Major traders for HIGH severity upgrade
const MAJOR_TRADERS = ['glencore', 'trafigura', 'mercuria', 'freeport', 'southern copper', 'zijin', 'antofagasta']

// Key destination countries for route_confirmed alerts
const ROUTE_CONFIRMED_COUNTRIES = ['china', 'japan', 'south korea', 'india', 'germany', 'taiwan']

function isMajor(name: string): boolean {
  const lower = name.toLowerCase()
  return MAJOR_TRADERS.some(t => lower.includes(t))
}

function clampConfidence(v: number): number {
  return Math.min(0.90, Math.max(0.65, v))
}

function asText(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

function flowId(f: Record<string, unknown>, i: number): string {
  return asText(f.id) || `flow-${i}`
}

function commodityName(f: Record<string, unknown>): string {
  return (
    asText(f.commodity_description) ||
    asText(f.commodity) ||
    asText(f.commodity_category).replace(/_/g, ' ') ||
    'bulk commodity'
  )
}

function originName(f: Record<string, unknown>): string {
  return asText(f.origin_country) || asText(f.country_of_origin) || asText(f.reporter_country) || 'Unknown origin'
}

function destinationName(f: Record<string, unknown>): string {
  return asText(f.destination_country) || asText(f.country_of_destination) || asText(f.importer_country) || 'Unknown destination'
}

function isUsablePlace(place: string): boolean {
  const normalized = place.trim().toLowerCase()
  if (!normalized || normalized.startsWith('unknown')) return false
  if (/^country-\d+$/.test(normalized)) return false
  if (normalized === 'other asia') return false
  return true
}

function portName(f: Record<string, unknown>): string {
  const unlocode = asText(f.peru_port_unlocode)
  if (unlocode === 'GLOBAL') return 'aggregate corridor'
  return asText(f.peru_port) || unlocode || 'observed origin'
}

function normalizedConfidence(f: Record<string, unknown>, fallback = 0.74): number {
  const raw = typeof f.confidence_score === 'number' ? f.confidence_score : fallback
  return clampConfidence(raw > 1 ? raw / 100 : raw)
}

function formatMass(kg: unknown): string {
  const value = typeof kg === 'number' ? kg : 0
  const tonnes = value / 1000
  if (!Number.isFinite(tonnes) || tonnes <= 0) return 'unreported volume'
  if (tonnes >= 1e9) return `${(tonnes / 1e9).toFixed(1)}B tonnes`
  if (tonnes >= 1e6) return `${(tonnes / 1e6).toFixed(1)}M tonnes`
  if (tonnes >= 1e3) return `${(tonnes / 1e3).toFixed(1)}K tonnes`
  return `${tonnes.toFixed(1)} tonnes`
}

// Seed alerts for first load — pick from real flow data
function seedAlerts(flows: Record<string, unknown>[]): TradeAlert[] {
  const alerts: TradeAlert[] = []
  const now = Date.now()

  const topFlows = flows
    .filter(f => {
      const origin = originName(f)
      const destination = destinationName(f)
      const md = f.match_details as Record<string, unknown> | undefined
      const vessel = asText(f.vessel_name) || asText(md?.vessel_name)
      const exporter = asText(f.exporter_name)
      const importer = asText(f.importer_name)
      const hasLane = isUsablePlace(origin) && isUsablePlace(destination)
      const hasEntity = Boolean(exporter || importer)
      const hasVessel = Boolean(vessel && isUsablePlace(destination))
      return (hasLane || hasEntity || hasVessel) && commodityName(f) !== 'bulk commodity'
    })
    .slice(0, 12)

  for (const [i, f] of topFlows.entries()) {
    if (alerts.length >= 5) break

    const origin = originName(f)
    const destination = destinationName(f)
    const commodity = commodityName(f)
    const port = portName(f)
    const exporter = asText(f.exporter_name)
    const importer = asText(f.importer_name)
    const vessel = asText(f.vessel_name) || asText((f.match_details as Record<string, unknown> | undefined)?.vessel_name)
    const confidence = normalizedConfidence(f, 0.74 + i * 0.02)
    const severity: AlertSeverity = confidence >= 0.84 || isMajor(exporter || importer) ? 'high' : 'medium'

    if (vessel && isUsablePlace(destination)) {
      alerts.push({
        id: `seed-rc-${i}`,
        type: 'route_confirmed',
        title: `${vessel} corridor observed: ${origin} → ${destination}`,
        description: `${commodity} movement tied to ${port}; confidence is source-bound, not a vessel-tracking claim.`,
        severity,
        confidence,
        timestamp: now - i * 4 * 60000,
        flowId: flowId(f, i),
        entities: [vessel, origin, destination].filter(Boolean),
      })
      continue
    }

    if (isUsablePlace(origin) && isUsablePlace(destination)) {
      alerts.push({
        id: `seed-re-${i}`,
        type: 'route_expansion',
        title: `${origin} → ${destination} lane active for ${commodity}`,
        description: `${formatMass(f.weight_kg)} observed in the current corpus; ${port === 'aggregate corridor' ? 'aggregate lane, not a port call' : `origin surfaced as ${port}`}.`,
        severity,
        confidence,
        timestamp: now - i * 5 * 60000,
        flowId: flowId(f, i),
        entities: [origin, destination, commodity].filter(Boolean),
      })
      continue
    }

    if (exporter || importer) {
      const entity = exporter || importer
      alerts.push({
        id: `seed-ee-${i}`,
        type: 'entity_entry',
        title: `${entity} appears in ${commodity} flow data`,
        description: `Counterparty evidence is present in the indexed corpus and can be inspected from the source chain.`,
        severity,
        confidence,
        timestamp: now - i * 6 * 60000,
        flowId: flowId(f, i),
        entities: [entity, exporter && importer ? importer : '', destination].filter(Boolean),
      })
      continue
    }

    if (isUsablePlace(origin)) {
      alerts.push({
        id: `seed-ds-${i}`,
        type: 'dominance_shift',
        title: `${port} ${commodity} observation needs destination proof`,
        description: `NAUTILUS indexed the port-side observation but refuses to infer a buyer country without source support.`,
        severity: 'medium',
        confidence,
        timestamp: now - i * 7 * 60000,
        flowId: flowId(f, i),
        entities: [origin, port, commodity].filter(Boolean),
      })
    }
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

    // ROUTE CONFIRMED — vessel with Peru port + destination = key country
    const md = flow.match_details as Record<string, unknown> | undefined
    const vesselName = md?.vessel_name as string
    const destCountry = (md?.destination_country as string) || (flow.destination_country as string)
    if (vesselName && destCountry) {
      const isKeyDest = ROUTE_CONFIRMED_COUNTRIES.some(c => destCountry.toLowerCase().includes(c))
      if (isKeyDest) {
        const dest = (md?.destination as string) || destCountry
        alerts.push({
          id: `rc-${id}-${now}`,
          type: 'route_confirmed',
          title: `${vesselName} heading to ${dest}`,
          description: `Loaded at ${(flow.peru_port as string) || 'Peru port'}, confirmed destination: ${dest} (${destCountry})`,
          severity: 'high',
          confidence: clampConfidence(0.88),
          timestamp: now,
          flowId: id,
          entities: [vesselName, destCountry, flow.peru_port as string].filter(Boolean),
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
