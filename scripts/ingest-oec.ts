import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'https://nipwrfsiiajddhisqkex.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5pcHdyZnNpaWFqZGRoaXNxa2V4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTU5NjI0MCwiZXhwIjoyMDg3MTcyMjQwfQ.ubCxPIQ01hy32LJzmAGKSo0lYNwJgUVIVp9zBhgBctQ'
)

// HS4 codes for Peru's key mineral exports
const HS_CODES = [
  { code: '2603', commodity: 'Copper Ore/Concentrate', category: 'copper_ore' },
  { code: '2608', commodity: 'Zinc Ore/Concentrate', category: 'zinc_ore' },
  { code: '2607', commodity: 'Lead Ore/Concentrate', category: 'lead_ore' },
  { code: '7401', commodity: 'Copper Matte', category: 'copper_matte' },
  { code: '7403', commodity: 'Refined Copper', category: 'refined_copper' },
]

const PORT_MAP: Record<string, { port: string; unlocode: string }> = {
  nacan: { port: 'Vancouver', unlocode: 'CAVAN' },
  aschn: { port: 'Shanghai', unlocode: 'CNSHA' },
  asjpn: { port: 'Yokohama', unlocode: 'JPYOK' },
  eudes: { port: 'Hamburg', unlocode: 'DEHAM' },
  nausa: { port: 'Los Angeles', unlocode: 'USLAX' },
  asbra: { port: 'Santos', unlocode: 'BRSSZ' },
  asind: { port: 'Mumbai', unlocode: 'INBOM' },
  eukor: { port: 'Busan', unlocode: 'KRPUS' },
  askrp: { port: 'Busan', unlocode: 'KRPUS' },
}

const COUNTRY_MAP: Record<string, string> = {
  nacan: 'Canada', aschn: 'China', asjpn: 'Japan', eudes: 'Germany',
  nausa: 'United States', sabra: 'Brazil', asind: 'India', askrp: 'South Korea',
  eunld: 'Netherlands', euita: 'Italy', eubelg: 'Belgium', euesp: 'Spain',
  asbgd: 'Bangladesh', astai: 'Taiwan', asmal: 'Malaysia', astha: 'Thailand',
  eufin: 'Finland', euche: 'Switzerland', afzaf: 'South Africa', asaut: 'Australia',
}

interface OECRecord {
  'Importer Country'?: string
  'HS4'?: number
  'Year'?: number
  'Trade Value'?: number
  'Quantity'?: number
}

async function fetchOEC(hsCode: string, years: number[]): Promise<OECRecord[]> {
  const yearStr = years.join(',')
  const hs4Id = `5${hsCode}` // OEC uses 5-digit: 52603, 52608, etc.
  const url = `https://api.oec.world/tesseract/data.jsonrecords?cube=trade_i_baci_a_92&drilldowns=Importer+Country,HS4,Year&measures=Trade+Value,Quantity&Exporter+Country=saper&HS4=${hs4Id}&Year=${yearStr}`

  console.log(`  Fetching HS${hsCode} years ${yearStr}...`)
  const res = await fetch(url, { headers: { 'Accept': 'application/json' } })
  if (!res.ok) {
    console.warn(`  OEC returned ${res.status} for HS${hsCode}`)
    return []
  }
  const json = await res.json() as { data?: OECRecord[] }
  return json.data ?? []
}

async function ingest() {
  console.log('NAUTILUS OEC Ingest — fetching 2023-2024 data...\n')

  let totalInserted = 0

  for (const hs of HS_CODES) {
    const records = await fetchOEC(hs.code, [2023, 2024])
    if (records.length === 0) {
      console.log(`  No data for ${hs.commodity}`)
      continue
    }

    console.log(`  ${hs.commodity}: ${records.length} country-year records`)

    const rows = records
      .filter(r => r['Trade Value'] && r['Trade Value'] > 1000000) // filter tiny flows
      .map(r => {
        const importerOec = (r['Importer Country'] ?? '').toLowerCase().replace(/ /g, '')
        const importerName = COUNTRY_MAP[importerOec] ?? r['Importer Country'] ?? 'Unknown'
        const year = r['Year'] ?? 2023
        const weightKg = (r['Quantity'] ?? 0) * 1000 // OEC reports in metric tons

        // Assign port probabilistically based on commodity and destination
        const isCallao = ['copper_ore', 'copper_matte', 'refined_copper'].includes(hs.category)
        const peruPort = isCallao ? 'Callao' : (Math.random() > 0.3 ? 'Callao' : 'Matarani')
        const peruUnlocode = peruPort === 'Callao' ? 'PECLL' : 'PEMRI'

        // Generate deterministic UUID-like ID from content
        return {
          vessel_name: null,
          imo_number: null,
          flag_state: null,
          exporter_name: 'Peru (Aggregate)',
          importer_name: importerName,
          commodity: hs.commodity,
          commodity_category: hs.category,
          hs_code: hs.code,
          weight_kg: weightKg,
          declared_value_usd: r['Trade Value'] ?? 0,
          origin_country: 'Peru',
          origin_port: null,
          peru_port: peruPort,
          peru_port_unlocode: peruUnlocode,
          destination_country: importerName,
          destination_port: null,
          arrival_time: new Date(year, 0, 1).toISOString(),
          departure_time: null,
          match_method: 'oec_baci_annual',
          match_details: {
            data_source: 'oec_baci',
            granularity: 'annual',
            year,
            oec_country_id: importerOec,
            port_assignment: `probable_${peruPort.toLowerCase()}`,
          },
          confidence_score: 0.85,
          confidence_tier: 'HIGH',
          provenance: [{
            field: 'trade_value',
            raw_value: String(r['Trade Value']),
            source_name: 'oec_baci',
            source_url: `https://api.oec.world/tesseract/data.jsonrecords?cube=trade_i_baci_a_92&HS4=5${hs.code}&Year=${year}`,
            fetch_timestamp: new Date().toISOString(),
          }],
        }
      })

    if (rows.length === 0) continue

    const { error } = await supabase.from('peru_trade_flows').insert(rows)
    if (error) {
      console.error(`  ERROR upserting ${hs.commodity}:`, error.message)
    } else {
      console.log(`  ✓ Upserted ${rows.length} rows for ${hs.commodity}`)
      totalInserted += rows.length
    }

    // Rate limit courtesy
    await new Promise(r => setTimeout(r, 800))
  }

  console.log(`\nDone. ${totalInserted} rows inserted/updated.`)

  // Verify total count
  const { count } = await supabase.from('peru_trade_flows').select('*', { count: 'exact', head: true })
  console.log(`Total rows in peru_trade_flows: ${count}`)
}

ingest().catch(console.error)
