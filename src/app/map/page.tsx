'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { GLOBAL_PORTS, COMMODITY_CONFIG } from '@/lib/db/types';
import { generateCosmicSignals, CosmicAlert, PreviousState } from '@/lib/signals/cosmicSignalEngine';

interface RouteData {
  destination: string;
  shipment_count: number;
  total_weight_kg: number;
  commodities: string[];
  confidence_tier: string;
  port: string;
}

interface FlowArcData {
  origin_country: string;
  origin_port?: string;
  destination_country: string;
  destination_port?: string;
  commodity: string;
  commodity_category?: string;
  annual_volume_mt?: number;
  annual_value_usd?: number;
}

// Commodity category to color
function getCommodityColor(commodities: string[], category?: string): string {
  if (category) {
    const cfg = COMMODITY_CONFIG[category];
    if (cfg) return cfg.color;
  }
  for (const c of commodities) {
    const lower = c.toLowerCase();
    if (lower.includes('copper')) return '#f59e0b';
    if (lower.includes('iron')) return '#ef4444';
    if (lower.includes('coal')) return '#6b7280';
    if (lower.includes('soy')) return '#22c55e';
    if (lower.includes('nickel')) return '#8b5cf6';
    if (lower.includes('cobalt')) return '#3b82f6';
    if (lower.includes('lithium')) return '#10b981';
    if (lower.includes('lng') || lower.includes('gas')) return '#06b6d4';
    if (lower.includes('wheat') || lower.includes('grain')) return '#eab308';
    if (lower.includes('rare')) return '#d946ef';
    if (lower.includes('uranium')) return '#facc15';
    if (lower.includes('oil') || lower.includes('crude')) return '#64748b';
    if (lower.includes('bauxite')) return '#dc2626';
  }
  return '#8a9bb0';
}

// Port coordinates from GLOBAL_PORTS for both origin and destination matching
function findPortCoords(name: string): { lat: number; lng: number } | null {
  // Try UNLOCODE match
  const port = GLOBAL_PORTS[name];
  if (port) return { lat: port.lat, lng: port.lng };

  // Try country name match
  const nameL = name.toLowerCase();
  for (const [, info] of Object.entries(GLOBAL_PORTS)) {
    if (info.country.toLowerCase() === nameL || info.name.toLowerCase() === nameL) {
      return { lat: info.lat, lng: info.lng };
    }
  }

  // Fallback country centroids
  const COUNTRY_CENTROIDS: Record<string, { lat: number; lng: number }> = {
    china: { lat: 35.86, lng: 104.19 }, japan: { lat: 36.20, lng: 138.25 },
    'south korea': { lat: 35.91, lng: 127.77 }, india: { lat: 20.59, lng: 78.96 },
    germany: { lat: 51.16, lng: 10.45 }, netherlands: { lat: 52.13, lng: 5.29 },
    usa: { lat: 37.09, lng: -95.71 }, brazil: { lat: -14.24, lng: -51.93 },
    peru: { lat: -9.19, lng: -75.02 }, chile: { lat: -35.68, lng: -71.54 },
    australia: { lat: -25.27, lng: 133.78 }, indonesia: { lat: -0.79, lng: 113.92 },
    'south africa': { lat: -30.56, lng: 22.94 }, canada: { lat: 56.13, lng: -106.35 },
    russia: { lat: 61.52, lng: 105.32 }, spain: { lat: 40.46, lng: -3.75 },
    taiwan: { lat: 23.70, lng: 120.96 }, turkey: { lat: 38.96, lng: 35.24 },
    philippines: { lat: 12.88, lng: 121.77 }, colombia: { lat: 4.57, lng: -74.30 },
    argentina: { lat: -38.42, lng: -63.62 }, nigeria: { lat: 9.08, lng: 8.68 },
    qatar: { lat: 25.35, lng: 51.18 }, ukraine: { lat: 48.38, lng: 31.17 },
    guinea: { lat: 9.95, lng: -9.70 }, drc: { lat: -4.04, lng: 21.76 },
    kazakhstan: { lat: 48.02, lng: 66.92 }, mozambique: { lat: -18.67, lng: 35.53 },
    myanmar: { lat: 21.91, lng: 95.96 }, angola: { lat: -11.20, lng: 17.87 },
    tanzania: { lat: -6.37, lng: 34.89 }, belgium: { lat: 50.50, lng: 4.47 },
    finland: { lat: 61.92, lng: 25.75 }, sweden: { lat: 60.13, lng: 18.64 },
    thailand: { lat: 15.87, lng: 100.99 },
  };
  return COUNTRY_CENTROIDS[nameL] || null;
}

export default function MapPage() {
  const [routes, setRoutes] = useState<RouteData[]>([]);
  const [, setFlowArcs] = useState<FlowArcData[]>([]);
  const [signals, setSignals] = useState<CosmicAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [commodityFilter, setCommodityFilter] = useState('all');
  const [regionFilter, setRegionFilter] = useState('all');
  const [hoveredPort, setHoveredPort] = useState<string | null>(null);
  const [selectedArc, setSelectedArc] = useState<number | null>(null);
  const prevStateRef = useRef<PreviousState>(new Map());

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const [routesRes, flowsRes, feedRes] = await Promise.all([
          fetch('/api/routes'),
          fetch('/api/flows'),
          fetch('/api/feed'),
        ]);
        if (routesRes.ok) {
          const data = await routesRes.json();
          setRoutes(data.routes || []);
        }
        if (flowsRes.ok) {
          const data = await flowsRes.json();
          setFlowArcs(data.arcs || data.flows || []);
        }
        if (feedRes.ok) {
          const feedData = await feedRes.json();
          const flows = feedData.flows || [];
          const { alerts, nextState } = generateCosmicSignals(flows, prevStateRef.current);
          prevStateRef.current = nextState;
          setSignals(alerts);
        }
      } catch (err) {
        console.error('Failed to load map data:', err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const filteredRoutes = routes.filter(r => {
    if (commodityFilter !== 'all' && !r.commodities.some(c => c.toLowerCase().includes(commodityFilter.toLowerCase()))) return false;
    if (regionFilter !== 'all') {
      const portInfo = GLOBAL_PORTS[r.port];
      if (portInfo && portInfo.region !== regionFilter) return false;
    }
    return true;
  });

  const allCommodities = useMemo(() => {
    const set = new Set<string>();
    routes.forEach(r => r.commodities.forEach(c => set.add(c)));
    return Array.from(set);
  }, [routes]);

  // SVG map projection
  const svgWidth = 960;
  const svgHeight = 520;

  function projectLng(lng: number): number {
    return ((lng + 180) / 360) * svgWidth;
  }
  function projectLat(lat: number): number {
    return ((90 - lat) / 180) * svgHeight;
  }

  const maxShipments = Math.max(...filteredRoutes.map(r => r.shipment_count), 1);

  // Aggregate port vessel counts
  const portVesselCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    routes.forEach(r => {
      counts[r.port] = (counts[r.port] || 0) + r.shipment_count;
    });
    return counts;
  }, [routes]);

  // Get signal for a given arc (rough match)
  function getArcSignal(route: RouteData): CosmicAlert | undefined {
    return signals.find(s =>
      route.commodities.some(c => s.commodity.toLowerCase().includes(c.toLowerCase().split(' ')[0]))
      && (s.destination_country.toLowerCase().includes(route.destination.toLowerCase())
        || route.destination.toLowerCase().includes(s.destination_country.toLowerCase()))
    );
  }

  return (
    <div className="h-[calc(100vh-6rem)] flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-[#1e2535] shrink-0">
        <div className="flex items-center gap-3">
          <h1 className="text-sm font-thin tracking-wide text-[#C6A86B]" style={{ fontFamily: 'Sora, Manrope' }}>
            COSMIC Flow Map
          </h1>
          <span className="text-[9px] text-[#6b7a8d] bg-[#121722] px-2 py-0.5 border border-[#1e2535] font-mono">
            {filteredRoutes.length} routes
          </span>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={commodityFilter}
            onChange={e => setCommodityFilter(e.target.value)}
            className="bg-[#0d1117] border border-[#1e2535] px-2 py-1 text-[10px] text-[#8a9bb0] font-mono"
          >
            <option value="all">All Commodities</option>
            {allCommodities.map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
          <select
            value={regionFilter}
            onChange={e => setRegionFilter(e.target.value)}
            className="bg-[#0d1117] border border-[#1e2535] px-2 py-1 text-[10px] text-[#8a9bb0] font-mono"
          >
            <option value="all">All Regions</option>
            <option value="South America">Americas</option>
            <option value="Asia-Pacific">Asia-Pacific</option>
            <option value="Africa">Africa</option>
            <option value="Oceania">Oceania</option>
            <option value="Europe/FSU">Europe/FSU</option>
            <option value="Middle East">Middle East</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="w-6 h-6 border-2 border-[#4C6A92]/30 border-t-[#4C6A92] rounded-full animate-spin" />
        </div>
      ) : (
        <div className="flex-1 flex min-h-0">
          {/* Map area */}
          <div className="flex-1 overflow-auto bg-[#080b10]">
            <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} className="w-full h-full min-w-[700px]">
              {/* Background */}
              <rect width={svgWidth} height={svgHeight} fill="#080b10" />

              {/* Grid lines */}
              {Array.from({ length: 7 }, (_, i) => (
                <line key={`h${i}`} x1={0} y1={i * (svgHeight / 6)} x2={svgWidth} y2={i * (svgHeight / 6)} stroke="#111827" strokeWidth="0.3" />
              ))}
              {Array.from({ length: 9 }, (_, i) => (
                <line key={`v${i}`} x1={i * (svgWidth / 8)} y1={0} x2={i * (svgWidth / 8)} y2={svgHeight} stroke="#111827" strokeWidth="0.3" />
              ))}

              {/* Flow arcs — curved lines */}
              {filteredRoutes.map((route, i) => {
                const destCoords = findPortCoords(route.destination);
                if (!destCoords) return null;

                const portInfo = GLOBAL_PORTS[route.port];
                if (!portInfo) return null;

                const x1 = projectLng(portInfo.lng);
                const y1 = projectLat(portInfo.lat);
                const x2 = projectLng(destCoords.lng);
                const y2 = projectLat(destCoords.lat);
                const thickness = Math.max(0.8, (route.shipment_count / maxShipments) * 4);
                const opacity = 0.25 + (route.shipment_count / maxShipments) * 0.5;
                const color = getCommodityColor(route.commodities);

                // Arc curvature
                const dx = x2 - x1;
                const dy = y2 - y1;
                const dist = Math.sqrt(dx * dx + dy * dy);
                const cx = (x1 + x2) / 2 - dy * 0.15;
                const cy = (y1 + y2) / 2 + dx * 0.05 - Math.min(dist * 0.08, 40);

                const isSelected = selectedArc === i;

                return (
                  <g key={i} onClick={() => setSelectedArc(isSelected ? null : i)} className="cursor-pointer">
                    <path
                      d={`M ${x1} ${y1} Q ${cx} ${cy} ${x2} ${y2}`}
                      fill="none"
                      stroke={color}
                      strokeWidth={isSelected ? thickness + 1.5 : thickness}
                      opacity={isSelected ? 0.95 : opacity}
                      strokeLinecap="round"
                    />
                    {/* Animated dot along path */}
                    {isSelected && (
                      <circle r="3" fill={color}>
                        <animateMotion dur="3s" repeatCount="indefinite" path={`M ${x1} ${y1} Q ${cx} ${cy} ${x2} ${y2}`} />
                      </circle>
                    )}
                  </g>
                );
              })}

              {/* Port markers */}
              {Object.entries(GLOBAL_PORTS)
                .filter(([, info]) => regionFilter === 'all' || info.region === regionFilter)
                .map(([code, info]) => {
                  const x = projectLng(info.lng);
                  const y = projectLat(info.lat);
                  const vesselCount = portVesselCounts[code] || 0;
                  const isHovered = hoveredPort === code;

                  return (
                    <g
                      key={code}
                      onMouseEnter={() => setHoveredPort(code)}
                      onMouseLeave={() => setHoveredPort(null)}
                      className="cursor-pointer"
                    >
                      <circle
                        cx={x} cy={y}
                        r={isHovered ? 6 : 4}
                        fill={info.region === 'South America' ? '#3b82f6' : '#f59e0b'}
                        stroke={isHovered ? '#fff' : 'rgba(255,255,255,0.2)'}
                        strokeWidth={isHovered ? 1.5 : 0.5}
                      />
                      {/* Vessel count badge */}
                      {vesselCount > 0 && (
                        <>
                          <circle cx={x + 7} cy={y - 7} r={6} fill="#121722" stroke="#1e2535" strokeWidth={0.5} />
                          <text x={x + 7} y={y - 4} fill="#e0e6ed" fontSize="6" fontFamily="monospace" textAnchor="middle">
                            {vesselCount}
                          </text>
                        </>
                      )}
                      {/* Port label on hover */}
                      {isHovered && (
                        <g>
                          <rect x={x + 10} y={y - 24} width={Math.max(info.name.length * 5.5 + 20, 80)} height={32} rx={2} fill="#121722" stroke="#1e2535" strokeWidth={0.5} />
                          <text x={x + 14} y={y - 12} fill="#e0e6ed" fontSize="8" fontFamily="monospace">{info.name}</text>
                          <text x={x + 14} y={y - 2} fill="#6b7a8d" fontSize="6" fontFamily="monospace">
                            {info.commodities.slice(0, 3).join(', ')} | {vesselCount} ships
                          </text>
                        </g>
                      )}
                      {/* Small label always visible */}
                      {!isHovered && vesselCount > 2 && (
                        <text x={x + 8} y={y + 3} fill="#6b7a8d" fontSize="6" fontFamily="monospace" opacity={0.6}>
                          {info.name}
                        </text>
                      )}
                    </g>
                  );
                })}
            </svg>
          </div>

          {/* Right sidebar — Signal card on arc click */}
          <div className="w-56 lg:w-64 shrink-0 border-l border-[#1e2535] overflow-y-auto hidden md:block bg-[#0B0E13]" style={{ scrollbarWidth: 'none' }}>
            {selectedArc !== null && filteredRoutes[selectedArc] ? (() => {
              const route = filteredRoutes[selectedArc];
              const signal = getArcSignal(route);
              const portInfo = GLOBAL_PORTS[route.port];
              return (
                <div className="p-3 space-y-3">
                  <div>
                    <p className="text-[9px] text-[#4C6A92] uppercase tracking-wider font-semibold mb-1">Route Detail</p>
                    <p className="text-xs text-[#e0e6ed] font-mono">{portInfo?.name || route.port} → {route.destination}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-px bg-[#1e2535]">
                    <div className="bg-[#121722] p-2">
                      <p className="text-[8px] text-[#6b7a8d] uppercase">Shipments</p>
                      <p className="text-sm text-[#e0e6ed] font-mono">{route.shipment_count}</p>
                    </div>
                    <div className="bg-[#121722] p-2">
                      <p className="text-[8px] text-[#6b7a8d] uppercase">Volume</p>
                      <p className="text-sm text-[#e0e6ed] font-mono">
                        {route.total_weight_kg > 0 ? `${(route.total_weight_kg / 1000).toFixed(0)}t` : '-'}
                      </p>
                    </div>
                  </div>
                  <div>
                    <p className="text-[8px] text-[#6b7a8d] uppercase mb-1">Commodities</p>
                    <div className="flex flex-wrap gap-1">
                      {route.commodities.map((c, j) => (
                        <span key={j} className="text-[9px] px-1.5 py-0.5 bg-[#1a2030] border border-[#1e2535]" style={{ color: getCommodityColor([c]) }}>
                          {c}
                        </span>
                      ))}
                    </div>
                  </div>
                  {signal && (
                    <div className="border-t border-[#1e2535] pt-2 space-y-2">
                      <p className="text-[9px] text-[#4C6A92] uppercase tracking-wider font-semibold">COSMIC Signal</p>
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold font-mono" style={{
                          color: signal.impact_category === 'critical' ? '#ef4444' : signal.impact_category === 'notable' ? '#eab308' : '#22c55e'
                        }}>
                          Impact: {signal.impact_score}
                        </span>
                        <span className="text-[10px] text-[#8a9bb0] font-mono">{Math.round(signal.confidence * 100)}%</span>
                      </div>
                      <div className="w-full h-[3px] bg-[#1a2030]">
                        <div className="h-full" style={{
                          width: `${signal.confidence * 100}%`,
                          backgroundColor: signal.confidence >= 0.8 ? '#22c55e' : signal.confidence >= 0.55 ? '#eab308' : '#ef4444',
                        }} />
                      </div>
                      <p className="text-[10px] text-[#e0e6ed]" style={{ fontFamily: 'Manrope' }}>{signal.title}</p>
                      <p className="text-[9px] text-[#8a9bb0] leading-relaxed">{signal.economic_implication}</p>
                      <div className="flex items-center gap-2">
                        <span className="text-[8px] font-mono" style={{
                          color: signal.route_status === 'confirmed' ? '#22c55e' : signal.route_status === 'partial' ? '#eab308' : '#ef4444'
                        }}>
                          {signal.route_status.toUpperCase()}
                        </span>
                        <span className="text-[8px] text-[#6b7a8d] font-mono">{signal.action_bias.split(' ')[0]}</span>
                      </div>
                    </div>
                  )}
                </div>
              );
            })() : (
              <div className="p-3">
                <p className="text-[9px] text-[#4C6A92] uppercase tracking-wider font-semibold mb-3">Legend</p>
                <div className="space-y-2 text-[9px]">
                  {[
                    { color: '#f59e0b', label: 'Copper' },
                    { color: '#ef4444', label: 'Iron Ore' },
                    { color: '#6b7280', label: 'Coal' },
                    { color: '#22c55e', label: 'Soy / Agriculture' },
                    { color: '#8b5cf6', label: 'Nickel' },
                    { color: '#3b82f6', label: 'Cobalt' },
                    { color: '#10b981', label: 'Lithium' },
                    { color: '#06b6d4', label: 'LNG' },
                    { color: '#d946ef', label: 'Rare Earths' },
                    { color: '#eab308', label: 'Wheat / Grain' },
                    { color: '#facc15', label: 'Uranium' },
                  ].map(item => (
                    <div key={item.label} className="flex items-center gap-2">
                      <span className="w-4 h-[2px] shrink-0" style={{ backgroundColor: item.color }} />
                      <span className="text-[#8a9bb0]">{item.label}</span>
                    </div>
                  ))}
                  <div className="border-t border-[#1e2535] pt-2 mt-2 space-y-1.5">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 bg-blue-500 rounded-full shrink-0" />
                      <span className="text-[#8a9bb0]">Americas port</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 bg-amber-500 rounded-full shrink-0" />
                      <span className="text-[#8a9bb0]">Global port</span>
                    </div>
                  </div>
                  <p className="text-[#6b7a8d] mt-3">Click a route arc to see COSMIC signal details.</p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
