'use client'

import { useState, useEffect, useRef } from 'react'
import { TradeAlert } from '@/types/alert'
import { generateAlerts, PreviousState } from '@/lib/alerts/alertEngine'

const TYPE_LABEL: Record<string, string> = {
  entity_entry: 'Entity Entry',
  dominance_shift: 'Dominance Shift',
  route_expansion: 'Route Expansion',
}

const TYPE_COLOR: Record<string, string> = {
  entity_entry: 'text-blue-400 bg-blue-900/40 border-blue-800',
  dominance_shift: 'text-purple-400 bg-purple-900/40 border-purple-800',
  route_expansion: 'text-emerald-400 bg-emerald-900/40 border-emerald-800',
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
      className={`rounded-sm border p-4 transition-all ${
        isHigh
          ? 'border-red-800 bg-red-950/20'
          : 'border-gray-800 bg-gray-900/40'
      }`}
    >
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-sm border ${TYPE_COLOR[alert.type] ?? 'text-gray-400 bg-gray-800 border-gray-700'}`}>
            {TYPE_LABEL[alert.type]}
          </span>
          <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-sm border ${
            isHigh
              ? 'bg-red-900/50 text-red-400 border-red-800'
              : 'bg-amber-900/50 text-amber-400 border-amber-800'
          }`}>
            {alert.severity.toUpperCase()}
          </span>
        </div>
        <div className="text-right shrink-0">
          <div className="text-xs font-mono text-gray-400">{(alert.confidence * 100).toFixed(0)}%</div>
          <div className="text-[10px] text-gray-600">{timeAgo(alert.timestamp)}</div>
        </div>
      </div>

      <div className="text-sm font-bold text-white mb-1">{alert.title}</div>
      <div className="text-xs text-gray-400 mb-3">{alert.description}</div>

      {alert.entities.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {alert.entities.slice(0, 3).map((e, i) => (
            <span key={i} className="text-[10px] px-2 py-0.5 rounded-sm bg-gray-800 text-gray-300 border border-gray-700">
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
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <div className="flex items-center justify-between mb-1">
          <h1 className="text-2xl font-bold text-white">Key Signals</h1>
          {lastRefresh && (
            <span className="text-xs text-gray-600 font-mono">Updated {lastRefresh}</span>
          )}
        </div>
        <p className="text-gray-400 text-sm">
          Detected shifts in trade relationships and control
        </p>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-28 rounded-sm bg-gray-900/40 border border-gray-800 animate-pulse" />
          ))}
        </div>
      ) : alerts.length === 0 ? (
        <div className="text-center py-20 text-gray-600">
          <div className="text-4xl mb-4">◎</div>
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
