'use client'

import { useState, useEffect, useRef } from 'react'
import { TradeAlert } from '@/types/alert'
import { generateAlerts, PreviousState } from '@/lib/alerts/alertEngine'

const TYPE_LABEL: Record<string, string> = {
  entity_entry: 'Entity Entry',
  dominance_shift: 'Dominance Shift',
  route_expansion: 'Route Expansion',
  route_confirmed: 'Route Confirmed',
}

const TYPE_COLOR: Record<string, string> = {
  entity_entry: 'text-[#4C6A92] bg-[#4C6A92]/15',
  dominance_shift: 'text-purple-400 bg-purple-500/15',
  route_expansion: 'text-emerald-400 bg-emerald-500/15',
  route_confirmed: 'text-[#C6A86B] bg-[#C6A86B]/15',
}

interface RouteSignal {
  origin: string
  destination: string
  shipment_count: number
  total_weight_kg: number
  commodities: string[]
  confidence_tier: string
  port: string
}

function timeAgo(ts: number): string {
  const s = Math.floor((Date.now() - ts) / 1000)
  if (s < 60) return `${s}s ago`
  if (s < 3600) return `${Math.floor(s / 60)}m ago`
  return `${Math.floor(s / 3600)}h ago`
}

function formatWeight(kg: number): string {
  const tonnes = kg / 1000
  if (tonnes >= 1e9) return `${(tonnes / 1e9).toFixed(1)}B tonnes`
  if (tonnes >= 1e6) return `${(tonnes / 1e6).toFixed(1)}M tonnes`
  if (tonnes >= 1e3) return `${(tonnes / 1e3).toFixed(1)}K tonnes`
  return `${tonnes.toFixed(1)} tonnes`
}

function routeBackedAlerts(routes: RouteSignal[]): TradeAlert[] {
  const now = Date.now()
  return routes.slice(0, 5).map((route, i) => {
    const commodity = route.commodities[0] || 'commodity'
    const aggregate = route.port === 'GLOBAL'
    return {
      id: `route-backed-${route.origin}-${route.destination}-${i}`,
      type: aggregate ? 'route_expansion' : 'route_confirmed',
      title: `${route.origin} → ${route.destination} ${commodity} corridor observed`,
      description: `${route.shipment_count} indexed rows, ${formatWeight(route.total_weight_kg)}. ${aggregate ? 'Aggregate lane, not a vessel call.' : 'Port-call lane with origin port evidence.'}`,
      severity: route.confidence_tier === 'HIGH' ? 'high' : 'medium',
      confidence: route.confidence_tier === 'HIGH' ? 0.88 : 0.74,
      timestamp: now - i * 6 * 60000,
      flowId: `route-${i}`,
      entities: [route.origin, route.destination, commodity],
    }
  })
}

function AlertCard({ alert }: { alert: TradeAlert }) {
  const isHigh = alert.severity === 'high'
  return (
    <div
      className={`p-4 transition-all border-l-2 ${
        isHigh ? 'bg-red-900/10 border-l-red-500' : 'bg-[#121722] border-l-[#1e2535]'
      }`}
    >
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 ${TYPE_COLOR[alert.type] ?? 'text-[#8a9bb0] bg-[#1a2030]'}`}>
            {TYPE_LABEL[alert.type]}
          </span>
          <span className={`text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 ${
            isHigh
              ? 'bg-red-900/30 text-red-400'
              : 'bg-amber-900/20 text-amber-400'
          }`} style={{ fontFamily: 'Manrope' }}>
            {alert.severity.toUpperCase()}
          </span>
        </div>
        <div className="text-right shrink-0">
          <div className="text-xs text-[#8a9bb0]" style={{ fontFamily: 'JetBrains Mono, monospace' }}>{(alert.confidence * 100).toFixed(0)}% conf</div>
          <div className="text-[10px] text-[#6b7a8d]">{timeAgo(alert.timestamp)}</div>
        </div>
      </div>

      <div className="text-sm font-medium text-[#e0e6ed] mb-1" style={{ fontFamily: 'Manrope' }}>{alert.title}</div>
      <div className="text-xs text-[#8a9bb0] mb-3 leading-relaxed">{alert.description}</div>

      {alert.entities.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {alert.entities.slice(0, 3).map((e, i) => (
            <span key={i} className="text-[10px] px-2 py-0.5 bg-[#1a2030] text-[#8a9bb0] border border-[#1e2535]" style={{ fontFamily: 'Manrope' }}>
              {e}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}

export default function SignalsPage() {
  const [alerts, setAlerts] = useState<TradeAlert[]>([])
  const [loading, setLoading] = useState(true)
  const [lastRefresh, setLastRefresh] = useState<string>('')
  const prevStateRef = useRef<PreviousState>(new Map())

  const refresh = async (showLoading = false) => {
    if (showLoading) setLoading(true)
    try {
      const [feedRes, routesRes] = await Promise.all([
        fetch('/api/feed'),
        fetch('/api/routes'),
      ])
      if (!feedRes.ok) throw new Error('Feed failed')
      const data = await feedRes.json()
      const routeData = routesRes.ok ? await routesRes.json() : { routes: [] }
      const flows = data.flows || []
      const { alerts: newAlerts, nextState } = generateAlerts(flows, prevStateRef.current)
      const alertsToAdd = newAlerts.length > 0 ? newAlerts : routeBackedAlerts(routeData.routes || [])
      prevStateRef.current = nextState
      if (alertsToAdd.length > 0) {
        setAlerts(prev => {
          const combined = [...alertsToAdd, ...prev]
          const seen = new Set<string>()
          return combined.filter(a => {
            if (seen.has(a.id)) return false
            seen.add(a.id)
            return true
          }).slice(0, 10)
        })
      }
      setLastRefresh(new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }))
    } catch (e) {
      console.error('Signal refresh failed', e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    refresh(true)
    const interval = setInterval(() => refresh(false), 15000)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="p-4 sm:p-8 max-w-4xl">
      <div className="mb-6">
        <div className="flex items-center justify-between mb-1 gap-2">
          <h1 className="text-xl sm:text-2xl font-thin tracking-wide text-[#C6A86B]" style={{ fontFamily: 'Sora, Manrope' }}>Signals</h1>
          {lastRefresh && (
            <span className="text-[10px] text-[#6b7a8d]" style={{ fontFamily: 'JetBrains Mono, monospace' }}>Updated {lastRefresh}</span>
          )}
        </div>
        <p className="text-[#6b7a8d] text-sm">
          Observed corridor shifts, counterparty evidence, and source-bound confidence signals
        </p>
      </div>

      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-24 bg-[#121722] animate-pulse" />
          ))}
        </div>
      ) : alerts.length === 0 ? (
        <div className="text-center py-20 text-[#6b7a8d]">
          <div className="text-4xl mb-4 opacity-30">◎</div>
          <div className="text-sm">No source-backed signals match the current corpus window.</div>
        </div>
      ) : (
        <div className="space-y-px bg-[#1e2535]">
          {alerts.map(alert => (
            <AlertCard key={alert.id} alert={alert} />
          ))}
        </div>
      )}
    </div>
  )
}
