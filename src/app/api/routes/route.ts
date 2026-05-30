import { NextResponse } from 'next/server';
import { computeConfidenceTier } from '@/lib/pipeline/aurora';
import { getServiceClient } from '@/lib/db/supabase';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const supabase = getServiceClient();

    const { data: flows, error } = await supabase
      .from('peru_trade_flows')
      .select('peru_port_unlocode, origin_country, destination_country, commodity, weight_kg, confidence_score')
      .not('destination_country', 'is', null);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Aggregate routes
    const routeMap: Record<string, {
      destination: string;
      origin: string;
      shipment_count: number;
      total_weight_kg: number;
      commodities: Set<string>;
      confidence_scores: number[];
      port: string;
    }> = {};

    for (const flow of (flows || [])) {
      const origin = flow.origin_country || 'Peru';
      if (!isUsableCountry(origin) || !isUsableCountry(flow.destination_country)) continue;
      const key = `${flow.peru_port_unlocode}-${origin}-${flow.destination_country}`;
      if (!routeMap[key]) {
        routeMap[key] = {
          destination: flow.destination_country,
          origin,
          shipment_count: 0,
          total_weight_kg: 0,
          commodities: new Set(),
          confidence_scores: [],
          port: flow.peru_port_unlocode,
        };
      }
      routeMap[key].shipment_count++;
      routeMap[key].total_weight_kg += flow.weight_kg || 0;
      if (flow.commodity) routeMap[key].commodities.add(flow.commodity);
      routeMap[key].confidence_scores.push(flow.confidence_score || 0);
    }

    const routes = Object.values(routeMap)
      .map(r => ({
        destination: r.destination,
        origin: r.origin,
        shipment_count: r.shipment_count,
        total_weight_kg: r.total_weight_kg,
        commodities: Array.from(r.commodities),
        confidence_tier: computeConfidenceTier(
          r.confidence_scores.reduce((a, b) => a + b, 0) / r.confidence_scores.length
        ),
        port: r.port,
      }))
      .sort((a, b) => b.shipment_count - a.shipment_count);

    return NextResponse.json({ routes });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

function isUsableCountry(country?: string | null) {
  if (!country) return false;
  const normalized = country.trim().toLowerCase();
  if (!normalized || normalized === 'unknown') return false;
  if (/^country-\d+$/.test(normalized)) return false;
  if (normalized === 'other asia') return false;
  return true;
}
