import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { resolveEntities, type ResolvedEntitiesResult } from '@/lib/cosmic/entityResolver';
import { generateAlerts } from '@/lib/alerts/alertEngine';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://nipwrfsiiajddhisqkex.supabase.co';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || '';

export async function GET() {
  try {
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: flows, error } = await supabase
      .from('peru_trade_flows')
      .select('*')
      .order('arrival_time', { ascending: false })
      .limit(100);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!flows || flows.length === 0) {
      return NextResponse.json({ alerts: [], count: 0, generated_at: new Date().toISOString() });
    }

    // Resolve entities for each flow
    const resolvedMap = new Map<string, ResolvedEntitiesResult>();
    for (const flow of flows) {
      const resolved = resolveEntities({
        exporter_country: flow.origin_country || 'Peru',
        importer_country: flow.destination_country || '',
        commodity: flow.commodity || '',
        value: flow.trade_value_usd || 0,
      });
      resolvedMap.set(flow.id, resolved);
    }

    const alerts = generateAlerts(
      flows.map((f: Record<string, unknown>) => ({
        id: f.id as string,
        destination_country: (f.destination_country as string) || '',
        commodity: (f.commodity as string) || '',
        importer_name: (f.importer_name as string) || undefined,
      })),
      resolvedMap
    );

    return NextResponse.json({
      alerts,
      count: alerts.length,
      generated_at: new Date().toISOString(),
    });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
