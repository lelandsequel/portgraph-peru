/**
 * NAUTILUS — Global PortWatch Daily Vessel Data Ingest
 *
 * Source: IMF PortWatch (free, no API key, updates weekly)
 * ArcGIS Feature Service: Daily_Ports_Data
 *
 * Covers global commodity corridors:
 * - Chile: Antofagasta, Iquique, Mejillones (copper)
 * - Australia: Port Hedland (iron ore), Newcastle (coal), Gladstone (coal)
 * - Brazil: Santos (soy/iron), Tubarão (iron ore), Paranaguá (soy)
 * - Indonesia: Samarinda (coal), Balikpapan (coal), Morowali (nickel)
 * - South Africa: Richards Bay (coal/platinum), Durban (coal)
 * - DRC: Matadi (cobalt/copper), Boma (cobalt)
 * - Canada: Vancouver (potash/grain), Prince Rupert (grain), Thunder Bay (grain)
 * - Russia: Novorossiysk (grain/fertilizer), Taman (grain), Vladivostok (grain)
 * - Ukraine: Odessa (grain), Chornomorsk (grain), Pivdennyi (grain)
 * - Kazakhstan: Aktau (uranium/grain)
 * - Guinea: Conakry (bauxite), Kamsar (bauxite)
 *
 * Run: npx tsx scripts/ingest-global-portwatch.ts
 */

import { createClient } from '@supabase/supabase-js'

const sb = createClient(
  'https://nipwrfsiiajddhisqkex.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5pcHdyZnNpaWFqZGRoaXNxa2V4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTU5NjI0MCwiZXhwIjoyMDg3MTcyMjQwfQ.ubCxPIQ01hy32LJzmAGKSo0lYNwJgUVIVp9zBhgBctQ'
)

const PORTWATCH_API = 'https://services9.arcgis.com/weJ1QsnbMYJlCHdG/arcgis/rest/services/Daily_Ports_Data/FeatureServer/0/query'

// Step 1: Discover port IDs from PortWatch for our target ports
const GLOBAL_PORTS = [
  // Chile — Copper
  { name: 'Antofagasta', country: 'Chile', unlocode: 'CLANT', region: 'South America', commodities: ['Copper Concentrate'], portid: '' },
  { name: 'Iquique', country: 'Chile', unlocode: 'CLIQQ', region: 'South America', commodities: ['Copper Concentrate'], portid: '' },
  { name: 'Mejillones', country: 'Chile', unlocode: 'CLMJS', region: 'South America', commodities: ['Copper Concentrate'], portid: '' },
  // Australia — Iron Ore + Coal
  { name: 'Port Hedland', country: 'Australia', unlocode: 'AUPHE', region: 'Oceania', commodities: ['Iron Ore'], portid: '' },
  { name: 'Newcastle', country: 'Australia', unlocode: 'AUNTL', region: 'Oceania', commodities: ['Coal'], portid: '' },
  { name: 'Gladstone', country: 'Australia', unlocode: 'AUGLT', region: 'Oceania', commodities: ['Coal', 'LNG'], portid: '' },
  // Brazil — Iron Ore + Soy
  { name: 'Santos', country: 'Brazil', unlocode: 'BRSSZ', region: 'South America', commodities: ['Soy', 'Iron Ore'], portid: '' },
  { name: 'Tubarao', country: 'Brazil', unlocode: 'BRVIX', region: 'South America', commodities: ['Iron Ore'], portid: '' },
  { name: 'Paranagua', country: 'Brazil', unlocode: 'BRPNG', region: 'South America', commodities: ['Soy'], portid: '' },
  // Indonesia — Coal + Nickel
  { name: 'Samarinda', country: 'Indonesia', unlocode: 'IDSMR', region: 'Asia-Pacific', commodities: ['Coal'], portid: '' },
  { name: 'Balikpapan', country: 'Indonesia', unlocode: 'IDBPN', region: 'Asia-Pacific', commodities: ['Coal'], portid: '' },
  // South Africa — Coal + Platinum
  { name: 'Richards Bay', country: 'South Africa', unlocode: 'ZARCB', region: 'Africa', commodities: ['Coal', 'Platinum'], portid: '' },
  { name: 'Durban', country: 'South Africa', unlocode: 'ZADUR', region: 'Africa', commodities: ['Coal'], portid: '' },
  // DRC — Cobalt + Copper
  { name: 'Matadi', country: 'DRC', unlocode: 'CDMAT', region: 'Africa', commodities: ['Cobalt', 'Copper'], portid: '' },
  // Canada — Potash + Grain
  { name: 'Vancouver', country: 'Canada', unlocode: 'CAVAN', region: 'North America', commodities: ['Potash', 'Wheat'], portid: '' },
  { name: 'Prince Rupert', country: 'Canada', unlocode: 'CAPRR', region: 'North America', commodities: ['Wheat', 'Corn'], portid: '' },
  { name: 'Thunder Bay', country: 'Canada', unlocode: 'CATBA', region: 'North America', commodities: ['Wheat'], portid: '' },
  // Russia — Grain + Fertilizer
  { name: 'Novorossiysk', country: 'Russia', unlocode: 'RUNVS', region: 'Europe/FSU', commodities: ['Wheat', 'Fertilizer'], portid: '' },
  { name: 'Taman', country: 'Russia', unlocode: 'RUTMN', region: 'Europe/FSU', commodities: ['Wheat'], portid: '' },
  { name: 'Vladivostok', country: 'Russia', unlocode: 'RUVVO', region: 'Europe/FSU', commodities: ['Wheat'], portid: '' },
  // Ukraine — Grain
  { name: 'Odessa', country: 'Ukraine', unlocode: 'UAODS', region: 'Europe/FSU', commodities: ['Wheat', 'Corn'], portid: '' },
  { name: 'Chornomorsk', country: 'Ukraine', unlocode: 'UACHS', region: 'Europe/FSU', commodities: ['Wheat', 'Corn'], portid: '' },
  { name: 'Pivdennyi', country: 'Ukraine', unlocode: 'UAPIV', region: 'Europe/FSU', commodities: ['Wheat', 'Soy'], portid: '' },
  // Kazakhstan — Uranium + Grain
  { name: 'Aktau', country: 'Kazakhstan', unlocode: 'KZAKU', region: 'Europe/FSU', commodities: ['Uranium Ore', 'Wheat'], portid: '' },
  // Guinea — Bauxite
  { name: 'Conakry', country: 'Guinea', unlocode: 'GNCKY', region: 'West Africa', commodities: ['Bauxite'], portid: '' },
  { name: 'Kamsar', country: 'Guinea', unlocode: 'GNKMR', region: 'West Africa', commodities: ['Bauxite'], portid: '' },
  // Phase 5 — Destination hubs
  { name: 'Qingdao', country: 'China', unlocode: 'CNQIN', region: 'Asia-Pacific', commodities: ['Iron Ore', 'Coal', 'Copper'], portid: '' },
  { name: 'Tianjin', country: 'China', unlocode: 'CNTJN', region: 'Asia-Pacific', commodities: ['Iron Ore', 'Coal'], portid: '' },
  { name: 'Shanghai', country: 'China', unlocode: 'CNSHA', region: 'Asia-Pacific', commodities: ['Copper', 'Soy', 'LNG'], portid: '' },
  { name: 'Ningbo', country: 'China', unlocode: 'CNNGB', region: 'Asia-Pacific', commodities: ['Iron Ore', 'Copper'], portid: '' },
  { name: 'Guangzhou', country: 'China', unlocode: 'CNGZH', region: 'Asia-Pacific', commodities: ['Coal', 'LNG', 'Nickel'], portid: '' },
  { name: 'Paradip', country: 'India', unlocode: 'INPRT', region: 'Asia-Pacific', commodities: ['Coal', 'Iron Ore'], portid: '' },
  { name: 'Visakhapatnam', country: 'India', unlocode: 'INVTZ', region: 'Asia-Pacific', commodities: ['Coal', 'Manganese'], portid: '' },
  { name: 'Kandla', country: 'India', unlocode: 'INKDL', region: 'Asia-Pacific', commodities: ['Coal', 'Phosphate'], portid: '' },
  { name: 'Mumbai', country: 'India', unlocode: 'INBOM', region: 'Asia-Pacific', commodities: ['Crude Oil', 'LNG'], portid: '' },
  { name: 'Nagoya', country: 'Japan', unlocode: 'JPNGO', region: 'Asia-Pacific', commodities: ['Iron Ore', 'Coal', 'LNG'], portid: '' },
  { name: 'Kobe', country: 'Japan', unlocode: 'JPUKB', region: 'Asia-Pacific', commodities: ['Copper', 'Iron Ore'], portid: '' },
  { name: 'Yokohama', country: 'Japan', unlocode: 'JPYOK', region: 'Asia-Pacific', commodities: ['LNG', 'Iron Ore'], portid: '' },
  { name: 'Pohang', country: 'South Korea', unlocode: 'KRPOH', region: 'Asia-Pacific', commodities: ['Iron Ore', 'Coal'], portid: '' },
  { name: 'Gwangyang', country: 'South Korea', unlocode: 'KRKWG', region: 'Asia-Pacific', commodities: ['Iron Ore', 'Coal'], portid: '' },
  { name: 'Busan', country: 'South Korea', unlocode: 'KRPUS', region: 'Asia-Pacific', commodities: ['Coal', 'LNG'], portid: '' },
  { name: 'Rotterdam', country: 'Netherlands', unlocode: 'NLRTM', region: 'Europe/FSU', commodities: ['Iron Ore', 'Coal', 'LNG', 'Crude Oil'], portid: '' },
  { name: 'Hamburg', country: 'Germany', unlocode: 'DEHAM', region: 'Europe/FSU', commodities: ['Coal', 'Iron Ore', 'Copper'], portid: '' },
  // Phase 5 — New supply corridors
  { name: 'Puerto Bolivar', country: 'Colombia', unlocode: 'COPBO', region: 'South America', commodities: ['Coal'], portid: '' },
  { name: 'Barranquilla', country: 'Colombia', unlocode: 'COBAQ', region: 'South America', commodities: ['Coal'], portid: '' },
  { name: 'Narvik', country: 'Norway', unlocode: 'NONVK', region: 'Europe/FSU', commodities: ['Iron Ore'], portid: '' },
  { name: 'Noumea', country: 'New Caledonia', unlocode: 'NCNOU', region: 'Oceania', commodities: ['Nickel'], portid: '' },
  { name: 'Beira', country: 'Mozambique', unlocode: 'MZBEW', region: 'Africa', commodities: ['Coal'], portid: '' },
  { name: 'Nacala', country: 'Mozambique', unlocode: 'MZMNC', region: 'Africa', commodities: ['Coal', 'LNG'], portid: '' },
  { name: 'Dar es Salaam', country: 'Tanzania', unlocode: 'TZDAR', region: 'Africa', commodities: ['Copper'], portid: '' },
  { name: 'Buenos Aires', country: 'Argentina', unlocode: 'ARBUE', region: 'South America', commodities: ['Lithium', 'Soy'], portid: '' },
  { name: 'Rosario', country: 'Argentina', unlocode: 'ARROS', region: 'South America', commodities: ['Soy'], portid: '' },
  { name: 'Bonny', country: 'Nigeria', unlocode: 'NGBON', region: 'West Africa', commodities: ['LNG', 'Crude Oil'], portid: '' },
  { name: 'Lagos', country: 'Nigeria', unlocode: 'NGLOS', region: 'West Africa', commodities: ['Crude Oil'], portid: '' },
  { name: 'Luanda', country: 'Angola', unlocode: 'AOLAD', region: 'Africa', commodities: ['Crude Oil', 'LNG'], portid: '' },
  { name: 'Soyo', country: 'Angola', unlocode: 'AOSOY', region: 'Africa', commodities: ['LNG'], portid: '' },
  { name: 'Ras Laffan', country: 'Qatar', unlocode: 'QARAF', region: 'Middle East', commodities: ['LNG'], portid: '' },
  { name: 'Yangon', country: 'Myanmar', unlocode: 'MMRGN', region: 'Asia-Pacific', commodities: ['Rare Earths'], portid: '' },
  { name: 'Surigao', country: 'Philippines', unlocode: 'PHSUG', region: 'Asia-Pacific', commodities: ['Nickel'], portid: '' },
  { name: 'General Santos', country: 'Philippines', unlocode: 'PHGSA', region: 'Asia-Pacific', commodities: ['Nickel'], portid: '' },
]

interface PortWatchRecord {
  attributes: {
    portid: string
    portname: string
    date: string
    portcalls: number | null
    portcalls_dry_bulk: number | null
    portcalls_tanker: number | null
    portcalls_container: number | null
    export_dry_bulk: number | null
    import_dry_bulk: number | null
  }
}

async function discoverPortIds(): Promise<void> {
  console.log('Discovering port IDs from PortWatch...\n')

  const params = new URLSearchParams({
    where: '1=1',
    outFields: 'portid,portname,country',
    f: 'json',
    resultRecordCount: '2000',
    returnDistinctValues: 'true',
  })

  const res = await fetch(`${PORTWATCH_API}?${params}`, {
    headers: { 'User-Agent': 'NAUTILUS/2.0' },
  })
  const data = await res.json() as { features?: { attributes: { portid: string; portname: string; country?: string } }[] }
  const allPorts = data.features ?? []

  console.log(`  Found ${allPorts.length} ports in PortWatch\n`)

  // Match each target port by name (fuzzy)
  for (const target of GLOBAL_PORTS) {
    const nameLower = target.name.toLowerCase().replace(/[^a-z]/g, '')
    const match = allPorts.find(p => {
      const pname = (p.attributes.portname || '').toLowerCase().replace(/[^a-z]/g, '')
      return pname.includes(nameLower) || nameLower.includes(pname)
    })
    if (match) {
      target.portid = match.attributes.portid
      console.log(`  ✓ ${target.name} → ${match.attributes.portid} (${match.attributes.portname})`)
    } else {
      console.log(`  ✗ ${target.name} — not found in PortWatch (will skip)`)
    }
  }
  console.log('')
}

async function fetchPortData(portid: string, daysBack = 90): Promise<PortWatchRecord[]> {
  const since = new Date()
  since.setDate(since.getDate() - daysBack)
  const sinceStr = since.toISOString().slice(0, 10)

  const params = new URLSearchParams({
    where: `portid='${portid}' AND date >= DATE '${sinceStr}'`,
    outFields: 'portid,portname,date,portcalls,portcalls_dry_bulk,portcalls_tanker,portcalls_container,export_dry_bulk,import_dry_bulk',
    orderByFields: 'date DESC',
    resultRecordCount: '200',
    f: 'json',
  })

  const res = await fetch(`${PORTWATCH_API}?${params}`, {
    headers: { 'User-Agent': 'NAUTILUS/2.0' },
  })
  const d = await res.json() as { features?: PortWatchRecord[] }
  return d.features ?? []
}

async function ingest(daysBack = 90) {
  console.log(`NAUTILUS — Global PortWatch Daily Vessel Ingest (${daysBack} days)\n`)
  console.log('Source: IMF PortWatch (free, no API key, satellite AIS)\n')

  await discoverPortIds()

  let inserted = 0
  const activePorts = GLOBAL_PORTS.filter(p => p.portid)

  for (const port of activePorts) {
    console.log(`Fetching ${port.name} (${port.country}, ${port.portid})...`)
    const records = await fetchPortData(port.portid, daysBack)
    console.log(`  ${records.length} daily records`)

    const rows = records
      .filter(r => r.attributes.portcalls !== null)
      .map(r => {
        const a = r.attributes
        return {
          exporter_name: null,
          importer_name: null,
          commodity: port.commodities.join(' / '),
          commodity_category: 'port_call_aggregate',
          hs_code: null,
          weight_kg: ((a.export_dry_bulk ?? 0) * 1000) || null,
          origin_country: port.country,
          peru_port: port.name,
          peru_port_unlocode: port.unlocode,
          destination_country: null,
          arrival_time: new Date(a.date).toISOString(),
          region: port.region,
          reporter_country: port.country,
          match_method: 'portwatch_daily',
          match_details: {
            data_source: 'imf_portwatch',
            portid: port.portid,
            country: port.country,
            portcalls_total: a.portcalls ?? 0,
            portcalls_dry_bulk: a.portcalls_dry_bulk ?? 0,
            portcalls_tanker: a.portcalls_tanker ?? 0,
            portcalls_container: a.portcalls_container ?? 0,
            export_dry_bulk_tonnes: a.export_dry_bulk ?? 0,
            import_dry_bulk_tonnes: a.import_dry_bulk ?? 0,
            primary_commodities: port.commodities,
            note: 'Daily vessel call counts + estimated trade flow (satellite AIS via UN Global Platform)',
          },
          confidence_score: 0.75,
          confidence_tier: 'HIGH',
          provenance: [{
            field: 'portcalls_dry_bulk',
            raw_value: String(a.portcalls_dry_bulk ?? 0),
            source_name: 'imf_portwatch',
            source_url: 'https://portwatch.imf.org',
            fetch_timestamp: new Date().toISOString(),
          }],
        }
      })

    if (rows.length === 0) continue

    const BATCH = 50
    for (let i = 0; i < rows.length; i += BATCH) {
      const batch = rows.slice(i, i + BATCH)
      const { error } = await sb.from('peru_trade_flows').insert(batch)
      if (error) {
        console.warn(`  Batch insert error: ${error.message.slice(0, 80)}`)
      } else {
        inserted += batch.length
      }
    }

    console.log(`  ✓ ${rows.length} rows inserted for ${port.name}`)
    await new Promise(r => setTimeout(r, 500))
  }

  console.log(`\n✓ Total inserted: ${inserted}`)

  const { count } = await sb.from('peru_trade_flows').select('*', { count: 'exact', head: true })
  console.log(`Total rows in DB: ${count}`)
}

ingest(90).catch(console.error)
