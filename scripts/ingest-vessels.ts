/**
 * NAUTILUS — VesselFinder Live Vessel Ingest
 *
 * Source: VesselFinder port pages (free, no API key)
 * Scrapes vessel names, IMO numbers, type, section (expected/in-port/departures)
 * Covers Matarani and Callao — the two highest-volume copper export ports
 *
 * Run: npx tsx scripts/ingest-vessels.ts
 */

import { createClient } from '@supabase/supabase-js'

const sb = createClient(
  'https://nipwrfsiiajddhisqkex.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5pcHdyZnNpaWFqZGRoaXNxa2V4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTU5NjI0MCwiZXhwIjoyMDg3MTcyMjQwfQ.ubCxPIQ01hy32LJzmAGKSo0lYNwJgUVIVp9zBhgBctQ'
)

const PORTS = [
  { name: 'Matarani', unlocode: 'PEMRI', vf_code: 'PEMRI000',
    primary_exporters: ['Cerro Verde (Freeport-McMoRan)', 'Las Bambas (MMG)'],
    commodity: 'Copper Concentrate' },
  { name: 'Callao', unlocode: 'PECLL', vf_code: 'PECLL000',
    primary_exporters: ['Nexa Resources (zinc)', 'El Brocal (Buenaventura)'],
    commodity: 'Zinc/Copper Concentrate' },
]

interface VesselEntry {
  port: string
  unlocode: string
  section: string   // 'in_port' | 'expected' | 'arrived' | 'departed'
  name: string
  type: string
  imo: string
  time: string
  is_bulk: boolean
}

async function scrapePort(portName: string, portCode: string): Promise<VesselEntry[]> {
  const url = `https://www.vesselfinder.com/ports/${portCode}`
  const res = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36' }
  })
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
    if (r.includes('expected') || r.includes('expected')) return 'expected'
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
    const vimo  = imoM?.[1] ?? '?'
    const vtime = timeM?.[1] ?? '?'
    const is_bulk = vtype.includes('Bulk') || vtype.includes('Ore Carrier')

    const key = `${vimo}_${section}`
    if (seen.has(key)) continue
    seen.add(key)

    vessels.push({ port: portName, unlocode: '', section, name: vname, type: vtype, imo: vimo, time: vtime, is_bulk })
  }

  return vessels
}

async function run() {
  console.log('NAUTILUS — VesselFinder Live Vessel Ingest\n')
  console.log(`Source: vesselfinder.com (free, real-time AIS)\n`)

  const now = new Date().toISOString()
  let totalBulk = 0
  let inserted = 0

  for (const port of PORTS) {
    console.log(`Scraping ${port.name}...`)
    const vessels = await scrapePort(port.name, port.vf_code)
    const bulk = vessels.filter(v => v.is_bulk)
    console.log(`  ${vessels.length} vessels, ${bulk.length} bulk carriers`)

    for (const section of ['in_port', 'expected', 'arrived', 'departed']) {
      const sv = bulk.filter(v => v.section === section)
      if (sv.length) {
        const label = section.toUpperCase().replace('_', ' ')
        console.log(`  [${label}]`)
        sv.forEach(v => console.log(`    🔴 ${v.name.padEnd(28)} | IMO:${v.imo.padEnd(9)} | ${v.time}`))
      }
    }

    // Insert each vessel as a trade flow record
    const rows = bulk.map(v => ({
      exporter_name: null,
      importer_name: null,
      commodity: port.commodity,
      commodity_category: 'vessel_call',
      hs_code: null,
      weight_kg: null,
      origin_country: 'Peru',
      peru_port: port.name,
      peru_port_unlocode: port.unlocode,
      destination_country: null,
      arrival_time: now,
      match_method: 'vessel_scrape_live',
      match_details: {
        data_source: 'vesselfinder',
        vessel_name: v.name,
        vessel_imo: v.imo,
        vessel_type: v.type,
        section: v.section,
        reported_time: v.time,
        primary_exporters: port.primary_exporters,
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
    await new Promise(r => setTimeout(r, 500))
  }

  const { count } = await sb.from('peru_trade_flows').select('*', { count: 'exact', head: true })
  console.log(`\n✓ Total bulk carriers tracked: ${totalBulk}`)
  console.log(`✓ Rows inserted: ${inserted}`)
  console.log(`✓ Total rows in DB: ${count}`)
}

run().catch(console.error)
