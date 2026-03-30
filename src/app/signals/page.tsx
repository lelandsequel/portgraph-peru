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
  entity_entry: 'text-[#00263f] bg-[#cee5ff]/60',
  dominance_shift: 'text-[#5c006a] bg-[#f3d0ff]/60',
  route_expansion: 'text-[#006a62] bg-[#70f8e8]/30',
  route_confirmed: 'text-[#8b4513] bg-[#ffecd2]/80',
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
      className={`rounded-lg p-5 transition-all shadow-[0_1px_4px_rgba(24,28,30,0.07)] ${
        isHigh ? 'bg-[#fff5f5] border-l-4 border-l-[#ba1a1a]' : 'bg-white'
      }`}
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`text-[9px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full ${TYPE_COLOR[alert.type] ?? 'text-[#42474e] bg-[#f1f4f6]'}`}>
            {TYPE_LABEL[alert.type]}
          </span>
          <span className={`text-[9px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full ${
            isHigh
              ? 'bg-[#ffdad6] text-[#ba1a1a]'
              : 'bg-[#fff9e6] text-[#7a5800]'
          }`} style={{ fontFamily: 'Manrope' }}>
            {alert.severity.toUpperCase()}
          </span>
        </div>
        <div className="text-right shrink-0">
          <div className="text-xs text-[#42474e]" style={{ fontFamily: 'JetBrains Mono, monospace' }}>{(alert.confidence * 100).toFixed(0)}% conf</div>
          <div className="text-[10px] text-[#72777e]">{timeAgo(alert.timestamp)}</div>
        </div>
      </div>

      <div className="text-sm font-semibold text-[#00263f] mb-1" style={{ fontFamily: 'Manrope' }}>{alert.title}</div>
      <div className="text-xs text-[#42474e] mb-3 leading-relaxed">{alert.description}</div>

      {alert.entities.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {alert.entities.slice(0, 3).map((e, i) => (
            <span key={i} className="text-[10px] px-2.5 py-0.5 rounded-full bg-[#f1f4f6] text-[#42474e]" style={{ fontFamily: 'Manrope' }}>
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
    <div className="p-4 sm:p-10 max-w-4xl">
      <div className="mb-6 sm:mb-10">
        <div className="flex items-center justify-between mb-1 gap-2">
          <h1 className="text-xl sm:text-3xl font-thin tracking-wide text-[#00263f]" style={{ fontFamily: 'Sora, Manrope' }}>Key Signals</h1>
          {lastRefresh && (
            <span className="text-xs text-[#72777e]" style={{ fontFamily: 'JetBrains Mono, monospace' }}>Updated {lastRefresh}</span>
          )}
        </div>
        <p className="text-[#72777e] text-sm mt-1">
          Detected shifts in trade relationships and control
        </p>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-28 rounded-lg bg-white animate-pulse shadow-sm" />
          ))}
        </div>
      ) : alerts.length === 0 ? (
        <div className="text-center py-20 text-[#72777e]">
          <div className="text-4xl mb-4 opacity-30">◎</div>
          <div className="text-sm">No signals detected. Monitoring trade flows.</div>
        </div>
      ) : (
        <div className="space-y-3">
          {alerts.map(alert => (
            <AlertCard key={alert.id} alert={alert} />
          ))}
        </div>
      )}
    </div>
  )
}
