'use client';

import { useState, useEffect, useMemo } from 'react';
import { ConfidenceBadge } from '@/components/ProvenancePanel';
import { ConfidenceTier, PERU_PORTS } from '@/lib/db/types';

// Country coordinates for route map
const COUNTRY_COORDS: Record<string, { lat: number; lng: number }> = {
  CHINA: { lat: 35.86, lng: 104.19 },
  JAPAN: { lat: 36.20, lng: 138.25 },
  KOREA: { lat: 35.91, lng: 127.77 },
  INDIA: { lat: 20.59, lng: 78.96 },
  GERMANY: { lat: 51.16, lng: 10.45 },
  SPAIN: { lat: 40.46, lng: -3.75 },
  USA: { lat: 37.09, lng: -95.71 },
  BRAZIL: { lat: -14.24, lng: -51.93 },
  CHILE: { lat: -35.68, lng: -71.54 },
  CANADA: { lat: 56.13, lng: -106.35 },
  NETHERLANDS: { lat: 52.13, lng: 5.29 },
  BELGIUM: { lat: 50.50, lng: 4.47 },
  FINLAND: { lat: 61.92, lng: 25.75 },
  SWEDEN: { lat: 60.13, lng: 18.64 },
  PHILIPPINES: { lat: 12.88, lng: 121.77 },
  TAIWAN: { lat: 23.70, lng: 120.96 },
  THAILAND: { lat: 15.87, lng: 100.99 },
  PERU: { lat: -9.19, lng: -75.02 },
  ROTTERDAM: { lat: 51.92, lng: 4.48 },
  QINGDAO: { lat: 36.07, lng: 120.38 },
  BUSAN: { lat: 35.18, lng: 129.08 },
};

interface RouteData {
  destination: string;
  shipment_count: number;
  total_weight_kg: number;
  commodities: string[];
  confidence_tier: ConfidenceTier;
  port: string;
}

export default function RouteMapPage() {
  const [routes, setRoutes] = useState<RouteData[]>([]);
  const [loading, setLoading] = useState(true);
  const [commodityFilter, setCommodityFilter] = useState<string>('all');

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

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-white">Route Map</h1>
          <p className="text-gray-400 text-sm">Peru ports to destination countries — sized by volume</p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={commodityFilter}
            onChange={e => setCommodityFilter(e.target.value)}
            className="bg-gray-900 border border-gray-700 rounded-md px-3 py-1.5 text-sm text-gray-300"
          >
            <option value="all">All Commodities</option>
            {allCommodities.map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
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
          {/* SVG Map */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 mb-6 overflow-x-auto">
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

                const portInfo = route.port === 'PECLL' ? PERU_PORTS.PECLL : PERU_PORTS.PEMRI;
                const x1 = projectLng(portInfo.lng);
                const y1 = projectLat(portInfo.lat);
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

              {/* Peru port dots */}
              {Object.entries(PERU_PORTS).map(([code, info]) => (
                <g key={code}>
                  <circle
                    cx={projectLng(info.lng)}
                    cy={projectLat(info.lat)}
                    r={6}
                    fill="#3b82f6"
                    stroke="#60a5fa"
                    strokeWidth={2}
                  />
                  <text
                    x={projectLng(info.lng) + 10}
                    y={projectLat(info.lat) + 4}
                    fill="#93c5fd"
                    fontSize="10"
                    fontFamily="monospace"
                  >
                    {info.name}
                  </text>
                </g>
              ))}

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
            <div className="flex flex-wrap items-center gap-3 sm:gap-6 mt-3 text-xs text-gray-500">
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
                <span className="w-2 h-2 bg-emerald-500 rounded-full" />
                <span>Destination</span>
              </div>
            </div>
          </div>

          {/* Route Table */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-x-auto">
            <table className="w-full text-sm min-w-[640px]">
              <thead>
                <tr className="border-b border-gray-800">
                  <th className="text-left px-4 py-3 text-gray-400 font-medium">Port</th>
                  <th className="text-left px-4 py-3 text-gray-400 font-medium">Destination</th>
                  <th className="text-left px-4 py-3 text-gray-400 font-medium">Shipments</th>
                  <th className="text-left px-4 py-3 text-gray-400 font-medium">Volume</th>
                  <th className="text-left px-4 py-3 text-gray-400 font-medium">Commodities</th>
                  <th className="text-left px-4 py-3 text-gray-400 font-medium">Confidence</th>
                </tr>
              </thead>
              <tbody>
                {filteredRoutes.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                      No routes to display. Run the seed script to populate data.
                    </td>
                  </tr>
                ) : (
                  filteredRoutes.map((route, i) => (
                    <tr key={i} className="border-b border-gray-800/50 hover:bg-gray-800/50">
                      <td className="px-4 py-3 text-blue-400 font-mono">
                        {route.port === 'PECLL' ? 'Callao' : 'Matarani'}
                      </td>
                      <td className="px-4 py-3 text-emerald-400">{route.destination}</td>
                      <td className="px-4 py-3 text-gray-300 font-mono">{route.shipment_count}</td>
                      <td className="px-4 py-3 text-gray-300 font-mono">
                        {route.total_weight_kg > 0 ? `${(route.total_weight_kg / 1000).toFixed(1)}t` : '-'}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1 flex-wrap">
                          {route.commodities.map((c, j) => (
                            <span key={j} className="text-xs bg-gray-800 text-gray-400 px-1.5 py-0.5 rounded">{c}</span>
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
