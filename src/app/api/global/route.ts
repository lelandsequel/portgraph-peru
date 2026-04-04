import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://nipwrfsiiajddhisqkex.supabase.co';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const REGION_MAP: Record<string, string> = {
  Peru: 'South America',
  Chile: 'South America',
  Brazil: 'South America',
  Argentina: 'South America',
  Colombia: 'South America',
  Bolivia: 'South America',
  Australia: 'Oceania',
  'New Zealand': 'Oceania',
  'New Caledonia': 'Oceania',
  Indonesia: 'Asia-Pacific',
  Philippines: 'Asia-Pacific',
  Vietnam: 'Asia-Pacific',
  Myanmar: 'Asia-Pacific',
  China: 'Asia-Pacific',
  Japan: 'Asia-Pacific',
  'South Korea': 'Asia-Pacific',
  India: 'Asia-Pacific',
  'South Africa': 'Africa',
  DRC: 'Africa',
  Guinea: 'Africa',
  Namibia: 'Africa',
  Mozambique: 'Africa',
  Zambia: 'Africa',
  Nigeria: 'Africa',
  Angola: 'Africa',
  Canada: 'North America',
  'United States': 'North America',
  Russia: 'Europe/FSU',
  Ukraine: 'Europe/FSU',
  Kazakhstan: 'Europe/FSU',
  Sweden: 'Europe/FSU',
  Germany: 'Europe',
  Spain: 'Europe',
  Italy: 'Europe',
  Netherlands: 'Europe',
  Belgium: 'Europe',
  Qatar: 'Middle East',
};

function getRegion(country: string): string {
  return REGION_MAP[country] || 'Other';
}

export async function GET() {
  try {
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get all trade flows — use origin_country (not reporter_country which may not exist)
    const { data: flows, error } = await supabase
      .from('peru_trade_flows')
      .select('commodity, commodity_category, destination_country, weight_kg, declared_value_usd, arrival_time, match_method, origin_country')
      .not('commodity_category', 'in', '(port_call_aggregate,vessel_call)')
      .order('arrival_time', { ascending: false })
      .limit(5000);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Aggregate by commodity category
    const commodityMap: Record<string, {
      category: string;
      commodity: string;
      total_weight_kg: number;
      total_value_usd: number;
      shipment_count: number;
      top_exporters: Record<string, number>;
      top_destinations: Record<string, number>;
      regions: Set<string>;
      recent_count: number;
    }> = {};

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    for (const f of (flows || [])) {
      const cat = f.commodity_category || 'other';
      if (!commodityMap[cat]) {
        commodityMap[cat] = {
          category: cat,
          commodity: f.commodity || cat,
          total_weight_kg: 0,
          total_value_usd: 0,
          shipment_count: 0,
          top_exporters: {},
          top_destinations: {},
          regions: new Set(),
          recent_count: 0,
        };
      }
      const entry = commodityMap[cat];
      entry.shipment_count++;
      entry.total_weight_kg += f.weight_kg || 0;
      entry.total_value_usd += f.declared_value_usd || 0;

      const country = f.origin_country || 'Unknown';
      entry.top_exporters[country] = (entry.top_exporters[country] || 0) + 1;
      if (f.destination_country) entry.top_destinations[f.destination_country] = (entry.top_destinations[f.destination_country] || 0) + 1;

      const region = getRegion(country);
      entry.regions.add(region);

      if (f.arrival_time && new Date(f.arrival_time) > thirtyDaysAgo) {
        entry.recent_count++;
      }
    }

    const commodities = Object.values(commodityMap).map(c => ({
      category: c.category,
      commodity: c.commodity,
      total_weight_kg: c.total_weight_kg,
      total_value_usd: c.total_value_usd,
      shipment_count: c.shipment_count,
      top_exporter: Object.entries(c.top_exporters).sort((a, b) => b[1] - a[1])[0]?.[0] || '-',
      top_destination: Object.entries(c.top_destinations).sort((a, b) => b[1] - a[1])[0]?.[0] || '-',
      regions: Array.from(c.regions),
      recent_count: c.recent_count,
    })).sort((a, b) => b.total_value_usd - a.total_value_usd);

    // Region summary — derived from origin_country
    const regionMap: Record<string, { country_count: Set<string>; flow_count: number; value_usd: number }> = {};
    for (const f of (flows || [])) {
      const country = f.origin_country || 'Unknown';
      const reg = getRegion(country);
      if (!regionMap[reg]) regionMap[reg] = { country_count: new Set(), flow_count: 0, value_usd: 0 };
      regionMap[reg].flow_count++;
      regionMap[reg].value_usd += f.declared_value_usd || 0;
      regionMap[reg].country_count.add(country);
    }

    const regions = Object.entries(regionMap).map(([name, d]) => ({
      name,
      countries: d.country_count.size,
      flow_count: d.flow_count,
      value_usd: d.value_usd,
    }));

    // Country corridor summary — use origin_country
    const countryMap: Record<string, { commodities: Set<string>; flow_count: number; value_usd: number; region: string }> = {};
    for (const f of (flows || [])) {
      const country = f.origin_country || 'Unknown';
      if (!countryMap[country]) countryMap[country] = { commodities: new Set(), flow_count: 0, value_usd: 0, region: getRegion(country) };
      countryMap[country].flow_count++;
      countryMap[country].value_usd += f.declared_value_usd || 0;
      if (f.commodity) countryMap[country].commodities.add(f.commodity);
    }

    const corridors = Object.entries(countryMap).map(([name, d]) => ({
      country: name,
      region: d.region,
      commodities: Array.from(d.commodities),
      flow_count: d.flow_count,
      value_usd: d.value_usd,
    })).sort((a, b) => b.value_usd - a.value_usd);

    return NextResponse.json({ commodities, regions, corridors });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
