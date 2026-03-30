/**
 * NAUTILUS — Global UN Comtrade Ingestion
 *
 * Source: UN Comtrade Public Preview API (no API key required)
 * Reporters: Chile, Australia, Brazil, Indonesia, South Africa, DRC, Canada, Russia, Ukraine, Kazakhstan, Guinea
 * Commodities: Copper, Iron Ore, Coal, Soy, Nickel, Cobalt, Zinc, Potash, Wheat, Fertilizer, Uranium, Bauxite
 *
 * Endpoint: https://comtradeapi.un.org/public/v1/preview/C/A/HS
 *
 * Run: npx tsx scripts/ingest-global-comtrade.ts
 */

import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'https://nipwrfsiiajddhisqkex.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5pcHdyZnNpaWFqZGRoaXNxa2V4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTU5NjI0MCwiZXhwIjoyMDg3MTcyMjQwfQ.ubCxPIQ01hy32LJzmAGKSo0lYNwJgUVIVp9zBhgBctQ'
)

// Reporter countries (UN Comtrade codes)
const REPORTERS = [
  { code: 152, name: 'Chile', region: 'South America', port: 'Antofagasta', unlocode: 'CLANT' },
  { code: 36,  name: 'Australia', region: 'Oceania', port: 'Port Hedland', unlocode: 'AUPHE' },
  { code: 76,  name: 'Brazil', region: 'South America', port: 'Santos', unlocode: 'BRSSZ' },
  { code: 360, name: 'Indonesia', region: 'Asia-Pacific', port: 'Samarinda', unlocode: 'IDSMR' },
  { code: 710, name: 'South Africa', region: 'Africa', port: 'Richards Bay', unlocode: 'ZARCB' },
  { code: 180, name: 'DRC', region: 'Africa', port: 'Matadi', unlocode: 'CDMAT' },
  { code: 124, name: 'Canada', region: 'North America', port: 'Vancouver', unlocode: 'CAVAN' },
  { code: 643, name: 'Russia', region: 'Europe/FSU', port: 'Novorossiysk', unlocode: 'RUNVS' },
  { code: 804, name: 'Ukraine', region: 'Europe/FSU', port: 'Odessa', unlocode: 'UAODS' },
  { code: 398, name: 'Kazakhstan', region: 'Europe/FSU', port: 'Aktau', unlocode: 'KZAKU' },
  { code: 324, name: 'Guinea', region: 'West Africa', port: 'Conakry', unlocode: 'GNCKY' },
]

// HS codes by country specialization
const COUNTRY_HS: Record<string, { code: string; commodity: string; category: string }[]> = {
  Chile: [
    { code: '2603', commodity: 'Copper Ore/Concentrate', category: 'copper_ore' },
    { code: '7403', commodity: 'Refined Copper', category: 'refined_copper' },
  ],
  Australia: [
    { code: '2601', commodity: 'Iron Ore', category: 'iron_ore' },
    { code: '2701', commodity: 'Coal', category: 'coal' },
  ],
  Brazil: [
    { code: '2601', commodity: 'Iron Ore', category: 'iron_ore' },
    { code: '1201', commodity: 'Soybeans', category: 'soy' },
  ],
  Indonesia: [
    { code: '2701', commodity: 'Coal', category: 'coal' },
    { code: '2604', commodity: 'Nickel Ore', category: 'nickel_ore' },
  ],
  'South Africa': [
    { code: '2701', commodity: 'Coal', category: 'coal' },
    { code: '2616', commodity: 'Precious Metal Ores (Platinum)', category: 'platinum' },
  ],
  DRC: [
    { code: '2605', commodity: 'Cobalt Ore', category: 'cobalt' },
    { code: '2603', commodity: 'Copper Ore', category: 'copper_ore' },
  ],
  Canada: [
    { code: '310420', commodity: 'Potash (KCl)', category: 'potash' },
    { code: '100190', commodity: 'Wheat', category: 'wheat' },
    { code: '100590', commodity: 'Corn/Maize', category: 'corn' },
  ],
  Russia: [
    { code: '100190', commodity: 'Wheat', category: 'wheat' },
    { code: '310210', commodity: 'Ammonium Nitrate (Fertilizer)', category: 'fertilizer' },
    { code: '310420', commodity: 'Potash (KCl)', category: 'potash' },
  ],
  Ukraine: [
    { code: '100190', commodity: 'Wheat', category: 'wheat' },
    { code: '100590', commodity: 'Corn/Maize', category: 'corn' },
    { code: '120100', commodity: 'Soybeans', category: 'soy' },
  ],
  Kazakhstan: [
    { code: '261210', commodity: 'Uranium Ore', category: 'uranium' },
    { code: '100190', commodity: 'Wheat', category: 'wheat' },
  ],
  Guinea: [
    { code: '260600', commodity: 'Bauxite (Aluminium Ore)', category: 'bauxite' },
  ],
}

// Port assignment per commodity+country
const PORT_ASSIGN: Record<string, Record<string, { port: string; unlocode: string }>> = {
  Chile: {
    copper_ore: { port: 'Antofagasta', unlocode: 'CLANT' },
    refined_copper: { port: 'Mejillones', unlocode: 'CLMJS' },
  },
  Australia: {
    iron_ore: { port: 'Port Hedland', unlocode: 'AUPHE' },
    coal: { port: 'Newcastle', unlocode: 'AUNTL' },
  },
  Brazil: {
    iron_ore: { port: 'Tubarão', unlocode: 'BRVIX' },
    soy: { port: 'Santos', unlocode: 'BRSSZ' },
  },
  Indonesia: {
    coal: { port: 'Samarinda', unlocode: 'IDSMR' },
    nickel_ore: { port: 'Balikpapan', unlocode: 'IDBPN' },
  },
  'South Africa': {
    coal: { port: 'Richards Bay', unlocode: 'ZARCB' },
    platinum: { port: 'Durban', unlocode: 'ZADUR' },
  },
  DRC: {
    cobalt: { port: 'Matadi', unlocode: 'CDMAT' },
    copper_ore: { port: 'Matadi', unlocode: 'CDMAT' },
  },
  Canada: {
    potash: { port: 'Vancouver', unlocode: 'CAVAN' },
    wheat: { port: 'Vancouver', unlocode: 'CAVAN' },
    corn: { port: 'Prince Rupert', unlocode: 'CAPRR' },
  },
  Russia: {
    wheat: { port: 'Novorossiysk', unlocode: 'RUNVS' },
    fertilizer: { port: 'Novorossiysk', unlocode: 'RUNVS' },
    potash: { port: 'Novorossiysk', unlocode: 'RUNVS' },
  },
  Ukraine: {
    wheat: { port: 'Odessa', unlocode: 'UAODS' },
    corn: { port: 'Chornomorsk', unlocode: 'UACHS' },
    soy: { port: 'Pivdennyi', unlocode: 'UAPIV' },
  },
  Kazakhstan: {
    uranium: { port: 'Aktau', unlocode: 'KZAKU' },
    wheat: { port: 'Aktau', unlocode: 'KZAKU' },
  },
  Guinea: {
    bauxite: { port: 'Conakry', unlocode: 'GNCKY' },
  },
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

async function fetchComtrade(reporterCode: number, hsCode: string, period: number): Promise<ComtradeRecord[]> {
  const url = `https://comtradeapi.un.org/public/v1/preview/C/A/HS?reporterCode=${reporterCode}&cmdCode=${hsCode}&flowCode=X&period=${period}`

  const res = await fetch(url, { headers: { Accept: 'application/json' } })
  if (!res.ok) {
    console.warn(`    ${res.status} for reporter=${reporterCode} HS${hsCode} ${period}`)
    return []
  }
  const json = await res.json() as { data?: ComtradeRecord[]; count?: number }
  return json.data ?? []
}

async function ingest() {
  console.log('NAUTILUS — Global UN Comtrade Ingest\n')
  console.log('Source: UN Comtrade Public API (export declarations)')
  console.log('Coverage: 2021–2023 | 11 countries | 12 commodity corridors\n')

  let total = 0
  const years = [2021, 2022, 2023]

  for (const reporter of REPORTERS) {
    const hsCodes = COUNTRY_HS[reporter.name] ?? []
    console.log(`\n▸ ${reporter.name} (code ${reporter.code})`)

    for (const hs of hsCodes) {
      console.log(`  HS ${hs.code}: ${hs.commodity}`)
      const portInfo = PORT_ASSIGN[reporter.name]?.[hs.category] ?? { port: reporter.port, unlocode: reporter.unlocode }

      for (const year of years) {
        process.stdout.write(`    ${year}...`)
        const records = await fetchComtrade(reporter.code, hs.code, year)
        process.stdout.write(` ${records.length} records\n`)

        if (records.length === 0) continue

        const rows = records
          .filter(r => r.partnerDesc && r.partnerDesc !== 'World' && (r.primaryValue ?? 0) > 500000)
          .map(r => ({
            exporter_name: `${reporter.name} (Aggregate)`,
            importer_name: r.partnerDesc ?? 'Unknown',
            commodity: hs.commodity,
            commodity_category: hs.category,
            hs_code: hs.code,
            weight_kg: (r.qty ?? 0) * 1000,
            declared_value_usd: r.primaryValue ?? 0,
            origin_country: reporter.name,
            origin_port: null,
            peru_port: portInfo.port,
            peru_port_unlocode: portInfo.unlocode,
            destination_country: r.partnerDesc ?? 'Unknown',
            destination_port: null,
            arrival_time: new Date(year, 0, 1).toISOString(),
            departure_time: null,
            region: reporter.region,
            reporter_country: reporter.name,
            match_method: 'comtrade_annual',
            match_details: {
              data_source: 'un_comtrade',
              granularity: 'annual',
              year,
              partner_code: r.partnerCode,
              reporter_code: reporter.code,
              reporter_name: reporter.name,
              flow: 'export',
            },
            confidence_score: 0.90,
            confidence_tier: 'HIGH',
            provenance: [{
              field: 'trade_value',
              raw_value: String(r.primaryValue),
              source_name: 'un_comtrade',
              source_url: `https://comtradeapi.un.org/public/v1/preview/C/A/HS?reporterCode=${reporter.code}&cmdCode=${hs.code}&flowCode=X&period=${year}`,
              fetch_timestamp: new Date().toISOString(),
              normalized_value: `$${((r.primaryValue ?? 0) / 1e6).toFixed(1)}M`,
            }],
          }))

        if (rows.length === 0) continue

        const BATCH = 20
        for (let i = 0; i < rows.length; i += BATCH) {
          const batch = rows.slice(i, i + BATCH)
          const { error } = await supabase.from('peru_trade_flows').insert(batch)
          if (error) {
            console.warn(`      Insert error: ${error.message.slice(0, 120)}`)
          } else {
            total += batch.length
          }
        }

        // Rate limit — Comtrade is strict
        await new Promise(r => setTimeout(r, 800))
      }
    }
  }

  console.log(`\n✓ Inserted ${total} new rows`)

  const { count } = await supabase
    .from('peru_trade_flows')
    .select('*', { count: 'exact', head: true })
  console.log(`Total rows in peru_trade_flows: ${count}`)

  // Show corridor summary
  const { data: summary } = await supabase
    .from('peru_trade_flows')
    .select('reporter_country, commodity_category')
    .not('reporter_country', 'is', null)
    .not('reporter_country', 'eq', 'Peru')

  const corridors: Record<string, Set<string>> = {}
  for (const r of summary ?? []) {
    const key = r.reporter_country as string
    if (!corridors[key]) corridors[key] = new Set()
    corridors[key].add(r.commodity_category as string)
  }
  console.log('\nGlobal corridors active:')
  for (const [country, cats] of Object.entries(corridors)) {
    console.log(`  ${country}: ${[...cats].join(', ')}`)
  }
}

ingest().catch(console.error)
