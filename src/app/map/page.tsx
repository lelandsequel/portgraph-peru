'use client';

import { useState, useEffect, useMemo } from 'react';
import { ConfidenceBadge } from '@/components/ProvenancePanel';
import { ConfidenceTier, PERU_PORTS, GLOBAL_PORTS } from '@/lib/db/types';

// Country coordinates for route map
const COUNTRY_COORDS: Record<string, { lat: number; lng: number }> = {
  CHINA: { lat: 35.86, lng: 104.19 },
  JAPAN: { lat: 36.20, lng: 138.25 },
  KOREA: { lat: 35.91, lng: 127.77 },
  INDIA: { lat: 20.59, lng: 78.96 },
  GERMANY: { lat: 51.16, lng: 10.45 },
  SPAIN: { lat: 40.46, lng: -3.75 },
  USA: { lat: 37.09, lng: -95.71 },
  'UNITED STATES': { lat: 37.09, lng: -95.71 },
  MEXICO: { lat: 23.63, lng: -102.55 },
  ITALY: { lat: 41.87, lng: 12.57 },
  BULGARIA: { lat: 42.73, lng: 25.49 },
  ECUADOR: { lat: -1.83, lng: -78.18 },
  TURKEY: { lat: 38.96, lng: 35.24 },
  VIETNAM: { lat: 14.06, lng: 108.28 },
  MALAYSIA: { lat: 4.21, lng: 101.98 },
  SINGAPORE: { lat: 1.35, lng: 103.82 },
  POLAND: { lat: 51.92, lng: 19.15 },
  'UNITED KINGDOM': { lat: 55.38, lng: -3.44 },
  HONGKONG: { lat: 22.32, lng: 114.17 },
  'HONG KONG': { lat: 22.32, lng: 114.17 },
  BRAZIL: { lat: -14.24, lng: -51.93 },
  CHILE: { lat: -35.68, lng: -71.54 },
  AUSTRALIA: { lat: -25.27, lng: 133.78 },
  INDONESIA: { lat: -0.79, lng: 113.92 },
  'SOUTH AFRICA': { lat: -30.56, lng: 22.94 },
  DRC: { lat: -4.04, lng: 21.76 },
  'DEMOCRATIC REPUBLIC OF THE CONGO': { lat: -4.04, lng: 21.76 },
  RUSSIA: { lat: 61.52, lng: 105.32 },
  UKRAINE: { lat: 48.38, lng: 31.17 },
  KAZAKHSTAN: { lat: 48.02, lng: 66.92 },
  GUINEA: { lat: 9.95, lng: -9.70 },
  COLOMBIA: { lat: 4.57, lng: -74.30 },
  'NEW CALEDONIA': { lat: -20.90, lng: 165.62 },
  MOZAMBIQUE: { lat: -18.67, lng: 35.53 },
  ZAMBIA: { lat: -13.13, lng: 27.85 },
  ARGENTINA: { lat: -38.42, lng: -63.62 },
  NIGERIA: { lat: 9.08, lng: 8.68 },
  ANGOLA: { lat: -11.20, lng: 17.87 },
  QATAR: { lat: 25.35, lng: 51.18 },
  MYANMAR: { lat: 21.92, lng: 95.96 },
  PHILIPPINES: { lat: 12.88, lng: 121.77 },
  CANADA: { lat: 56.13, lng: -106.35 },
  NETHERLANDS: { lat: 52.13, lng: 5.29 },
  BELGIUM: { lat: 50.50, lng: 4.47 },
  FINLAND: { lat: 61.92, lng: 25.75 },
  SWEDEN: { lat: 60.13, lng: 18.64 },
  TAIWAN: { lat: 23.70, lng: 120.96 },
  THAILAND: { lat: 15.87, lng: 100.99 },
  PERU: { lat: -9.19, lng: -75.02 },
  ROTTERDAM: { lat: 51.92, lng: 4.48 },
  QINGDAO: { lat: 36.07, lng: 120.38 },
  BUSAN: { lat: 35.18, lng: 129.08 },
};

interface RouteData {
  origin: string;
  destination: string;
  shipment_count: number;
  total_weight_kg: number;
  commodities: string[];
  confidence_tier: ConfidenceTier;
  port: string;
}

function formatWeight(kg: number): string {
  const tonnes = kg / 1000;
  if (tonnes >= 1e9) return `${(tonnes / 1e9).toFixed(1)}B t`;
  if (tonnes >= 1e6) return `${(tonnes / 1e6).toFixed(1)}M t`;
  if (tonnes >= 1e3) return `${(tonnes / 1e3).toFixed(1)}K t`;
  return `${tonnes.toFixed(1)}t`;
}

function routeLabel(route: RouteData) {
  const port = route.port === 'GLOBAL' ? 'Aggregate' : (GLOBAL_PORTS[route.port]?.name || route.port);
  return `${route.origin || port} → ${route.destination}`;
}

export default function RouteMapPage() {
  const [routes, setRoutes] = useState<RouteData[]>([]);
  const [loading, setLoading] = useState(true);
  const [commodityFilter, setCommodityFilter] = useState<string>('all');
  const [regionFilter, setRegionFilter] = useState<string>('all');

  useEffect(() => {
    async function loadRoutes() {
      setLoading(true);
      try {
        const res = await fetch('/api/routes');
        if (res.ok) {
          const data = await res.json();
          setRoutes(data.routes || []);
        }
      } catch (err) {
        console.error('Failed to load routes:', err);
      } finally {
        setLoading(false);
      }
    }
    loadRoutes();
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

  // SVG-based simple route map
  const svgWidth = 900;
  const svgHeight = 500;

  function projectLng(lng: number): number {
    return ((lng + 180) / 360) * svgWidth;
  }

  function projectLat(lat: number): number {
    return ((90 - lat) / 180) * svgHeight;
  }

  const maxShipments = Math.max(...filteredRoutes.map(r => r.shipment_count), 1);
  const topRoute = filteredRoutes[0];
  const totalShipments = filteredRoutes.reduce((sum, r) => sum + r.shipment_count, 0);
  const portCallRows = filteredRoutes.filter(r => r.port !== 'GLOBAL').reduce((sum, r) => sum + r.shipment_count, 0);
  const aggregateLanes = filteredRoutes.filter(r => r.port === 'GLOBAL').length;
  const highConfidence = filteredRoutes.filter(r => r.confidence_tier === 'HIGH').length;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-thin tracking-wide text-[#C6A86B]" style={{ fontFamily: 'Sora, Manrope' }}>Route Map</h1>
          <p className="text-[#6b7a8d] text-sm">Observed commodity corridors. Port calls and aggregate lanes are labeled separately.</p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={commodityFilter}
            onChange={e => setCommodityFilter(e.target.value)}
            className="bg-[#121722] border border-[#1e2535] px-3 py-2 text-xs text-[#8a9bb0] focus:outline-none focus:border-[#4C6A92] min-h-[40px]"
          >
            <option value="all">All Commodities</option>
            {allCommodities.map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
          <select
            value={regionFilter}
            onChange={e => setRegionFilter(e.target.value)}
            className="bg-[#121722] border border-[#1e2535] px-3 py-2 text-xs text-[#8a9bb0] focus:outline-none focus:border-[#4C6A92] min-h-[40px]"
          >
            <option value="all">All Regions</option>
            <option value="South America">Americas</option>
            <option value="Asia-Pacific">Asia-Pacific</option>
            <option value="Africa">Africa</option>
            <option value="Oceania">Oceania</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <svg className="animate-spin h-8 w-8 text-blue-500" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-px bg-[#1e2535] mb-6">
            <PulseMetric label="Routes" value={filteredRoutes.length.toLocaleString()} />
            <PulseMetric label="Shipments" value={totalShipments.toLocaleString()} />
            <PulseMetric label="Port-Call Rows" value={portCallRows.toLocaleString()} />
            <PulseMetric label="Aggregate Lanes" value={aggregateLanes.toLocaleString()} />
            <PulseMetric label="High Confidence" value={highConfidence.toLocaleString()} />
          </div>

          {topRoute && (
            <div className="bg-[#121722] border border-[#1e2535] p-4 mb-6">
              <p className="text-[9px] text-[#4C6A92] uppercase tracking-[0.15em] font-semibold mb-2" style={{ fontFamily: 'Manrope' }}>
                Dominant Observed Lane
              </p>
              <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
                <div>
                  <p className="text-lg text-[#e0e6ed]" style={{ fontFamily: 'Manrope' }}>{routeLabel(topRoute)}</p>
                  <p className="text-xs text-[#6b7a8d] mt-1">
                    {topRoute.commodities.slice(0, 4).join(' · ')}
                  </p>
                </div>
                <div className="flex gap-px bg-[#1e2535] shrink-0">
                  <SmallPulse label="Flows" value={String(topRoute.shipment_count)} />
                  <SmallPulse label="Volume" value={formatWeight(topRoute.total_weight_kg)} />
                  <SmallPulse label="Tier" value={topRoute.confidence_tier} />
                </div>
              </div>
            </div>
          )}

          {/* SVG Map */}
          <div className="bg-[#121722] border border-[#1e2535] p-4 mb-6 overflow-x-auto">
            <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} className="w-full h-auto min-w-[600px]">
              {/* Background */}
              <rect width={svgWidth} height={svgHeight} fill="#0a0a0f" rx="8" />

              {/* Grid lines */}
              {[0, 1, 2, 3, 4].map(i => (
                <line key={`h${i}`} x1={0} y1={i * (svgHeight / 4)} x2={svgWidth} y2={i * (svgHeight / 4)} stroke="#1a1a2e" strokeWidth="0.5" />
              ))}
              {[0, 1, 2, 3, 4, 5, 6].map(i => (
                <line key={`v${i}`} x1={i * (svgWidth / 6)} y1={0} x2={i * (svgWidth / 6)} y2={svgHeight} stroke="#1a1a2e" strokeWidth="0.5" />
              ))}

              {/* Route lines */}
              {filteredRoutes.map((route, i) => {
                const destCoords = COUNTRY_COORDS[route.destination.toUpperCase()] || COUNTRY_COORDS[route.destination];
                if (!destCoords) return null;

                const originCoords = route.port === 'GLOBAL'
                  ? (COUNTRY_COORDS[route.origin?.toUpperCase()] || COUNTRY_COORDS[route.origin] || PERU_PORTS.PECLL)
                  : (GLOBAL_PORTS[route.port] || PERU_PORTS.PECLL);
                const x1 = projectLng(originCoords.lng);
                const y1 = projectLat(originCoords.lat);
                const x2 = projectLng(destCoords.lng);
                const y2 = projectLat(destCoords.lat);
                const thickness = Math.max(1, (route.shipment_count / maxShipments) * 4);
                const opacity = 0.3 + (route.shipment_count / maxShipments) * 0.5;

                // Curve control point
                const cx = (x1 + x2) / 2;
                const cy = Math.min(y1, y2) - 30;

                return (
                  <g key={i}>
                    <path
                      d={`M ${x1} ${y1} Q ${cx} ${cy} ${x2} ${y2}`}
                      fill="none"
                      stroke={route.commodities.some(c => c.toLowerCase().includes('copper')) ? '#3b82f6' : route.commodities.some(c => c.toLowerCase().includes('zinc')) ? '#8b5cf6' : '#f59e0b'}
                      strokeWidth={thickness}
                      opacity={opacity}
                    />
                  </g>
                );
              })}

              {/* Global port dots */}
              {Object.entries(GLOBAL_PORTS)
                .filter(([, info]) => regionFilter === 'all' || info.region === regionFilter)
                .map(([code, info]) => (
                <g key={code}>
                  <circle
                    cx={projectLng(info.lng)}
                    cy={projectLat(info.lat)}
                    r={5}
                    fill={info.country === 'Peru' ? '#3b82f6' : '#f59e0b'}
                    stroke={info.country === 'Peru' ? '#60a5fa' : '#fbbf24'}
                    strokeWidth={1.5}
                  />
                  <text
                    x={projectLng(info.lng) + 8}
                    y={projectLat(info.lat) + 4}
                    fill={info.country === 'Peru' ? '#93c5fd' : '#fde68a'}
                    fontSize="9"
                    fontFamily="monospace"
                  >
                    {info.name}
                  </text>
                </g>
              ))}

              {/* Aggregate origin dots */}
              {filteredRoutes
                .filter(route => route.port === 'GLOBAL')
                .map((route, i) => {
                  const coords = COUNTRY_COORDS[route.origin?.toUpperCase()] || COUNTRY_COORDS[route.origin];
                  if (!coords) return null;
                  return (
                    <g key={`origin-${route.origin}-${i}`}>
                      <circle
                        cx={projectLng(coords.lng)}
                        cy={projectLat(coords.lat)}
                        r={4}
                        fill="#C6A86B"
                        opacity={0.85}
                      />
                      <text
                        x={projectLng(coords.lng) + 7}
                        y={projectLat(coords.lat) + 3}
                        fill="#C6A86B"
                        fontSize="9"
                        fontFamily="monospace"
                      >
                        {route.origin}
                      </text>
                    </g>
                  );
                })}

              {/* Destination dots */}
              {filteredRoutes.map((route, i) => {
                const coords = COUNTRY_COORDS[route.destination.toUpperCase()] || COUNTRY_COORDS[route.destination];
                if (!coords) return null;
                const size = 3 + (route.shipment_count / maxShipments) * 4;

                return (
                  <g key={`dest-${i}`}>
                    <circle
                      cx={projectLng(coords.lng)}
                      cy={projectLat(coords.lat)}
                      r={size}
                      fill="#10b981"
                      opacity={0.8}
                    />
                    <text
                      x={projectLng(coords.lng) + size + 3}
                      y={projectLat(coords.lat) + 3}
                      fill="#6ee7b7"
                      fontSize="9"
                      fontFamily="monospace"
                    >
                      {route.destination}
                    </text>
                  </g>
                );
              })}
            </svg>

            {/* Legend */}
            <div className="flex flex-wrap items-center gap-3 sm:gap-6 mt-3 text-xs text-[#6b7a8d]">
              <div className="flex items-center gap-1">
                <span className="w-3 h-1 bg-blue-500 rounded" />
                <span>Copper</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="w-3 h-1 bg-purple-500 rounded" />
                <span>Zinc</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="w-3 h-1 bg-amber-500 rounded" />
                <span>Other minerals</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="w-2 h-2 bg-blue-500 rounded-full" />
                <span>Peru port</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="w-2 h-2 bg-amber-500 rounded-full" />
                <span>Global port</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="w-2 h-2 bg-emerald-500 rounded-full" />
                <span>Destination</span>
              </div>
            </div>
          </div>

          {/* Route Table */}
          <div className="bg-[#121722] border border-[#1e2535] overflow-x-auto">
            <table className="w-full text-sm min-w-[640px]">
              <thead>
                <tr className="border-b border-[#1e2535]">
                  <th className="text-left px-4 py-3 text-[#6b7a8d] font-medium">Origin</th>
                  <th className="text-left px-4 py-3 text-[#6b7a8d] font-medium">Port</th>
                  <th className="text-left px-4 py-3 text-[#6b7a8d] font-medium">Destination</th>
                  <th className="text-left px-4 py-3 text-[#6b7a8d] font-medium">Shipments</th>
                  <th className="text-left px-4 py-3 text-[#6b7a8d] font-medium">Volume</th>
                  <th className="text-left px-4 py-3 text-[#6b7a8d] font-medium">Commodities</th>
                  <th className="text-left px-4 py-3 text-[#6b7a8d] font-medium">Confidence</th>
                </tr>
              </thead>
              <tbody>
                {filteredRoutes.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-[#6b7a8d]">
                      No routes match the active filters.
                    </td>
                  </tr>
                ) : (
                  filteredRoutes.map((route, i) => (
                    <tr key={i} className="border-b border-[#1e2535]/50 hover:bg-[#1a2030]">
                      <td className="px-4 py-3 text-[#e0e6ed] font-mono">
                        {route.origin || 'Unknown'}
                      </td>
                      <td className="px-4 py-3 text-[#4C6A92] font-mono">
                        {route.port === 'GLOBAL' ? 'Aggregate' : (GLOBAL_PORTS[route.port]?.name || route.port)}
                      </td>
                      <td className="px-4 py-3 text-emerald-400">{route.destination}</td>
                      <td className="px-4 py-3 text-[#8a9bb0] font-mono">{route.shipment_count}</td>
                      <td className="px-4 py-3 text-[#8a9bb0] font-mono">
                        {route.total_weight_kg > 0 ? formatWeight(route.total_weight_kg) : '-'}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1 flex-wrap">
                          {route.commodities.map((c, j) => (
                            <span key={j} className="text-xs bg-[#1a2030] text-[#8a9bb0] px-1.5 py-0.5">{c}</span>
                          ))}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <ConfidenceBadge tier={route.confidence_tier} />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

function PulseMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-[#121722] p-4">
      <p className="text-[9px] text-[#6b7a8d] uppercase tracking-wider mb-1" style={{ fontFamily: 'Manrope' }}>{label}</p>
      <p className="text-xl font-semibold text-[#e0e6ed]" style={{ fontFamily: 'JetBrains Mono, monospace' }}>{value}</p>
    </div>
  );
}

function SmallPulse({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-[#0B0E13] px-3 py-2 min-w-20">
      <p className="text-[9px] text-[#6b7a8d] uppercase tracking-wider" style={{ fontFamily: 'Manrope' }}>{label}</p>
      <p className="text-xs text-[#C6A86B]" style={{ fontFamily: 'JetBrains Mono, monospace' }}>{value}</p>
    </div>
  );
}
