'use client';

import { useEffect, useState, useCallback } from 'react';
import EntityPanel from '@/components/EntityPanel';
import type { TradeAlert } from '@/types/alert';

interface PanelState {
  exporter: string;
  importer: string;
  commodity: string;
  value: number;
}

function timeAgo(timestamp: number): string {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  return `${hours}h ago`;
}

function severityClasses(severity: 'medium' | 'high'): string {
  return severity === 'high'
    ? 'bg-red-900/50 text-red-400 border-red-800'
    : 'bg-amber-900/50 text-amber-400 border-amber-800';
}

function typeLabel(type: TradeAlert['type']): string {
  switch (type) {
    case 'entity_entry': return 'ENTITY ENTRY';
    case 'dominance_shift': return 'DOMINANCE SHIFT';
    case 'route_expansion': return 'ROUTE EXPANSION';
  }
}

export default function SignalsPage() {
  const [alerts, setAlerts] = useState<TradeAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [panel, setPanel] = useState<PanelState | null>(null);

  const fetchSignals = useCallback(async () => {
    try {
      const res = await fetch('/api/signals');
      const data = await res.json();
      if (data.alerts) setAlerts(data.alerts);
    } catch {
      // silently retry on next interval
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSignals();
    const interval = setInterval(fetchSignals, 15000);
    return () => clearInterval(interval);
  }, [fetchSignals]);

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Key Signals</h1>
        <p className="text-gray-400 text-sm mt-1">
          Detected shifts in trade relationships and control
        </p>
      </div>

      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="bg-gray-900 rounded-lg border border-gray-800 p-5 animate-pulse">
              <div className="h-4 bg-gray-800 rounded w-2/3 mb-3" />
              <div className="h-3 bg-gray-800 rounded w-full mb-2" />
              <div className="h-3 bg-gray-800 rounded w-1/2" />
            </div>
          ))}
        </div>
      ) : alerts.length === 0 ? (
        <div className="bg-gray-900 rounded-lg border border-gray-800 p-12 text-center">
          <p className="text-gray-500">No significant shifts detected in current window</p>
        </div>
      ) : (
        <div className="space-y-3">
          {alerts.map(alert => (
            <button
              key={alert.id}
              onClick={() => {
                // Extract destination from description
                const destMatch = alert.description.match(/Peru\s*\u2192\s*(\S+)/);
                const dest = destMatch ? destMatch[1] : '';
                const commodityMatch = alert.description.match(/\(([^)]+)\)/) ||
                  alert.title.match(/in\s+(.+)$/) ||
                  alert.title.match(/(\S+)\s+flows/);
                const commodity = commodityMatch ? commodityMatch[1] : '';
                setPanel({ exporter: 'Peru', importer: dest, commodity, value: 0 });
              }}
              className="w-full text-left bg-gray-900 rounded-lg border border-gray-800 hover:border-gray-700 p-5 transition-colors"
            >
              <div className="flex items-start justify-between gap-4 mb-3">
                <div className="flex-1">
                  <h3 className="text-white font-semibold text-sm">{alert.title}</h3>
                  <p className="text-gray-400 text-sm mt-1">{alert.description}</p>
                </div>
                <div className="flex flex-col items-end gap-1.5 shrink-0">
                  <span className={`text-[10px] px-2 py-0.5 rounded border font-mono uppercase ${severityClasses(alert.severity)}`}>
                    {alert.severity}
                  </span>
                  <span className="text-[10px] text-gray-500 font-mono">
                    {typeLabel(alert.type)}
                  </span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 flex-wrap">
                  {alert.entities.map((name, i) => (
                    <span key={i} className="text-[11px] px-2 py-0.5 rounded bg-gray-800 text-gray-400 border border-gray-700">
                      {name}
                    </span>
                  ))}
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className="text-xs text-cyan-400 font-mono">
                    {Math.round(alert.confidence * 100)}%
                  </span>
                  <span className="text-xs text-gray-600">
                    {timeAgo(alert.timestamp)}
                  </span>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      {panel && (
        <EntityPanel
          exporter={panel.exporter}
          importer={panel.importer}
          commodity={panel.commodity}
          value={panel.value}
          onClose={() => setPanel(null)}
        />
      )}
    </div>
  );
}
