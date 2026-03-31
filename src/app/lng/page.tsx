'use client';

import { useState, useEffect, useCallback } from 'react';
import { processLNGSignalBatch, EnrichedLNGSignal } from '@/lib/lng/cosmicLng';
import {
  generateDestinationPrediction,
  generateRerouteDetection,
  generateDelayAnomaly,
  LNGSignal,
} from '@/lib/lng/signals';

// Simulated vessel fleet for live signal generation
const FLEET = [
  { vessel: 'MARAN GAS AMPHIPOLIS', imo: '9737007', origin: 'Sabine Pass LNG' },
  { vessel: 'ARCTIC VOYAGER', imo: '9256534', origin: 'Corpus Christi LNG' },
  { vessel: 'FLEX ENDEAVOUR', imo: '9682104', origin: 'Freeport LNG' },
  { vessel: 'ENERGY FRONTIER', imo: '9692748', origin: 'Cameron LNG' },
  { vessel: 'CHEIKH AHMADOU BAMBA', imo: '9707292', origin: 'Sabine Pass LNG' },
  { vessel: 'GASLOG SAVANNAH', imo: '9617763', origin: 'Corpus Christi LNG' },
  { vessel: 'CREOLE SPIRIT', imo: '9694127', origin: 'Freeport LNG' },
  { vessel: 'ELISA LARUS', imo: '9658928', origin: 'Cameron LNG' },
];

function generateLiveSignals(): LNGSignal[] {
  const signals: LNGSignal[] = [];
  for (const v of FLEET) {
    const roll = Math.random();
    if (roll < 0.5) {
      signals.push(
        generateDestinationPrediction({
          vessel: v.vessel,
          imo: v.imo,
          origin_terminal: v.origin,
          heading: 230 + Math.random() * 60,
          speed_knots: 12 + Math.random() * 7,
          historical_destination: ['Futtsu', 'Pyeongtaek', 'Shanghai', 'Yung An'][Math.floor(Math.random() * 4)],
        })
      );
    } else if (roll < 0.78) {
      signals.push(
        generateRerouteDetection({
          vessel: v.vessel,
          imo: v.imo,
          origin_terminal: v.origin,
          original_destination: ['Futtsu', 'Incheon', 'Guangzhou'][Math.floor(Math.random() * 3)],
          new_heading: 230 + Math.random() * 55,
          speed_change_knots: 2 + Math.random() * 5,
          heading_shift_degrees: 10 + Math.random() * 30,
        })
      );
    } else {
      signals.push(
        generateDelayAnomaly({
          vessel: v.vessel,
          imo: v.imo,
          origin_terminal: v.origin,
          expected_arrival: new Date(Date.now() + 7 * 86400000).toISOString(),
          speed_drop_knots: 2 + Math.random() * 6,
          congestion_factor: Math.random() * 0.8,
        })
      );
    }
  }
  return signals;
}

function impactColor(score: number): string {
  if (score >= 70) return '#C94040';
  if (score >= 40) return '#C6A86B';
  return '#6b7a8d';
}

function confColor(pct: number): string {
  if (pct >= 80) return '#22c55e';
  if (pct >= 65) return '#C6A86B';
  return '#ef4444';
}

function eventLabel(signal: LNGSignal): string {
  switch (signal.type) {
    case 'destination_prediction': return 'DESTINATION PREDICTED';
    case 'reroute': return 'REROUTE DETECTED';
    case 'delay': return 'DELAY ANOMALY';
  }
}

function destinationLabel(signal: LNGSignal): string {
  switch (signal.type) {
    case 'destination_prediction':
      return `${signal.predicted_destination.toUpperCase()}, ${signal.predicted_country.toUpperCase()}`;
    case 'reroute':
      return `${signal.new_likely_destination.toUpperCase()}`;
    case 'delay':
      return `+${signal.delay_hours}h ETA REVISION`;
  }
}

function SignalRow({ enriched }: { enriched: EnrichedLNGSignal }) {
  const s = enriched.signal;
  const confPct = Math.round(enriched.final_confidence * 100);

  return (
    <div className="border-b border-[#1e2535]/40 hover:bg-[#121722] transition-colors">
      <div className="flex items-center gap-2 px-3 py-2">
        {/* Impact */}
        <span
          className="w-10 text-center text-xs font-bold font-mono shrink-0"
          style={{ color: impactColor(enriched.impact_score) }}
        >
          [{enriched.impact_score}]
        </span>

        {/* Confidence */}
        <span
          className="w-12 text-center text-[10px] font-mono shrink-0"
          style={{ color: confColor(confPct) }}
        >
          [{confPct}%]
        </span>

        {/* Vessel → Event → Destination */}
        <span className="flex-1 text-xs font-mono text-[#e0e6ed] truncate">
          <span className="font-semibold">{s.vessel}</span>
          <span className="text-[#4C6A92]"> → </span>
          <span className="text-[#C6A86B]">{eventLabel(s)}</span>
          <span className="text-[#4C6A92]"> → </span>
          <span className="text-[#8a9bb0]">{destinationLabel(s)}</span>
        </span>

        {/* Freshness */}
        <span className="text-[9px] font-mono text-[#6b7a8d] shrink-0 hidden sm:block">
          F:{enriched.freshness_score}%
        </span>
      </div>

      {/* Confidence bar */}
      <div className="px-3">
        <div className="w-full h-[2px] bg-[#1a2030]">
          <div
            className="h-full transition-all"
            style={{ width: `${confPct}%`, backgroundColor: confColor(confPct) }}
          />
        </div>
      </div>
    </div>
  );
}

export default function LNGPage() {
  const [active, setActive] = useState<EnrichedLNGSignal[]>([]);
  const [suppressedCount, setSuppressedCount] = useState(0);
  const [lastUpdated, setLastUpdated] = useState('');
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(() => {
    const raw = generateLiveSignals();
    const result = processLNGSignalBatch(raw);
    setActive(result.active);
    setSuppressedCount(result.suppressed.length);
    setLastUpdated(new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    setLoading(false);
  }, []);

  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, 60000);
    return () => clearInterval(interval);
  }, [refresh]);

  return (
    <div className="h-[calc(100vh-6rem)] flex flex-col overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-[#1e2535] shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-sm font-thin tracking-[0.2em] text-[#C6A86B]" style={{ fontFamily: 'Sora, Manrope' }}>
              LNG INTELLIGENCE MODE
            </h1>
            <span className="text-[9px] px-2 py-0.5 bg-red-900/20 text-red-400 border border-red-900/30 animate-pulse font-mono">LIVE</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-[10px] text-[#6b7a8d] font-mono hidden sm:block">US GULF → ASIA-PACIFIC</span>
            {lastUpdated && (
              <span className="text-[9px] text-[#6b7a8d] font-mono">UPD {lastUpdated}</span>
            )}
          </div>
        </div>
        <div className="flex items-center justify-between mt-2">
          <div className="flex items-center gap-3">
            <span className="text-[10px] font-mono text-[#8a9bb0] bg-[#121722] px-2 py-0.5 border border-[#1e2535]">
              {active.length} active signals
            </span>
            <span className="text-[10px] font-mono text-[#6b7a8d] bg-[#121722] px-2 py-0.5 border border-[#1e2535]">
              {suppressedCount} suppressed (below threshold)
            </span>
          </div>
          <a
            href="/lng/demo"
            className="text-[10px] font-mono text-[#4C6A92] hover:text-[#C6A86B] transition-colors"
          >
            VIEW DEMO →
          </a>
        </div>
      </div>

      {/* Signal feed */}
      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="w-6 h-6 border-2 border-[#4C6A92]/30 border-t-[#4C6A92] rounded-full animate-spin" />
        </div>
      ) : active.length === 0 ? (
        <div className="flex-1 flex items-center justify-center text-[#6b7a8d] text-sm font-mono">
          MONITORING... NO ACTIVE SIGNALS ABOVE AURORA THRESHOLD
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto" style={{ scrollbarWidth: 'thin' }}>
          {active.map((enriched, i) => (
            <SignalRow key={`${enriched.signal.vessel}-${enriched.signal.type}-${i}`} enriched={enriched} />
          ))}
        </div>
      )}

      {/* AURORA footer */}
      <div className="px-4 py-2 border-t border-[#1e2535] shrink-0 flex items-center justify-between">
        <span className="text-[9px] font-mono text-[#4C6A92]">
          AURORA GATE: confidence ≥ 0.65 | COSMIC: METEOR → COMET → NEBULA → QUASAR
        </span>
        <span className="text-[9px] font-mono text-[#6b7a8d]">60s refresh</span>
      </div>
    </div>
  );
}
