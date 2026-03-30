/**
 * NAUTILUS — Flow Arc Ingestion (Bilateral Commodity Corridors)
 *
 * Source: UN Comtrade Public Preview API
 * Builds FROM→TO arcs for every major commodity exporter with partner breakdown
 *
 * Endpoint: https://comtradeapi.un.org/public/v1/preview/C/A/HS
 * Response includes partnerDesc (destination country)
 *
 * Run: npx tsx scripts/ingest-flow-arcs.ts
 */

import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'https://nipwrfsiiajddhisqkex.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5pcHdyZnNpaWFqZGRoaXNxa2V4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTU5NjI0MCwiZXhwIjoyMDg3MTcyMjQwfQ.ubCxPIQ01hy32LJzmAGKSo0lYNwJgUVIVp9zBhgBctQ'
)

// All reporter countries with their Comtrade codes and commodity specializations
const REPORTERS: {
  code: number; name: string; commodities: { hsCode: string; commodity: string; category: string }[]
}[] = [
  { code: 604, name: 'Peru', commodities: [
    { hsCode: '260300', commodity: 'Copper Ore', category: 'copper_ore' },
    { hsCode: '260800', commodity: 'Zinc Ore', category: 'zinc_ore' },
    { hsCode: '260700', commodity: 'Lead Ore', category: 'lead_ore' },
  ]},
  { code: 152, name: 'Chile', commodities: [
    { hsCode: '260300', commodity: 'Copper Ore', category: 'copper_ore' },
    { hsCode: '740311', commodity: 'Refined Copper', category: 'refined_copper' },
    { hsCode: '283691', commodity: 'Lithium Carbonate', category: 'lithium_carbonate' },
  ]},
  { code: 36, name: 'Australia', commodities: [
    { hsCode: '260111', commodity: 'Iron Ore', category: 'iron_ore' },
    { hsCode: '270112', commodity: 'Coal', category: 'coal' },
    { hsCode: '271121', commodity: 'LNG', category: 'lng' },
    { hsCode: '260190', commodity: 'Lithium Ore', category: 'lithium_ore' },
  ]},
  { code: 76, name: 'Brazil', commodities: [
    { hsCode: '260111', commodity: 'Iron Ore', category: 'iron_ore' },
    { hsCode: '120190', commodity: 'Soybeans', category: 'soy' },
  ]},
  { code: 360, name: 'Indonesia', commodities: [
    { hsCode: '270112', commodity: 'Coal', category: 'coal' },
    { hsCode: '260400', commodity: 'Nickel Ore', category: 'nickel_ore' },
  ]},
  { code: 710, name: 'South Africa', commodities: [
    { hsCode: '270112', commodity: 'Coal', category: 'coal' },
    { hsCode: '261000', commodity: 'Chromium Ore', category: 'chromium' },
    { hsCode: '260200', commodity: 'Manganese Ore', category: 'manganese' },
  ]},
  { code: 180, name: 'DRC', commodities: [
    { hsCode: '260300', commodity: 'Copper Ore', category: 'copper_ore' },
  ]},
  { code: 124, name: 'Canada', commodities: [
    { hsCode: '310420', commodity: 'Potash', category: 'potash' },
    { hsCode: '100190', commodity: 'Wheat', category: 'wheat' },
  ]},
  { code: 643, name: 'Russia', commodities: [
    { hsCode: '100190', commodity: 'Wheat', category: 'wheat' },
    { hsCode: '271121', commodity: 'LNG', category: 'lng' },
  ]},
  { code: 170, name: 'Colombia', commodities: [
    { hsCode: '270112', commodity: 'Coal', category: 'coal' },
  ]},
  { code: 752, name: 'Sweden', commodities: [
    { hsCode: '260111', commodity: 'Iron Ore', category: 'iron_ore' },
  ]},
  { code: 508, name: 'Mozambique', commodities: [
    { hsCode: '270112', commodity: 'Coal', category: 'coal' },
    { hsCode: '271121', commodity: 'LNG', category: 'lng' },
  ]},
  { code: 894, name: 'Zambia', commodities: [
    { hsCode: '260300', commodity: 'Copper Ore', category: 'copper_ore' },
    { hsCode: '740311', commodity: 'Refined Copper', category: 'refined_copper' },
  ]},
  { code: 32, name: 'Argentina', commodities: [
    { hsCode: '283691', commodity: 'Lithium Carbonate', category: 'lithium_carbonate' },
    { hsCode: '120190', commodity: 'Soybeans', category: 'soy' },
  ]},
  { code: 566, name: 'Nigeria', commodities: [
    { hsCode: '271121', commodity: 'LNG', category: 'lng' },
    { hsCode: '270900', commodity: 'Crude Oil', category: 'crude_oil' },
  ]},
  { code: 24, name: 'Angola', commodities: [
    { hsCode: '270900', commodity: 'Crude Oil', category: 'crude_oil' },
  ]},
  { code: 634, name: 'Qatar', commodities: [
    { hsCode: '271121', commodity: 'LNG', category: 'lng' },
  ]},
  { code: 608, name: 'Philippines', commodities: [
    { hsCode: '260400', commodity: 'Nickel Ore', category: 'nickel_ore' },
  ]},
  { code: 324, name: 'Guinea', commodities: [
    { hsCode: '260600', commodity: 'Bauxite', category: 'bauxite' },
  ]},
]

interface ComtradeRecord {
  partnerDesc?: string
  partnerCode?: number
  primaryValue?: number
  qty?: number
  period?: string
  refYear?: number
}

async function fetchComtrade(reporterCode: number, hsCode: string, period: number): Promise<ComtradeRecord[]> {
  const url = `https://comtradeapi.un.org/public/v1/preview/C/A/HS?reporterCode=${reporterCode}&cmdCode=${hsCode}&flowCode=X&period=${period}`
  const res = await fetch(url, { headers: { Accept: 'application/json' } })
  if (!res.ok) {
    console.warn(`  ${res.status} for reporter=${reporterCode} HS${hsCode} ${period}`)
    return []
  }
  const json = await res.json() as { data?: ComtradeRecord[] }
  return json.data ?? []
}

async function ingest() {
  console.log('NAUTILUS — Flow Arc Ingestion (Bilateral Commodity Corridors)\n')
  console.log('Source: UN Comtrade Public API')
  console.log(`Coverage: 2021–2024 | ${REPORTERS.length} countries\n`)

  let total = 0
  const years = [2021, 2022, 2023, 2024]

  for (const reporter of REPORTERS) {
    console.log(`\n▸ ${reporter.name} (code ${reporter.code})`)

    for (const hs of reporter.commodities) {
      console.log(`  ${hs.commodity} (HS ${hs.hsCode})`)

      for (const year of years) {
        process.stdout.write(`    ${year}...`)
        const records = await fetchComtrade(reporter.code, hs.hsCode, year)
        process.stdout.write(` ${records.length} records\n`)

        if (records.length === 0) continue

        const rows = records
          .filter(r => r.partnerDesc && r.partnerDesc !== 'World' && (r.primaryValue ?? 0) > 100000)
          .map(r => ({
            origin_country: reporter.name,
            destination_country: r.partnerDesc ?? 'Unknown',
            commodity: hs.commodity,
            commodity_category: hs.category,
            hs_code: hs.hsCode,
            annual_volume_mt: (r.qty ?? 0),  // Comtrade qty in metric tons for these codes
            annual_value_usd: r.primaryValue ?? 0,
            year,
            source: 'un_comtrade',
          }))

        if (rows.length === 0) continue

        const BATCH = 30
        for (let i = 0; i < rows.length; i += BATCH) {
          const batch = rows.slice(i, i + BATCH)
          const { error } = await supabase.from('flow_arcs').insert(batch)
          if (error) {
            console.warn(`      Insert error: ${error.message.slice(0, 120)}`)
          } else {
            total += batch.length
          }
        }

        // Rate limit
        await new Promise(r => setTimeout(r, 700))
      }
    }
  }

  console.log(`\n✓ Inserted ${total} flow arcs`)

  const { count } = await supabase
    .from('flow_arcs')
    .select('*', { count: 'exact', head: true })
  console.log(`Total flow_arcs in DB: ${count}`)

  // Show top 10 arcs by value
  const { data: topArcs } = await supabase
    .from('flow_arcs')
    .select('origin_country, destination_country, commodity, annual_value_usd, year')
    .order('annual_value_usd', { ascending: false })
    .limit(10)

  console.log('\nTop 10 Flow Arcs by Value:')
  for (const a of topArcs ?? []) {
    const val = ((a.annual_value_usd as number) / 1e9).toFixed(1)
    console.log(`  ${a.origin_country} → ${a.destination_country} | ${a.commodity} | $${val}B (${a.year})`)
  }
}

ingest().catch(console.error)
