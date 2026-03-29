import { NextRequest, NextResponse } from 'next/server';
import { resolveEntities } from '@/lib/cosmic/entityResolver';
import { buildTradeChain } from '@/lib/cosmic/tradeChain';

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const exporter = params.get('exporter') || 'Peru';
  const importer = params.get('importer') || 'China';
  const commodity = params.get('commodity') || 'copper';
  const value = Number(params.get('value')) || 1000000;

  const flow = {
    exporter_country: exporter,
    importer_country: importer,
    commodity,
    value,
  };

  const resolved = resolveEntities(flow);
  const trade_chain = buildTradeChain(resolved.entities);

  const flow_id = `${exporter.toLowerCase()}_${importer.toLowerCase()}_${commodity.toLowerCase()}`;

  return NextResponse.json({
    entities: resolved.entities,
    trade_chain,
    flow_id,
    timestamp: resolved.timestamp,
  });
}
