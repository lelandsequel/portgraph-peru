'use client'

import { useState, useEffect, useRef } from 'react'
import { TradeAlert } from '@/types/alert'
import { generateAlerts, PreviousState } from '@/lib/alerts/alertEngine'

const TYPE_LABEL: Record<string, string> = {
  entity_entry: 'Entity Entry',
  dominance_shift: 'Dominance Shift',
  route_expansion: 'Route Expansion',
  route_confirmed: 'Route Confirmed',
  demand_surge: 'Demand Surge',
  supply_disruption: 'Supply Disruption',
  new_corridor: 'New Corridor',
  critical_mineral_alert: 'Critical Mineral',
}

const TYPE_COLOR: Record<string, string> = {
  entity_entry: 'text-[#4C6A92] bg-[#4C6A92]/15',
  dominance_shift: 'text-purple-400 bg-purple-500/15',
  route_expansion: 'text-emerald-400 bg-emerald-500/15',
  route_confirmed: 'text-[#C6A86B] bg-[#C6A86B]/15',
  demand_surge: 'text-rose-400 bg-rose-500/15',
  supply_disruption: 'text-orange-400 bg-orange-500/15',
  new_corridor: 'text-cyan-400 bg-cyan-500/15',
  critical_mineral_alert: 'text-fuchsia-400 bg-fuchsia-500/15',
}

function timeAgo(ts: number): string {
  const s = Math.floor((Date.now() - ts) / 1000)
  if (s < 60) return `${s}s ago`
  if (s < 3600) return `${Math.floor(s / 60)}m ago`
  return `${Math.floor(s / 3600)}h ago`
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
      const res = await fetch('/api/feed')
      if (!res.ok) throw new Error('Feed failed')
      const data = await res.json()
      const flows = data.flows || []
      const { alerts: newAlerts, nextState } = generateAlerts(flows, prevStateRef.current)
      prevStateRef.current = nextState
      if (newAlerts.length > 0) {
        setAlerts(prev => {
          const combined = [...newAlerts, ...prev]
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
          Detected shifts in trade relationships and control
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
          <div className="text-sm">No signals detected. Monitoring trade flows.</div>
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
