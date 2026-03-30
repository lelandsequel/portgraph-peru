/**
 * NAUTILUS — UN Comtrade Monthly Data Ingestion
 *
 * Source: UN Comtrade Public Preview API (no API key required)
 * Monthly (M) granularity — much fresher signal than annual.
 * Fetches last 12 months for Peru's key mineral exports.
 *
 * Endpoint: https://comtradeapi.un.org/public/v1/preview/C/M/HS
 * Reporter: 604 = Peru
 * Flow: X = Export
 *
 * Run: npx tsx scripts/ingest-comtrade-monthly.ts
 */

import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'https://nipwrfsiiajddhisqkex.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5pcHdyZnNpaWFqZGRoaXNxa2V4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTU5NjI0MCwiZXhwIjoyMDg3MTcyMjQwfQ.ubCxPIQ01hy32LJzmAGKSo0lYNwJgUVIVp9zBhgBctQ'
)

const HS_TARGETS = [
  { code: '2603', commodity: 'Copper Ore/Concentrate', category: 'copper_ore' },
  { code: '260300', commodity: 'Copper Ore/Concentrate', category: 'copper_ore' },
  { code: '2608', commodity: 'Zinc Ore/Concentrate',   category: 'zinc_ore' },
  { code: '260800', commodity: 'Zinc Ore/Concentrate',   category: 'zinc_ore' },
  { code: '2607', commodity: 'Lead Ore/Concentrate',   category: 'lead_ore' },
  { code: '260700', commodity: 'Lead Ore/Concentrate',   category: 'lead_ore' },
  { code: '7403', commodity: 'Refined Copper',         category: 'refined_copper' },
  { code: '740311', commodity: 'Refined Copper Cathodes', category: 'refined_copper' },
]

// Deduplicate — prefer 6-digit codes, fall back to 4-digit
const UNIQUE_HS = HS_TARGETS.filter((hs, i, arr) => {
  // If there's a 6-digit version of a 4-digit code, skip the 4-digit
  if (hs.code.length === 4 && arr.some(h => h.code.startsWith(hs.code) && h.code.length === 6)) {
    return false
  }
  return true
})

const PORT_ASSIGN: Record<string, { port: string; unlocode: string }> = {
  copper_ore:     { port: 'Callao',   unlocode: 'PECLL' },
  refined_copper: { port: 'Callao',   unlocode: 'PECLL' },
  zinc_ore:       { port: 'Matarani', unlocode: 'PEMRI' },
  lead_ore:       { port: 'Matarani', unlocode: 'PEMRI' },
}

interface ComtradeRecord {
  partnerDesc?: string
  partnerCode?: number
  primaryValue?: number
  qty?: number
  period?: number
  refYear?: number
  refMonth?: number
  cmdCode?: string
}

function generateMonthlyPeriods(): number[] {
  const periods: number[] = []
  const now = new Date()
  for (let i = 0; i < 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const year = d.getFullYear()
    const month = String(d.getMonth() + 1).padStart(2, '0')
    periods.push(parseInt(`${year}${month}`))
  }
  return periods
}

async function fetchComtradeMonthly(hsCode: string, period: number): Promise<ComtradeRecord[]> {
  const url = `https://comtradeapi.un.org/public/v1/preview/C/M/HS?reporterCode=604&cmdCode=${hsCode}&flowCode=X&period=${period}`
  console.log(`  Fetching HS${hsCode} ${period}...`)

  try {
    const res = await fetch(url, { headers: { Accept: 'application/json' } })
    if (!res.ok) {
      if (res.status === 404) {
        console.log(`    → No data available for ${period}`)
        return []
      }
      console.warn(`    ${res.status} for HS${hsCode} ${period}`)
      return []
    }
    const json = await res.json() as { data?: ComtradeRecord[]; count?: number }
    const count = json.count ?? json.data?.length ?? 0
    if (count > 0) console.log(`    → ${count} records`)
    return json.data ?? []
  } catch (err) {
    console.warn(`    Fetch error: ${(err as Error).message}`)
    return []
  }
}

async function ingest() {
  console.log('NAUTILUS — UN Comtrade Monthly Ingest\n')
  console.log('Source: UN Comtrade Public API (Monthly granularity)')
  console.log('Coverage: Last 12 months | Peru mineral exports\n')

  const periods = generateMonthlyPeriods()
  console.log(`Periods: ${periods[periods.length - 1]} → ${periods[0]}\n`)

  let total = 0

  for (const hs of UNIQUE_HS) {
    console.log(`\n▸ ${hs.commodity} (HS ${hs.code})`)
    const portInfo = PORT_ASSIGN[hs.category] ?? { port: 'Callao', unlocode: 'PECLL' }

    for (const period of periods) {
      const records = await fetchComtradeMonthly(hs.code, period)
      if (records.length === 0) continue

      const year = Math.floor(period / 100)
      const month = period % 100

      const rows = records
        .filter(r => r.partnerDesc && r.partnerDesc !== 'World' && (r.primaryValue ?? 0) > 100000)
        .map(r => ({
          exporter_name: 'Peru (Aggregate)',
          importer_name: r.partnerDesc ?? 'Unknown',
          commodity: hs.commodity,
          commodity_category: hs.category,
          hs_code: hs.code.slice(0, 4), // Normalize to 4-digit for consistency
          weight_kg: (r.qty ?? 0) * 1000,
          declared_value_usd: r.primaryValue ?? 0,
          origin_country: 'Peru',
          origin_port: null,
          peru_port: portInfo.port,
          peru_port_unlocode: portInfo.unlocode,
          destination_country: r.partnerDesc ?? 'Unknown',
          destination_port: null,
          arrival_time: new Date(year, month - 1, 1).toISOString(),
          departure_time: null,
          match_method: 'comtrade_monthly',
          match_details: {
            data_source: 'un_comtrade',
            granularity: 'monthly',
            period,
            year,
            month,
            partner_code: r.partnerCode,
            reporter_code: 604,
            flow: 'export',
            period_type: 'monthly',
          },
          confidence_score: 0.88,
          confidence_tier: 'HIGH',
          provenance: [{
            field: 'trade_value',
            raw_value: String(r.primaryValue),
            source_name: 'un_comtrade_monthly',
            source_url: `https://comtradeapi.un.org/public/v1/preview/C/M/HS?reporterCode=604&cmdCode=${hs.code}&flowCode=X&period=${period}`,
            fetch_timestamp: new Date().toISOString(),
            normalized_value: `$${((r.primaryValue ?? 0) / 1e6).toFixed(1)}M`,
          }],
        }))

      if (rows.length === 0) continue

      // Insert in batches
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

      // Rate limit — Comtrade free API has limits
      await new Promise(r => setTimeout(r, 800))
    }
  }

  console.log(`\n${'═'.repeat(60)}`)
  console.log(`✓ Inserted ${total} monthly trade flow rows`)

  const { count } = await supabase
    .from('peru_trade_flows')
    .select('*', { count: 'exact', head: true })
  console.log(`Total rows in peru_trade_flows: ${count}`)

  // Show monthly coverage
  const { data: monthlySummary } = await supabase
    .from('peru_trade_flows')
    .select('arrival_time, destination_country, commodity, declared_value_usd')
    .eq('match_method', 'comtrade_monthly')
    .order('arrival_time', { ascending: false })
    .limit(10)

  if (monthlySummary && monthlySummary.length > 0) {
    console.log('\nLatest monthly records:')
    for (const r of monthlySummary) {
      const period = (r.arrival_time as string)?.slice(0, 7)
      const val = ((r.declared_value_usd as number) / 1e6).toFixed(1)
      console.log(`  ${period} | ${r.destination_country} | ${r.commodity} | $${val}M`)
    }
  }
}

ingest().catch(console.error)
