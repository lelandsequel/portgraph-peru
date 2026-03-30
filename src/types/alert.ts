export type AlertType = 'entity_entry' | 'dominance_shift' | 'route_expansion' | 'route_confirmed'
  | 'demand_surge' | 'supply_disruption' | 'new_corridor' | 'critical_mineral_alert'
export type AlertSeverity = 'medium' | 'high'

export interface TradeAlert {
  id: string
  type: AlertType
  title: string
  description: string
  severity: AlertSeverity
  confidence: number
  timestamp: number
  flowId: string
  entities: string[]
}
