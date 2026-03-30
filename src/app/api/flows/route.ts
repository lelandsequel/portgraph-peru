import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://nipwrfsiiajddhisqkex.supabase.co';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || '';

export async function GET() {
  try {
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Try flow_arcs table first (populated by ingest-flow-arcs.ts)
    const { data: arcs, error: arcsError } = await supabase
      .from('flow_arcs')
      .select('*')
      .order('annual_value_usd', { ascending: false })
      .limit(500);

    if (!arcsError && arcs && arcs.length > 0) {
      // Build aggregated view from flow_arcs
      const arcMap: Record<string, {
        origin_country: string;
        destination_country: string;
        commodity: string;
        commodity_category: string;
        total_volume_mt: number;
        total_value_usd: number;
        years: number[];
        latest_year: number;
      }> = {};

      for (const a of arcs) {
        const key = `${a.origin_country}→${a.destination_country}|${a.commodity_category}`;
        if (!arcMap[key]) {
          arcMap[key] = {
            origin_country: a.origin_country,
            destination_country: a.destination_country,
            commodity: a.commodity,
            commodity_category: a.commodity_category || '',
            total_volume_mt: 0,
            total_value_usd: 0,
            years: [],
            latest_year: 0,
          };
        }
        arcMap[key].total_volume_mt += a.annual_volume_mt || 0;
        arcMap[key].total_value_usd += a.annual_value_usd || 0;
        if (a.year && !arcMap[key].years.includes(a.year)) {
          arcMap[key].years.push(a.year);
        }
        if (a.year > arcMap[key].latest_year) {
          arcMap[key].latest_year = a.year;
        }
      }

      const flows = Object.values(arcMap)
        .sort((a, b) => b.total_value_usd - a.total_value_usd);

      // Compute YoY trends from raw arcs
      const yoyMap: Record<string, { prev: number; curr: number }> = {};
      for (const a of arcs) {
        const key = `${a.origin_country}→${a.destination_country}|${a.commodity_category}`;
        if (!yoyMap[key]) yoyMap[key] = { prev: 0, curr: 0 };
        if (a.year === 2023) yoyMap[key].curr += a.annual_value_usd || 0;
        if (a.year === 2022) yoyMap[key].prev += a.annual_value_usd || 0;
      }

      const flowsWithTrend = flows.map(f => {
        const key = `${f.origin_country}→${f.destination_country}|${f.commodity_category}`;
        const yoy = yoyMap[key];
        let trend = 'stable';
        if (yoy && yoy.prev > 0) {
          const pct = ((yoy.curr - yoy.prev) / yoy.prev) * 100;
          if (pct > 10) trend = 'up';
          else if (pct < -10) trend = 'down';
        }
        return { ...f, trend };
      });

      // Top 10 by value
      const biggest = flowsWithTrend.slice(0, 10);

      // Unique commodities and regions
      const commodities = [...new Set(flows.map(f => f.commodity_category))];
      const originCountries = [...new Set(flows.map(f => f.origin_country))];
      const destCountries = [...new Set(flows.map(f => f.destination_country))];

      return NextResponse.json({
        flows: flowsWithTrend,
        biggest,
        commodities,
        originCountries,
        destCountries,
        totalArcs: flows.length,
        totalValue: flows.reduce((s, f) => s + f.total_value_usd, 0),
      });
    }

    // Fallback: aggregate from peru_trade_flows
    const { data: rawFlows, error } = await supabase
      .from('peru_trade_flows')
      .select('origin_country, destination_country, commodity, commodity_category, weight_kg, declared_value_usd, reporter_country, arrival_time')
      .not('commodity_category', 'in', '(port_call_aggregate,vessel_call)')
      .not('destination_country', 'is', null)
      .order('declared_value_usd', { ascending: false })
      .limit(5000);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const flowMap: Record<string, {
      origin_country: string;
      destination_country: string;
      commodity: string;
      commodity_category: string;
      total_volume_mt: number;
      total_value_usd: number;
      trend: string;
    }> = {};

    for (const f of rawFlows || []) {
      const origin = f.reporter_country || f.origin_country || 'Unknown';
      const dest = f.destination_country || 'Unknown';
      const key = `${origin}→${dest}|${f.commodity_category}`;
      if (!flowMap[key]) {
        flowMap[key] = {
          origin_country: origin,
          destination_country: dest,
          commodity: f.commodity || '',
          commodity_category: f.commodity_category || '',
          total_volume_mt: 0,
          total_value_usd: 0,
          trend: 'stable',
        };
      }
      flowMap[key].total_volume_mt += (f.weight_kg || 0) / 1000;
      flowMap[key].total_value_usd += f.declared_value_usd || 0;
    }

    const flows = Object.values(flowMap).sort((a, b) => b.total_value_usd - a.total_value_usd);
    const biggest = flows.slice(0, 10);
    const commodities = [...new Set(flows.map(f => f.commodity_category))];
    const originCountries = [...new Set(flows.map(f => f.origin_country))];
    const destCountries = [...new Set(flows.map(f => f.destination_country))];

    return NextResponse.json({
      flows,
      biggest,
      commodities,
      originCountries,
      destCountries,
      totalArcs: flows.length,
      totalValue: flows.reduce((s, f) => s + f.total_value_usd, 0),
    });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
