'use client';

import { useState, useEffect } from 'react';
import { processLNGSignalBatch, EnrichedLNGSignal } from '@/lib/lng/cosmicLng';
import type { LNGSignal } from '@/lib/lng/signals';

// 8 hardcoded high-confidence demo signals — realistic LNGC fleet
const DEMO_SIGNALS: LNGSignal[] = [
  {
    type: 'destination_prediction',
    vessel: 'MARAN GAS AMPHIPOLIS',
    imo: '9737007',
    origin_terminal: 'Sabine Pass LNG',
    predicted_destination: 'Futtsu',
    predicted_country: 'Japan',
    confidence: 0.87,
    reasoning: 'Heading 265° at 16.2kn — matches historical pattern to Futtsu, consistent cruising speed',
    status: 'high_confidence',
    timestamp: new Date(Date.now() - 1800000).toISOString(),
  },
  {
    type: 'reroute',
    vessel: 'ARCTIC VOYAGER',
    imo: '9256534',
    origin_terminal: 'Corpus Christi LNG',
    original_destination: 'Incheon',
    new_likely_destination: 'Pyeongtaek',
    deviation_hours: 22,
    confidence: 0.78,
    anomaly_note: 'Heading shifted 24° with 4.1kn speed change — probable reroute from Incheon to Pyeongtaek',
    timestamp: new Date(Date.now() - 3600000).toISOString(),
  },
  {
    type: 'delay',
    vessel: 'FLEX ENDEAVOUR',
    imo: '9682104',
    origin_terminal: 'Freeport LNG',
    expected_arrival: new Date(Date.now() + 5 * 86400000).toISOString(),
    revised_arrival: new Date(Date.now() + 5 * 86400000 + 18 * 3600000).toISOString(),
    delay_hours: 18,
    confidence: 0.74,
    cause_inference: 'Speed reduction of 4.5kn detected — destination port congestion factor: 62%',
    timestamp: new Date(Date.now() - 7200000).toISOString(),
  },
  {
    type: 'destination_prediction',
    vessel: 'ENERGY FRONTIER',
    imo: '9692748',
    origin_terminal: 'Cameron LNG',
    predicted_destination: 'Shanghai',
    predicted_country: 'China',
    confidence: 0.91,
    reasoning: 'Heading 242° at 17.8kn — matches historical pattern to Shanghai, consistent cruising speed',
    status: 'high_confidence',
    timestamp: new Date(Date.now() - 900000).toISOString(),
  },
  {
    type: 'reroute',
    vessel: 'CHEIKH AHMADOU BAMBA',
    imo: '9707292',
    origin_terminal: 'Sabine Pass LNG',
    original_destination: 'Guangzhou',
    new_likely_destination: 'Tianjin',
    deviation_hours: 31,
    confidence: 0.82,
    anomaly_note: 'Heading shifted 32° with 5.3kn speed change — probable reroute from Guangzhou to Tianjin',
    timestamp: new Date(Date.now() - 5400000).toISOString(),
  },
  {
    type: 'destination_prediction',
    vessel: 'GASLOG SAVANNAH',
    imo: '9617763',
    origin_terminal: 'Corpus Christi LNG',
    predicted_destination: 'Yung An',
    predicted_country: 'Taiwan',
    confidence: 0.84,
    reasoning: 'Heading 248° at 15.4kn — matches historical pattern to Yung An, consistent cruising speed',
    status: 'high_confidence',
    timestamp: new Date(Date.now() - 2400000).toISOString(),
  },
  {
    type: 'delay',
    vessel: 'CREOLE SPIRIT',
    imo: '9694127',
    origin_terminal: 'Freeport LNG',
    expected_arrival: new Date(Date.now() + 8 * 86400000).toISOString(),
    revised_arrival: new Date(Date.now() + 8 * 86400000 + 26 * 3600000).toISOString(),
    delay_hours: 26,
    confidence: 0.79,
    cause_inference: 'Speed reduction of 5.8kn detected — destination port congestion factor: 71% — significant ETA revision, possible weather or scheduling delay',
    timestamp: new Date(Date.now() - 4200000).toISOString(),
  },
  {
    type: 'destination_prediction',
    vessel: 'ELISA LARUS',
    imo: '9658928',
    origin_terminal: 'Cameron LNG',
    predicted_destination: 'Sodegaura',
    predicted_country: 'Japan',
    confidence: 0.88,
    reasoning: 'Heading 258° at 16.9kn — matches historical pattern to Sodegaura, consistent cruising speed',
    status: 'high_confidence',
    timestamp: new Date(Date.now() - 600000).toISOString(),
  },
];

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
        <span
          className="w-10 text-center text-xs font-bold font-mono shrink-0"
          style={{ color: impactColor(enriched.impact_score) }}
        >
          [{enriched.impact_score}]
        </span>
        <span
          className="w-12 text-center text-[10px] font-mono shrink-0"
          style={{ color: confColor(confPct) }}
        >
          [{confPct}%]
        </span>
        <span className="flex-1 text-xs font-mono text-[#e0e6ed] truncate">
          <span className="font-semibold">{s.vessel}</span>
          <span className="text-[#4C6A92]"> → </span>
          <span className="text-[#C6A86B]">{eventLabel(s)}</span>
          <span className="text-[#4C6A92]"> → </span>
          <span className="text-[#8a9bb0]">{destinationLabel(s)}</span>
        </span>
        <span className="text-[9px] font-mono text-[#6b7a8d] shrink-0 hidden sm:block">
          F:{enriched.freshness_score}%
        </span>
      </div>
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

export default function LNGDemoPage() {
  const [active, setActive] = useState<EnrichedLNGSignal[]>([]);
  const [suppressedCount, setSuppressedCount] = useState(0);

  useEffect(() => {
    const result = processLNGSignalBatch(DEMO_SIGNALS);
    setActive(result.active);
    setSuppressedCount(result.suppressed.length);
  }, []);

  return (
    <div className="h-[calc(100vh-6rem)] flex flex-col overflow-hidden">
      {/* Demo banner */}
      <div className="px-4 py-2 bg-[#C6A86B]/10 border-b border-[#C6A86B]/30 shrink-0">
        <p className="text-[11px] font-mono text-[#C6A86B] text-center">
          DEMO MODE — Pre-loaded signals. Connect live data feed for real-time intelligence.
        </p>
      </div>

      {/* Header */}
      <div className="px-4 py-3 border-b border-[#1e2535] shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-sm font-thin tracking-[0.2em] text-[#C6A86B]" style={{ fontFamily: 'Sora, Manrope' }}>
              LNG INTELLIGENCE MODE
            </h1>
            <span className="text-[9px] px-2 py-0.5 bg-[#C6A86B]/20 text-[#C6A86B] border border-[#C6A86B]/30 font-mono">DEMO</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-[10px] text-[#6b7a8d] font-mono hidden sm:block">US GULF → ASIA-PACIFIC</span>
            <a
              href="/lng"
              className="text-[10px] font-mono text-[#4C6A92] hover:text-[#C6A86B] transition-colors"
            >
              ← LIVE FEED
            </a>
          </div>
        </div>
        <div className="flex items-center gap-3 mt-2">
          <span className="text-[10px] font-mono text-[#8a9bb0] bg-[#121722] px-2 py-0.5 border border-[#1e2535]">
            {active.length} active signals
          </span>
          <span className="text-[10px] font-mono text-[#6b7a8d] bg-[#121722] px-2 py-0.5 border border-[#1e2535]">
            {suppressedCount} suppressed (below threshold)
          </span>
        </div>
      </div>

      {/* Signal feed */}
      {active.length === 0 ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="w-6 h-6 border-2 border-[#4C6A92]/30 border-t-[#4C6A92] rounded-full animate-spin" />
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
        <span className="text-[9px] font-mono text-[#6b7a8d]">8 pre-loaded signals</span>
      </div>
    </div>
  );
}
