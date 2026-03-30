/**
 * NAUTILUS — PortWatch Daily Vessel Data Ingest
 * 
 * Source: IMF PortWatch (free, no API key, updates weekly)
 * ArcGIS Feature Service: Daily_Ports_Data
 * https://services9.arcgis.com/weJ1QsnbMYJlCHdG/arcgis/rest/services/Daily_Ports_Data/FeatureServer/0
 * 
 * Covers all 4 major Peru mining export ports:
 * - Callao (port1045) — Nexa zinc, El Brocal copper
 * - Matarani (port88) — Cerro Verde (Freeport), Las Bambas (MMG)  
 * - Ilo (port1047) — Southern Copper (Toquepala/Cuajone), Quellaveco (Anglo)
 * - Huarmey — Antamina (not in PortWatch — private terminal)
 * 
 * Fields: portcalls, portcalls_dry_bulk, export_dry_bulk (tonnes estimate)
 */

import { createClient } from '@supabase/supabase-js'

const sb = createClient(
  'https://nipwrfsiiajddhisqkex.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5pcHdyZnNpaWFqZGRoaXNxa2V4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTU5NjI0MCwiZXhwIjoyMDg3MTcyMjQwfQ.ubCxPIQ01hy32LJzmAGKSo0lYNwJgUVIVp9zBhgBctQ'
)

const PORTWATCH_API = 'https://services9.arcgis.com/weJ1QsnbMYJlCHdG/arcgis/rest/services/Daily_Ports_Data/FeatureServer/0/query'

const PERU_MINING_PORTS = [
  { portid: 'port1045', name: 'Callao',   unlocode: 'PECLL', primary_exporters: ['Nexa Resources (zinc)', 'El Brocal (copper)'] },
  { portid: 'port88',   name: 'Matarani', unlocode: 'PEMRI', primary_exporters: ['Cerro Verde (Freeport)', 'Las Bambas (MMG)'] },
  { portid: 'port1047', name: 'Ilo',      unlocode: 'PEILO', primary_exporters: ['Southern Copper (Toquepala/Cuajone)', 'Quellaveco (Anglo/Mitsubishi)'] },
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
    headers: { 'User-Agent': 'NAUTILUS/1.0' },
  })
  const d = await res.json() as { features?: PortWatchRecord[] }
  return d.features ?? []
}

async function ingest(daysBack = 90) {
  console.log(`NAUTILUS — PortWatch Daily Vessel Ingest (${daysBack} days)\n`)
  console.log('Source: IMF PortWatch (free, no API key, satellite AIS)\n')

  let inserted = 0

  for (const port of PERU_MINING_PORTS) {
    console.log(`Fetching ${port.name} (${port.portid})...`)
    const records = await fetchPortData(port.portid, daysBack)
    console.log(`  ${records.length} daily records`)

    const rows = records
      .filter(r => r.attributes.portcalls !== null)
      .map(r => {
        const a = r.attributes
        return {
          exporter_name: null,
          importer_name: null,
          commodity: 'Mineral Concentrate (Aggregate)',
          commodity_category: 'port_call_aggregate',
          hs_code: null,
          weight_kg: ((a.export_dry_bulk ?? 0) * 1000) || null, // PortWatch reports in tonnes
          origin_country: 'Peru',
          peru_port: port.name,
          peru_port_unlocode: port.unlocode,
          destination_country: null,
          arrival_time: new Date(a.date).toISOString(),
          match_method: 'portwatch_daily',
          match_details: {
            data_source: 'imf_portwatch',
            portid: port.portid,
            portcalls_total: a.portcalls ?? 0,
            portcalls_dry_bulk: a.portcalls_dry_bulk ?? 0,
            portcalls_tanker: a.portcalls_tanker ?? 0,
            portcalls_container: a.portcalls_container ?? 0,
            export_dry_bulk_tonnes: a.export_dry_bulk ?? 0,
            import_dry_bulk_tonnes: a.import_dry_bulk ?? 0,
            primary_exporters: port.primary_exporters,
            note: 'Daily vessel call counts + estimated trade flow (satellite AIS via UN Global Platform)',
          },
          confidence_score: 0.75, // Port-level aggregates, not vessel-specific
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

    // Insert in batches of 50
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

  // Show recent Callao dry bulk activity
  const { data: recent } = await sb
    .from('peru_trade_flows')
    .select('peru_port, arrival_time, match_details')
    .eq('match_method', 'portwatch_daily')
    .gte('arrival_time', new Date(Date.now() - 14 * 86400000).toISOString())
    .order('arrival_time', { ascending: false })
    .limit(10)

  console.log('\nLast 14 days — PortWatch vessel calls:')
  console.log(`  ${'Date'.padEnd(12)} | ${'Port'.padEnd(10)} | ${'Total'.padEnd(6)} | ${'Dry Bulk'.padEnd(9)} | ${'Export DB Tonnes'.padEnd(18)}`)
  console.log(`  ${'-'.repeat(65)}`)
  for (const r of recent ?? []) {
    const d = r.match_details as Record<string, unknown>
    const dt = (r.arrival_time as string).slice(0, 10)
    const port = (r.peru_port as string).padEnd(10)
    const total = String(d.portcalls_total ?? 0).padEnd(6)
    const db = String(d.portcalls_dry_bulk ?? 0).padEnd(9)
    const exp = String(d.export_dry_bulk_tonnes ?? 0).padEnd(18)
    console.log(`  ${dt} | ${port} | ${total} | ${db} | ${exp}`)
  }
}

ingest(90).catch(console.error)
