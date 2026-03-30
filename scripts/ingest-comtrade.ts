/**
 * NAUTILUS — UN Comtrade Ingestion
 * 
 * Source: UN Comtrade Public Preview API (no API key required)
 * This is the same underlying data as SUNAT exports — Peru reports its export
 * declarations to UN Comtrade, which aggregates them into the BACI dataset.
 * Comtrade gives us partner-country-level data by HS code for 2019-2023.
 * 
 * Endpoint: https://comtradeapi.un.org/public/v1/preview/C/A/HS
 * Reporter: 604 = Peru
 * Flow: X = Export
 */

import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'https://nipwrfsiiajddhisqkex.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5pcHdyZnNpaWFqZGRoaXNxa2V4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTU5NjI0MCwiZXhwIjoyMDg3MTcyMjQwfQ.ubCxPIQ01hy32LJzmAGKSo0lYNwJgUVIVp9zBhgBctQ'
)

const HS_TARGETS = [
  { code: '2603', commodity: 'Copper Ore/Concentrate', category: 'copper_ore' },
  { code: '2608', commodity: 'Zinc Ore/Concentrate',   category: 'zinc_ore' },
  { code: '2607', commodity: 'Lead Ore/Concentrate',   category: 'lead_ore' },
  { code: '7403', commodity: 'Refined Copper',         category: 'refined_copper' },
  { code: '7901', commodity: 'Zinc Metal',             category: 'zinc_ore' },
  { code: '2616', commodity: 'Silver Ores',            category: 'copper_ore' },
]

// Port assignment — major copper goes through Callao, zinc/lead often Matarani or Ilo
const PORT_ASSIGN: Record<string, { port: string; unlocode: string }> = {
  copper_ore:    { port: 'Callao',   unlocode: 'PECLL' },
  refined_copper:{ port: 'Callao',   unlocode: 'PECLL' },
  copper_matte:  { port: 'Callao',   unlocode: 'PECLL' },
  zinc_ore:      { port: 'Matarani', unlocode: 'PEMRI' },
  lead_ore:      { port: 'Matarani', unlocode: 'PEMRI' },
}

interface ComtradeRecord {
  partnerDesc?: string
  partnerCode?: number
  primaryValue?: number
  qty?: number
  period?: string
  refYear?: number
  cmdCode?: string
}

async function fetchComtrade(hsCode: string, period: number): Promise<ComtradeRecord[]> {
  const url = `https://comtradeapi.un.org/public/v1/preview/C/A/HS?reporterCode=604&cmdCode=${hsCode}&flowCode=X&period=${period}`
  console.log(`  Fetching HS${hsCode} ${period}...`)
  
  const res = await fetch(url, { headers: { Accept: 'application/json' } })
  if (!res.ok) {
    console.warn(`  ${res.status} for HS${hsCode} ${period}`)
    return []
  }
  const json = await res.json() as { data?: ComtradeRecord[]; count?: number }
  console.log(`    → ${json.count ?? json.data?.length ?? 0} records`)
  return json.data ?? []
}

async function ingest() {
  console.log('NAUTILUS — UN Comtrade Ingest (SUNAT-equivalent data)\n')
  console.log('Source: UN Comtrade Public API (Peru export declarations)')
  console.log('Coverage: 2019–2023 | HS codes: copper, zinc, lead, refined metals\n')

  let total = 0

  // Fetch 2019-2023 for all HS codes
  const years = [2019, 2020, 2021, 2022, 2023]

  for (const hs of HS_TARGETS) {
    console.log(`\n▸ ${hs.commodity} (HS ${hs.code})`)
    const portInfo = PORT_ASSIGN[hs.category] ?? { port: 'Callao', unlocode: 'PECLL' }

    for (const year of years) {
      const records = await fetchComtrade(hs.code, year)
      if (records.length === 0) continue

      const rows = records
        .filter(r => r.partnerDesc && r.partnerDesc !== 'World' && (r.primaryValue ?? 0) > 500000)
        .map(r => ({
          exporter_name: 'Peru (Aggregate)',
          importer_name: r.partnerDesc ?? 'Unknown',
          commodity: hs.commodity,
          commodity_category: hs.category,
          hs_code: hs.code,
          weight_kg: (r.qty ?? 0) * 1000,  // Comtrade qty is in metric tons
          declared_value_usd: r.primaryValue ?? 0,
          origin_country: 'Peru',
          origin_port: null,
          peru_port: portInfo.port,
          peru_port_unlocode: portInfo.unlocode,
          destination_country: r.partnerDesc ?? 'Unknown',
          destination_port: null,
          arrival_time: new Date(year, 0, 1).toISOString(),
          departure_time: null,
          match_method: 'comtrade_annual',
          match_details: {
            data_source: 'un_comtrade',
            granularity: 'annual',
            year,
            partner_code: r.partnerCode,
            reporter_code: 604,
            flow: 'export',
          },
          confidence_score: 0.90,
          confidence_tier: 'HIGH',
          provenance: [{
            field: 'trade_value',
            raw_value: String(r.primaryValue),
            source_name: 'un_comtrade',
            source_url: `https://comtradeapi.un.org/public/v1/preview/C/A/HS?reporterCode=604&cmdCode=${hs.code}&flowCode=X&period=${year}`,
            fetch_timestamp: new Date().toISOString(),
            normalized_value: `$${((r.primaryValue ?? 0) / 1e6).toFixed(1)}M`,
          }],
        }))

      if (rows.length === 0) continue

      // Insert in small batches to avoid conflicts
      const BATCH = 20
      for (let i = 0; i < rows.length; i += BATCH) {
        const batch = rows.slice(i, i + BATCH)
        const { error } = await supabase.from('peru_trade_flows').insert(batch)
        if (error) {
          console.warn(`    Insert error: ${error.message.slice(0, 120)}`)
        } else {
          total += batch.length
        }
      }

      // Rate limit
      await new Promise(r => setTimeout(r, 600))
    }
  }

  console.log(`\n✓ Inserted ${total} new rows`)

  const { count } = await supabase
    .from('peru_trade_flows')
    .select('*', { count: 'exact', head: true })
  console.log(`Total rows in peru_trade_flows: ${count}`)

  // Show coverage summary
  const { data: summary } = await supabase
    .from('peru_trade_flows')
    .select('arrival_time, destination_country, commodity')
    .order('arrival_time', { ascending: false })
    .limit(5)

  console.log('\nLatest 5 rows:')
  for (const r of summary ?? []) {
    console.log(`  ${(r.arrival_time as string)?.slice(0, 10)} | ${r.destination_country} | ${r.commodity}`)
  }
}

ingest().catch(console.error)
