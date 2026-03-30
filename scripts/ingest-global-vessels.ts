/**
 * NAUTILUS — Global VesselFinder Live Vessel Ingest
 *
 * Source: VesselFinder port pages (free, no API key)
 * Scrapes vessel names, IMO numbers, type, section (expected/in-port/departures)
 *
 * Global ports:
 * - Chile: Antofagasta, Mejillones
 * - Australia: Port Hedland, Newcastle, Gladstone
 * - Brazil: Santos, Tubarão (Vitória), Paranaguá
 * - Indonesia: Samarinda, Balikpapan
 * - South Africa: Richards Bay, Durban
 * - DRC: Matadi
 * - Canada: Vancouver, Prince Rupert
 * - Russia: Novorossiysk
 * - Ukraine: Odessa
 * - Kazakhstan: Aktau
 * - Guinea: Conakry, Kamsar
 *
 * Run: npx tsx scripts/ingest-global-vessels.ts
 */

import { createClient } from '@supabase/supabase-js'

const sb = createClient(
  'https://nipwrfsiiajddhisqkex.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5pcHdyZnNpaWFqZGRoaXNxa2V4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTU5NjI0MCwiZXhwIjoyMDg3MTcyMjQwfQ.ubCxPIQ01hy32LJzmAGKSo0lYNwJgUVIVp9zBhgBctQ'
)

const GLOBAL_PORTS = [
  // Chile — Copper
  { name: 'Antofagasta', country: 'Chile', unlocode: 'CLANT', vf_code: 'CLANT000',
    region: 'South America', commodity: 'Copper Concentrate' },
  { name: 'Mejillones', country: 'Chile', unlocode: 'CLMJS', vf_code: 'CLMJS000',
    region: 'South America', commodity: 'Copper Concentrate' },
  // Australia — Iron Ore + Coal
  { name: 'Port Hedland', country: 'Australia', unlocode: 'AUPHE', vf_code: 'AUPHE000',
    region: 'Oceania', commodity: 'Iron Ore' },
  { name: 'Newcastle', country: 'Australia', unlocode: 'AUNTL', vf_code: 'AUNTL000',
    region: 'Oceania', commodity: 'Coal' },
  { name: 'Gladstone', country: 'Australia', unlocode: 'AUGLT', vf_code: 'AUGLT000',
    region: 'Oceania', commodity: 'Coal' },
  // Brazil — Iron Ore + Soy
  { name: 'Santos', country: 'Brazil', unlocode: 'BRSSZ', vf_code: 'BRSSZ000',
    region: 'South America', commodity: 'Soy / Iron Ore' },
  { name: 'Tubarão', country: 'Brazil', unlocode: 'BRVIX', vf_code: 'BRVIX000',
    region: 'South America', commodity: 'Iron Ore' },
  { name: 'Paranaguá', country: 'Brazil', unlocode: 'BRPNG', vf_code: 'BRPNG000',
    region: 'South America', commodity: 'Soy' },
  // Indonesia — Coal + Nickel
  { name: 'Samarinda', country: 'Indonesia', unlocode: 'IDSMR', vf_code: 'IDSMR000',
    region: 'Asia-Pacific', commodity: 'Coal' },
  { name: 'Balikpapan', country: 'Indonesia', unlocode: 'IDBPN', vf_code: 'IDBPN000',
    region: 'Asia-Pacific', commodity: 'Coal' },
  // South Africa — Coal
  { name: 'Richards Bay', country: 'South Africa', unlocode: 'ZARCB', vf_code: 'ZARCB000',
    region: 'Africa', commodity: 'Coal / Platinum' },
  { name: 'Durban', country: 'South Africa', unlocode: 'ZADUR', vf_code: 'ZADUR000',
    region: 'Africa', commodity: 'Coal' },
  // DRC — Cobalt
  { name: 'Matadi', country: 'DRC', unlocode: 'CDMAT', vf_code: 'CDMAT000',
    region: 'Africa', commodity: 'Cobalt / Copper' },
  // Canada — Potash + Grain
  { name: 'Vancouver', country: 'Canada', unlocode: 'CAVAN', vf_code: 'CAVAN000',
    region: 'North America', commodity: 'Potash / Wheat' },
  { name: 'Prince Rupert', country: 'Canada', unlocode: 'CAPRR', vf_code: 'CAPRR000',
    region: 'North America', commodity: 'Wheat / Corn' },
  // Russia — Grain + Fertilizer
  { name: 'Novorossiysk', country: 'Russia', unlocode: 'RUNVS', vf_code: 'RUNVS000',
    region: 'Europe/FSU', commodity: 'Wheat / Fertilizer' },
  // Ukraine — Grain
  { name: 'Odessa', country: 'Ukraine', unlocode: 'UAODS', vf_code: 'UAODS000',
    region: 'Europe/FSU', commodity: 'Wheat / Corn' },
  // Kazakhstan — Uranium + Grain
  { name: 'Aktau', country: 'Kazakhstan', unlocode: 'KZAKU', vf_code: 'KZAKU000',
    region: 'Europe/FSU', commodity: 'Uranium Ore / Wheat' },
  // Guinea — Bauxite
  { name: 'Conakry', country: 'Guinea', unlocode: 'GNCKY', vf_code: 'GNCKY000',
    region: 'West Africa', commodity: 'Bauxite' },
  { name: 'Kamsar', country: 'Guinea', unlocode: 'GNKMR', vf_code: 'GNKMR000',
    region: 'West Africa', commodity: 'Bauxite' },
]

interface VesselEntry {
  port: string
  country: string
  unlocode: string
  section: string
  name: string
  type: string
  imo: string
  time: string
  is_bulk: boolean
}

async function scrapePort(portName: string, portCode: string, country: string, unlocode: string): Promise<VesselEntry[]> {
  const url = `https://www.vesselfinder.com/ports/${portCode}`
  const res = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36' }
  })

  if (!res.ok) {
    console.warn(`  ${res.status} for ${portName} (${portCode})`)
    return []
  }

  const html = await res.text()

  // Map section positions
  const sectionMap = new Map<number, string>()
  for (const m of html.matchAll(/<h2[^>]*>([^<]+)<\/h2>/g)) {
    sectionMap.set(m.index!, m[1])
  }
  const sectionPositions = [...sectionMap.keys()].sort((a, b) => a - b)

  function getSection(pos: number): string {
    let s = 'Unknown'
    for (const sp of sectionPositions) {
      if (pos > sp) s = sectionMap.get(sp)!
    }
    return s
  }

  function normalizeSection(raw: string): string {
    const r = raw.toLowerCase()
    if (r.includes('in port') || r.includes('ships in')) return 'in_port'
    if (r.includes('expected')) return 'expected'
    if (r.includes('arrival') || r.includes('arrivals')) return 'arrived'
    if (r.includes('departure') || r.includes('departures')) return 'departed'
    return 'unknown'
  }

  const vessels: VesselEntry[] = []
  const seen = new Set<string>()

  for (const m of html.matchAll(/named-title">([^<]+)</g)) {
    const pos = m.index!
    const vname = m[1].trim()
    const rawSection = getSection(pos)
    const section = normalizeSection(rawSection)

    const fwd = html.slice(pos, pos + 200)
    const back = html.slice(Math.max(0, pos - 800), pos)

    const typeM = fwd.match(/named-subtitle">([^<]+)</)
    const imoM = back.match(/\/vessels\/details\/(\d+)/) ?? fwd.match(/\/vessels\/details\/(\d+)/)
    const timeM = back.match(/((?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec) \d+, \d+:\d+)/)

    const vtype = typeM?.[1] ?? '?'
    const vimo = imoM?.[1] ?? '?'
    const vtime = timeM?.[1] ?? '?'
    const is_bulk = vtype.includes('Bulk') || vtype.includes('Ore Carrier') || vtype.includes('General Cargo')

    const key = `${vimo}_${section}`
    if (seen.has(key)) continue
    seen.add(key)

    vessels.push({ port: portName, country, unlocode, section, name: vname, type: vtype, imo: vimo, time: vtime, is_bulk })
  }

  return vessels
}

async function run() {
  console.log('NAUTILUS — Global VesselFinder Live Vessel Ingest\n')
  console.log(`Source: vesselfinder.com (free, real-time AIS)\n`)

  const now = new Date().toISOString()
  let totalBulk = 0
  let inserted = 0

  for (const port of GLOBAL_PORTS) {
    console.log(`Scraping ${port.name} (${port.country})...`)
    const vessels = await scrapePort(port.name, port.vf_code, port.country, port.unlocode)
    const bulk = vessels.filter(v => v.is_bulk)
    console.log(`  ${vessels.length} vessels, ${bulk.length} bulk carriers`)

    for (const section of ['in_port', 'expected', 'arrived', 'departed']) {
      const sv = bulk.filter(v => v.section === section)
      if (sv.length) {
        const label = section.toUpperCase().replace('_', ' ')
        console.log(`  [${label}]`)
        sv.forEach(v => console.log(`    ● ${v.name.padEnd(28)} | IMO:${v.imo.padEnd(9)} | ${v.time}`))
      }
    }

    const rows = bulk.map(v => ({
      exporter_name: null,
      importer_name: null,
      commodity: port.commodity,
      commodity_category: 'vessel_call',
      hs_code: null,
      weight_kg: null,
      origin_country: port.country,
      peru_port: port.name,
      peru_port_unlocode: port.unlocode,
      destination_country: null,
      arrival_time: now,
      region: port.region,
      reporter_country: port.country,
      match_method: 'vessel_scrape_live',
      match_details: {
        data_source: 'vesselfinder',
        vessel_name: v.name,
        vessel_imo: v.imo,
        vessel_type: v.type,
        section: v.section,
        reported_time: v.time,
        country: port.country,
        scraped_at: now,
        note: 'Live vessel position from VesselFinder port page (real AIS)',
      },
      confidence_score: 0.85,
      confidence_tier: 'HIGH',
      provenance: [{
        field: 'vessel_name',
        raw_value: v.name,
        source_name: 'vesselfinder',
        source_url: `https://www.vesselfinder.com/ports/${port.vf_code}`,
        fetch_timestamp: now,
      }],
    }))

    if (rows.length) {
      const { error } = await sb.from('peru_trade_flows').insert(rows)
      if (error) {
        console.warn(`  Insert error: ${error.message.slice(0, 80)}`)
      } else {
        inserted += rows.length
      }
    }

    totalBulk += bulk.length
    await new Promise(r => setTimeout(r, 800))
  }

  const { count } = await sb.from('peru_trade_flows').select('*', { count: 'exact', head: true })
  console.log(`\n✓ Total bulk carriers tracked: ${totalBulk}`)
  console.log(`✓ Rows inserted: ${inserted}`)
  console.log(`✓ Total rows in DB: ${count}`)
}

run().catch(console.error)
