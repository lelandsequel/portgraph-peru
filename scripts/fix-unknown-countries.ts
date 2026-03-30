/**
 * Fix Unknown country rows — OEC used "Country" not "Importer Country" field name
 * Delete Unknown rows, re-fetch with correct field, re-insert
 */
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'https://nipwrfsiiajddhisqkex.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5pcHdyZnNpaWFqZGRoaXNxa2V4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTU5NjI0MCwiZXhwIjoyMDg3MTcyMjQwfQ.ubCxPIQ01hy32LJzmAGKSo0lYNwJgUVIVp9zBhgBctQ'
)

const HS_TARGETS = [
  { code: '2603', commodity: 'Copper Ore/Concentrate', category: 'copper_ore', oecId: 52603 },
  { code: '2608', commodity: 'Zinc Ore/Concentrate',   category: 'zinc_ore',   oecId: 52608 },
  { code: '2607', commodity: 'Lead Ore/Concentrate',   category: 'lead_ore',   oecId: 52607 },
]

const PORT_ASSIGN: Record<string, string> = {
  copper_ore: 'Callao', copper_matte: 'Callao', refined_copper: 'Callao',
  zinc_ore: 'Matarani', lead_ore: 'Matarani',
}
const PORT_CODE: Record<string, string> = {
  Callao: 'PECLL', Matarani: 'PEMRI',
}

async function run() {
  // Step 1: Delete all Unknown rows
  console.log('Deleting Unknown country rows...')
  const { count: delCount, error: delErr } = await supabase
    .from('peru_trade_flows')
    .delete({ count: 'exact' })
    .eq('destination_country', 'Unknown')
  if (delErr) { console.error('Delete error:', delErr.message); process.exit(1) }
  console.log(`Deleted ${delCount} Unknown rows`)

  // Step 2: Re-fetch OEC with correct field name
  let inserted = 0
  for (const hs of HS_TARGETS) {
    const port = PORT_ASSIGN[hs.category] ?? 'Callao'
    const unlocode = PORT_CODE[port]

    for (const year of [2023, 2024]) {
      const url = `https://api.oec.world/tesseract/data.jsonrecords?cube=trade_i_baci_a_92&drilldowns=Importer+Country,HS4,Year&measures=Trade+Value,Quantity&Exporter+Country=saper&HS4=${hs.oecId}&Year=${year}`
      console.log(`  Fetching HS${hs.code} ${year}...`)

      const res = await fetch(url, { headers: { Accept: 'application/json' } })
      if (!res.ok) { console.warn(`    ${res.status}`); continue }
      const json = await res.json() as { data?: Record<string, unknown>[] }
      const records = json.data ?? []
      console.log(`    ${records.length} records`)

      const rows = records
        .filter((r: Record<string, unknown>) => (r['Trade Value'] as number) > 1000000)
        .map((r: Record<string, unknown>) => {
          const countryName = (r['Country'] as string) ?? 'Unknown'
          const countryId   = (r['Country ID'] as string) ?? ''
          return {
            exporter_name: 'Peru (Aggregate)',
            importer_name: countryName,
            commodity: hs.commodity,
            commodity_category: hs.category,
            hs_code: hs.code,
            weight_kg: ((r['Quantity'] as number) ?? 0) * 1000,
            declared_value_usd: (r['Trade Value'] as number) ?? 0,
            origin_country: 'Peru',
            peru_port: port,
            peru_port_unlocode: unlocode,
            destination_country: countryName,
            arrival_time: new Date(year, 0, 1).toISOString(),
            match_method: 'oec_baci_annual',
            match_details: {
              data_source: 'oec_baci',
              granularity: 'annual',
              year,
              oec_country_id: countryId,
              port_assignment: `probable_${port.toLowerCase()}`,
            },
            confidence_score: 0.85,
            confidence_tier: 'HIGH',
            provenance: [{
              field: 'trade_value',
              raw_value: String(r['Trade Value']),
              source_name: 'oec_baci',
              source_url: url,
              fetch_timestamp: new Date().toISOString(),
            }],
          }
        })

      if (rows.length === 0) continue
      const { error } = await supabase.from('peru_trade_flows').insert(rows)
      if (error) {
        console.warn(`    Insert error: ${error.message.slice(0, 100)}`)
      } else {
        inserted += rows.length
        console.log(`    ✓ ${rows.length} inserted`)
      }

      await new Promise(r => setTimeout(r, 800))
    }
  }

  console.log(`\nInserted ${inserted} rows with real country names`)

  // Final count + sample
  const { count } = await supabase.from('peru_trade_flows').select('*', { count: 'exact', head: true })
  console.log(`Total rows: ${count}`)

  const { data: sample } = await supabase
    .from('peru_trade_flows')
    .select('destination_country, commodity, declared_value_usd, arrival_time')
    .neq('destination_country', 'Unknown')
    .order('declared_value_usd', { ascending: false })
    .limit(8)

  console.log('\nTop flows by value:')
  for (const r of sample ?? []) {
    const yr = (r.arrival_time as string).slice(0, 4)
    const val = `$${((r.declared_value_usd as number) / 1e9).toFixed(2)}B`
    console.log(`  ${yr} | ${r.destination_country?.padEnd(15)} | ${(r.commodity as string).padEnd(28)} | ${val}`)
  }
}

run().catch(console.error)
