/**
 * NAUTILUS — Global UN Comtrade Ingestion v2
 *
 * 10 key corridors, 2022–2023, UN Comtrade Public Preview API (no key needed)
 * Run: npx tsx scripts/ingest-global-comtrade-v2.ts
 */

import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'https://nipwrfsiiajddhisqkex.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5pcHdyZnNpaWFqZGRoaXNxa2V4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTU5NjI0MCwiZXhwIjoyMDg3MTcyMjQwfQ.ubCxPIQ01hy32LJzmAGKSo0lYNwJgUVIVp9zBhgBctQ'
)

interface Corridor {
  code: number
  name: string
  region: string
  commodities: { hs: string; name: string; category: string }[]
}

const CORRIDORS: Corridor[] = [
  {
    code: 604, name: 'Peru', region: 'South America',
    commodities: [
      { hs: '260300', name: 'Copper Ore/Concentrate', category: 'copper_ore' },
      { hs: '260800', name: 'Zinc Ore/Concentrate', category: 'zinc_ore' },
      { hs: '260700', name: 'Lead Ore/Concentrate', category: 'lead_ore' },
    ],
  },
  {
    code: 152, name: 'Chile', region: 'South America',
    commodities: [
      { hs: '260300', name: 'Copper Ore/Concentrate', category: 'copper_ore' },
      { hs: '740200', name: 'Copper Matte', category: 'copper_matte' },
    ],
  },
  {
    code: 36, name: 'Australia', region: 'Oceania',
    commodities: [
      { hs: '260111', name: 'Iron Ore (non-agglomerated)', category: 'iron_ore' },
      { hs: '270112', name: 'Bituminous Coal', category: 'coal' },
    ],
  },
  {
    code: 76, name: 'Brazil', region: 'South America',
    commodities: [
      { hs: '260111', name: 'Iron Ore (non-agglomerated)', category: 'iron_ore' },
      { hs: '120190', name: 'Soybeans', category: 'soy' },
    ],
  },
  {
    code: 360, name: 'Indonesia', region: 'Asia-Pacific',
    commodities: [
      { hs: '270112', name: 'Bituminous Coal', category: 'coal' },
      { hs: '260400', name: 'Nickel Ore/Concentrate', category: 'nickel_ore' },
    ],
  },
  {
    code: 710, name: 'South Africa', region: 'Africa',
    commodities: [
      { hs: '270112', name: 'Bituminous Coal', category: 'coal' },
      { hs: '711011', name: 'Platinum (unwrought)', category: 'platinum' },
    ],
  },
  {
    code: 180, name: 'DRC', region: 'Africa',
    commodities: [
      { hs: '260500', name: 'Cobalt Ore/Concentrate', category: 'cobalt' },
      { hs: '260300', name: 'Copper Ore/Concentrate', category: 'copper_ore' },
    ],
  },
  {
    code: 124, name: 'Canada', region: 'North America',
    commodities: [
      { hs: '310420', name: 'Potash (KCl)', category: 'potash' },
      { hs: '100190', name: 'Wheat', category: 'wheat' },
    ],
  },
  {
    code: 643, name: 'Russia', region: 'Europe/FSU',
    commodities: [
      { hs: '100190', name: 'Wheat', category: 'wheat' },
      { hs: '310210', name: 'Urea (Fertilizer)', category: 'fertilizer' },
    ],
  },
  {
    code: 324, name: 'Guinea', region: 'Africa',
    commodities: [
      { hs: '260600', name: 'Bauxite (Aluminium Ore)', category: 'bauxite' },
    ],
  },
]

const YEARS = [2022, 2023]

// UN Comtrade preview API returns partnerDesc=null, so we map codes to names
const PARTNER_CODES: Record<number, string> = {
  0: 'World', 36: 'Australia', 40: 'Austria', 56: 'Belgium', 76: 'Brazil',
  100: 'Bulgaria', 104: 'Myanmar', 116: 'Cambodia', 124: 'Canada', 152: 'Chile',
  156: 'China', 170: 'Colombia', 180: 'DRC', 196: 'Cyprus', 203: 'Czechia',
  208: 'Denmark', 218: 'Ecuador', 233: 'Estonia', 246: 'Finland', 250: 'France',
  276: 'Germany', 300: 'Greece', 344: 'Hong Kong', 348: 'Hungary', 356: 'India',
  360: 'Indonesia', 364: 'Iran', 368: 'Iraq', 372: 'Ireland', 376: 'Israel',
  380: 'Italy', 392: 'Japan', 398: 'Kazakhstan', 400: 'Jordan', 404: 'Kenya',
  410: 'South Korea', 414: 'Kuwait', 418: 'Laos', 422: 'Lebanon', 428: 'Latvia',
  440: 'Lithuania', 442: 'Luxembourg', 458: 'Malaysia', 484: 'Mexico',
  490: 'Other Asia', 504: 'Morocco', 508: 'Mozambique', 516: 'Namibia',
  528: 'Netherlands', 554: 'New Zealand', 566: 'Nigeria', 578: 'Norway',
  586: 'Pakistan', 604: 'Peru', 608: 'Philippines', 616: 'Poland', 620: 'Portugal',
  634: 'Qatar', 642: 'Romania', 643: 'Russia', 682: 'Saudi Arabia', 699: 'India',
  702: 'Singapore', 703: 'Slovakia', 704: 'Vietnam', 710: 'South Africa',
  724: 'Spain', 752: 'Sweden', 756: 'Switzerland', 764: 'Thailand', 792: 'Turkey',
  804: 'Ukraine', 818: 'Egypt', 826: 'United Kingdom', 840: 'United States',
  842: 'US Virgin Islands', 858: 'Uruguay', 862: 'Venezuela',
  894: 'Zambia',
}

interface ComtradeRecord {
  partnerDesc?: string | null
  partnerCode?: number
  primaryValue?: number
  netWgt?: number
  qty?: number
  period?: string
  refYear?: number
  cmdCode?: string
  cmdDesc?: string | null
}

async function fetchComtrade(reporterCode: number, hsCode: string, year: number): Promise<ComtradeRecord[]> {
  const url = `https://comtradeapi.un.org/public/v1/preview/C/A/HS?reporterCode=${reporterCode}&cmdCode=${hsCode}&flowCode=X&period=${year}`

  const res = await fetch(url, { headers: { Accept: 'application/json' } })
  if (!res.ok) {
    console.warn(`    ⚠ HTTP ${res.status} for reporter=${reporterCode} HS${hsCode} ${year}`)
    return []
  }
  const json = await res.json() as { data?: ComtradeRecord[]; count?: number }
  return json.data ?? []
}

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function ingest() {
  console.log('NAUTILUS — Global UN Comtrade Ingest v2')
  console.log('========================================')
  console.log(`Corridors: ${CORRIDORS.length} | Years: ${YEARS.join(', ')}`)
  console.log()

  let totalInserted = 0
  let totalSkipped = 0

  for (const corridor of CORRIDORS) {
    console.log(`\n▸ ${corridor.name} (code ${corridor.code})`)

    for (const commodity of corridor.commodities) {
      console.log(`  HS ${commodity.hs}: ${commodity.name}`)

      for (const year of YEARS) {
        process.stdout.write(`    ${year} ... `)

        const records = await fetchComtrade(corridor.code, commodity.hs, year)
        console.log(`${records.length} raw records`)

        if (records.length === 0) {
          await sleep(1100)
          continue
        }

        // Filter: skip "World" (code 0) aggregates and very small values
        const filtered = records.filter(
          r => (r.partnerCode ?? 0) !== 0 && (r.primaryValue ?? 0) > 100000
        )

        const rows = filtered.map(r => {
          const partnerName = PARTNER_CODES[r.partnerCode ?? 0] ?? `Country-${r.partnerCode}`
          return {
          exporter_name: `${corridor.name} (Aggregate)`,
          importer_name: partnerName,
          commodity: commodity.name,
          commodity_category: commodity.category,
          hs_code: commodity.hs,
          weight_kg: (r.netWgt ?? r.qty ?? 0) * 1000,
          declared_value_usd: r.primaryValue ?? 0,
          origin_country: corridor.name,
          origin_port: null,
          peru_port: 'COMTRADE_AGGREGATE',
          peru_port_unlocode: 'GLOBAL',
          destination_country: partnerName,
          destination_port: null,
          arrival_time: new Date(year, 6, 1).toISOString(), // mid-year
          departure_time: null,
          match_method: 'comtrade_annual',
          match_details: {
            data_source: 'un_comtrade_v2',
            granularity: 'annual',
            year,
            partner_code: r.partnerCode,
            reporter_code: corridor.code,
            flow: 'export',
          },
          confidence_score: 0.7,
          confidence_tier: 'MEDIUM',
          provenance: [{
            field: 'trade_value',
            raw_value: String(r.primaryValue),
            source_name: 'un_comtrade',
            source_url: `https://comtradeapi.un.org/public/v1/preview/C/A/HS?reporterCode=${corridor.code}&cmdCode=${commodity.hs}&flowCode=X&period=${year}`,
            fetch_timestamp: new Date().toISOString(),
            normalized_value: `$${((r.primaryValue ?? 0) / 1e6).toFixed(1)}M`,
          }],
        }})

        if (rows.length === 0) {
          totalSkipped++
          await sleep(1100)
          continue
        }

        // Insert in batches of 20
        const BATCH = 20
        for (let i = 0; i < rows.length; i += BATCH) {
          const batch = rows.slice(i, i + BATCH)
          const { error } = await supabase.from('peru_trade_flows').insert(batch)
          if (error) {
            console.warn(`      ⚠ Insert error: ${error.message.slice(0, 120)}`)
          } else {
            totalInserted += batch.length
          }
        }

        console.log(`      → ${rows.length} rows inserted`)

        // Rate limit: 1 req/sec
        await sleep(1100)
      }
    }
  }

  console.log('\n========================================')
  console.log(`✓ Total inserted: ${totalInserted} rows`)
  console.log(`  Skipped queries: ${totalSkipped}`)

  // Final count
  const { count } = await supabase
    .from('peru_trade_flows')
    .select('*', { count: 'exact', head: true })
  console.log(`  Total rows in peru_trade_flows: ${count}`)

  // Corridor summary
  const { data: summary } = await supabase
    .from('peru_trade_flows')
    .select('origin_country, commodity_category')
    .eq('match_method', 'comtrade_annual')

  const corridorSummary: Record<string, Set<string>> = {}
  for (const r of summary ?? []) {
    const key = r.origin_country as string
    if (!corridorSummary[key]) corridorSummary[key] = new Set()
    corridorSummary[key].add(r.commodity_category as string)
  }
  console.log('\nActive corridors:')
  for (const [country, cats] of Object.entries(corridorSummary).sort()) {
    console.log(`  ${country}: ${[...cats].join(', ')}`)
  }
}

ingest().catch(console.error)
