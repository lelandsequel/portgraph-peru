import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://nipwrfsiiajddhisqkex.supabase.co';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || '';

// Major importers we track
const MAJOR_IMPORTERS = ['China', 'India', 'Japan', 'South Korea', 'Germany', 'Netherlands', 'Turkey', 'Taiwan', 'Thailand'];

export async function GET() {
  try {
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Try flow_arcs first
    const { data: arcs, error: arcsErr } = await supabase
      .from('flow_arcs')
      .select('*')
      .in('destination_country', MAJOR_IMPORTERS)
      .order('annual_value_usd', { ascending: false })
      .limit(2000);

    if (!arcsErr && arcs && arcs.length > 0) {
      return buildDemandResponse(arcs, 'flow_arcs');
    }

    // Fallback: aggregate from peru_trade_flows
    const { data: flows, error } = await supabase
      .from('peru_trade_flows')
      .select('destination_country, origin_country, reporter_country, commodity, commodity_category, weight_kg, declared_value_usd, arrival_time')
      .not('commodity_category', 'in', '(port_call_aggregate,vessel_call)')
      .not('destination_country', 'is', null)
      .order('declared_value_usd', { ascending: false })
      .limit(5000);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return buildDemandResponse(flows || [], 'trade_flows');
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

interface ImporterProfile {
  country: string;
  total_value_usd: number;
  total_volume_mt: number;
  commodities: { name: string; category: string; value_usd: number; volume_mt: number; share_pct: number }[];
  top_suppliers: { country: string; value_usd: number; share_pct: number }[];
  flow_count: number;
}

function buildDemandResponse(records: Record<string, unknown>[], source: string) {
  const importerMap: Record<string, {
    total_value: number;
    total_volume: number;
    commodities: Record<string, { value: number; volume: number; name: string }>;
    suppliers: Record<string, number>;
    count: number;
  }> = {};

  for (const r of records) {
    const dest = (r.destination_country as string) || '';
    if (!MAJOR_IMPORTERS.some(m => dest.includes(m))) continue;

    // Normalize to canonical name
    const canonical = MAJOR_IMPORTERS.find(m => dest.includes(m)) || dest;

    if (!importerMap[canonical]) {
      importerMap[canonical] = { total_value: 0, total_volume: 0, commodities: {}, suppliers: {}, count: 0 };
    }

    const entry = importerMap[canonical];
    const value = (source === 'flow_arcs' ? r.annual_value_usd : r.declared_value_usd) as number || 0;
    const volume = source === 'flow_arcs'
      ? (r.annual_volume_mt as number || 0)
      : ((r.weight_kg as number || 0) / 1000);
    const commodity = (r.commodity as string) || 'Unknown';
    const category = (r.commodity_category as string) || 'other';
    const supplier = (source === 'flow_arcs' ? r.origin_country : (r.reporter_country || r.origin_country)) as string || 'Unknown';

    entry.total_value += value;
    entry.total_volume += volume;
    entry.count++;

    if (!entry.commodities[category]) {
      entry.commodities[category] = { value: 0, volume: 0, name: commodity };
    }
    entry.commodities[category].value += value;
    entry.commodities[category].volume += volume;

    entry.suppliers[supplier] = (entry.suppliers[supplier] || 0) + value;
  }

  const importers: ImporterProfile[] = Object.entries(importerMap)
    .map(([country, d]) => {
      const commodities = Object.entries(d.commodities)
        .map(([cat, cd]) => ({
          name: cd.name,
          category: cat,
          value_usd: cd.value,
          volume_mt: cd.volume,
          share_pct: d.total_value > 0 ? (cd.value / d.total_value) * 100 : 0,
        }))
        .sort((a, b) => b.value_usd - a.value_usd);

      const top_suppliers = Object.entries(d.suppliers)
        .map(([c, v]) => ({
          country: c,
          value_usd: v,
          share_pct: d.total_value > 0 ? (v / d.total_value) * 100 : 0,
        }))
        .sort((a, b) => b.value_usd - a.value_usd)
        .slice(0, 8);

      return {
        country,
        total_value_usd: d.total_value,
        total_volume_mt: d.total_volume,
        commodities,
        top_suppliers,
        flow_count: d.count,
      };
    })
    .sort((a, b) => b.total_value_usd - a.total_value_usd);

  return NextResponse.json({
    importers,
    source,
    total_importers: importers.length,
    total_value: importers.reduce((s, i) => s + i.total_value_usd, 0),
  });
}
