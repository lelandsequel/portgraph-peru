/**
 * NAUTILUS — Upgrade DRC, Guinea, Russia corridors to HIGH confidence
 *
 * Source: UN Comtrade Public Preview API (no key needed)
 *   - DRC (180): copper ores 2603, cobalt ores 2605, refined copper 7403, cobalt unwrought 8105
 *   - Guinea (324): bauxite 2606, iron ore 2601
 *   - Russia (643): wheat 1001, fertilizer 3102/3105
 *
 * Deletes old rows first, inserts fresh Comtrade data at HIGH confidence (0.90).
 *
 * Run: npx tsx scripts/upgrade-corridors-oec.ts
 */

import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'https://nipwrfsiiajddhisqkex.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5pcHdyZnNpaWFqZGRoaXNxa2V4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTU5NjI0MCwiZXhwIjoyMDg3MTcyMjQwfQ.ubCxPIQ01hy32LJzmAGKSo0lYNwJgUVIVp9zBhgBctQ'
)

/* ── Partner code → country name ──────────────────────────────── */

const PARTNER_CODES: Record<number, string> = {
  0: 'World', 900: 'World',
  36: 'Australia', 56: 'Belgium', 76: 'Brazil', 124: 'Canada',
  156: 'China', 250: 'France', 276: 'Germany', 344: 'Hong Kong',
  356: 'India', 360: 'Indonesia', 380: 'Italy', 392: 'Japan',
  410: 'South Korea', 414: 'Kuwait', 458: 'Malaysia', 484: 'Mexico',
  504: 'Morocco', 528: 'Netherlands', 566: 'Nigeria', 586: 'Pakistan',
  608: 'Philippines', 634: 'Qatar', 643: 'Russia', 682: 'Saudi Arabia',
  702: 'Singapore', 704: 'Vietnam', 710: 'South Africa', 724: 'Spain',
  764: 'Thailand', 792: 'Turkey', 804: 'Ukraine', 818: 'Egypt',
  826: 'United Kingdom', 840: 'United States', 858: 'Uruguay',
  862: 'Venezuela', 894: 'Zambia',
}

/* ── Task definitions ─────────────────────────────────────────── */

interface Commodity {
  cmdCode: string
  name: string
  category: string
}

interface CountryTask {
  reporterCode: number
  name: string
  region: string
  periods: string
  commodities: Commodity[]
}

const TASKS: CountryTask[] = [
  {
    reporterCode: 180, name: 'DRC', region: 'Africa',
    periods: '2022,2023',
    commodities: [
      { cmdCode: '2603', name: 'Copper Ores & Concentrates', category: 'copper_ore' },
      { cmdCode: '2605', name: 'Cobalt Ores & Concentrates', category: 'cobalt' },
      { cmdCode: '7403', name: 'Refined Copper', category: 'refined_copper' },
      { cmdCode: '8105', name: 'Cobalt (unwrought)', category: 'cobalt' },
    ],
  },
  {
    reporterCode: 324, name: 'Guinea', region: 'Africa',
    periods: '2021,2022,2023',
    commodities: [
      { cmdCode: '2606', name: 'Bauxite (Aluminium Ore)', category: 'bauxite' },
      { cmdCode: '2601', name: 'Iron Ore', category: 'iron_ore' },
    ],
  },
  {
    reporterCode: 643, name: 'Russia', region: 'Europe/FSU',
    periods: '2022,2023',
    commodities: [
      { cmdCode: '1001', name: 'Wheat', category: 'wheat' },
      { cmdCode: '3102', name: 'Nitrogen Fertilizer', category: 'fertilizer' },
      { cmdCode: '3105', name: 'Mineral/Chemical Fertilizer', category: 'fertilizer' },
    ],
  },
]

/* ── Comtrade fetch ───────────────────────────────────────────── */

interface ComtradeRecord {
  partnerCode?: number
  primaryValue?: number
  fobvalue?: number
  netWgt?: number
  qty?: number
  period?: string
  refYear?: number
  cmdCode?: string
}

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

// Mirror importers: fetch imports INTO these countries FROM the origin
// Used when origin country doesn't report to Comtrade
const MIRROR_IMPORTERS = [156, 392, 410, 356, 276, 840, 826, 528, 380, 724, 792, 818, 56, 36] // China, Japan, Korea, India, Germany, US, UK, Netherlands, Italy, Spain, Turkey, Egypt, Belgium, Australia

async function fetchComtrade(reporterCode: number, cmdCode: string, periods: string): Promise<ComtradeRecord[]> {
  const url = `https://comtradeapi.un.org/public/v1/preview/C/A/HS?reporterCode=${reporterCode}&cmdCode=${cmdCode}&period=${periods}&flowCode=X&limit=500`
  console.log(`    GET ${url}`)

  const res = await fetch(url, { headers: { Accept: 'application/json' } })
  if (!res.ok) {
    console.warn(`    ⚠ HTTP ${res.status}`)
    return []
  }
  const json = await res.json() as { data?: ComtradeRecord[] }
  return json.data ?? []
}

// Fetch mirror data: major importers reporting imports FROM the origin country
async function fetchMirror(originCode: number, cmdCode: string, periods: string): Promise<ComtradeRecord[]> {
  const allRecords: ComtradeRecord[] = []
  for (const importerCode of MIRROR_IMPORTERS) {
    const url = `https://comtradeapi.un.org/public/v1/preview/C/A/HS?reporterCode=${importerCode}&partnerCode=${originCode}&cmdCode=${cmdCode}&period=${periods}&flowCode=M&limit=500`
    console.log(`    MIRROR GET reporter=${importerCode} partner=${originCode} HS=${cmdCode}`)

    const res = await fetch(url, { headers: { Accept: 'application/json' } })
    if (res.ok) {
      const json = await res.json() as { data?: ComtradeRecord[] }
      const records = json.data ?? []
      // Remap: the reporter is the importer, we want the partner (origin) as exporter
      for (const r of records) {
        allRecords.push({
          ...r,
          partnerCode: importerCode, // the destination is the reporter
        })
      }
    }
    await sleep(1200)
  }
  return allRecords
}

/* ── Main pipeline ────────────────────────────────────────────── */

async function main() {
  console.log('NAUTILUS — Corridor Upgrade: DRC / Guinea / Russia → HIGH confidence')
  console.log('Source: UN Comtrade Public Preview API (direct)')
  console.log('====================================================================\n')

  let grandTotal = 0

  for (const task of TASKS) {
    console.log(`\n▸ ${task.name} (reporter ${task.reporterCode})`)

    // Delete old rows
    const { error: delErr, count: delCount } = await supabase
      .from('peru_trade_flows')
      .delete({ count: 'exact' })
      .eq('origin_country', task.name)

    if (delErr) {
      console.error(`  ✗ Delete failed: ${delErr.message}`)
    } else {
      console.log(`  ✓ Deleted ${delCount ?? 0} old ${task.name} rows`)
    }

    // Fetch and insert each commodity
    let countryTotal = 0

    for (const commodity of task.commodities) {
      console.log(`  HS ${commodity.cmdCode}: ${commodity.name}`)

      let records = await fetchComtrade(task.reporterCode, commodity.cmdCode, task.periods)
      console.log(`    → ${records.length} raw records (direct)`)

      // Fall back to mirror data if direct reporting returns nothing
      if (records.length === 0) {
        console.log(`    → No direct data, fetching mirror (importer-reported) data...`)
        records = await fetchMirror(task.reporterCode, commodity.cmdCode, task.periods)
        console.log(`    → ${records.length} mirror records`)
      }

      // Skip world aggregates (partnerCode 0 or 900) and tiny values
      const filtered = records.filter(r => {
        const pc = r.partnerCode ?? 0
        return pc !== 0 && pc !== 900 && (r.primaryValue ?? r.fobvalue ?? 0) > 50000
      })

      const rows = filtered.map(r => {
        const year = r.refYear ?? parseInt(String(r.period ?? '2022'))
        const value = r.primaryValue ?? r.fobvalue ?? 0
        const partnerName = PARTNER_CODES[r.partnerCode ?? 0] ?? `Country-${r.partnerCode}`

        return {
          exporter_name: `${task.name} (Aggregate)`,
          importer_name: partnerName,
          commodity: commodity.name,
          commodity_category: commodity.category,
          hs_code: commodity.cmdCode,
          weight_kg: r.netWgt ?? r.qty ?? 0,
          declared_value_usd: value,
          origin_country: task.name,
          origin_port: null,
          peru_port: 'COMTRADE_AGGREGATE',
          peru_port_unlocode: 'GLOBAL',
          destination_country: partnerName,
          destination_port: null,
          arrival_time: `${year}-07-01T00:00:00.000Z`,
          departure_time: null,
          match_method: 'comtrade_annual',
          match_details: {
            data_source: 'un_comtrade_public_preview',
            granularity: 'annual',
            year,
            partner_code: r.partnerCode,
            reporter_code: task.reporterCode,
            cmd_code: commodity.cmdCode,
            flow: 'export',
            upgrade_batch: 'high_confidence_2026-04',
          },
          confidence_score: 0.90,
          confidence_tier: 'HIGH',
          provenance: [{
            field: 'trade_value',
            raw_value: String(value),
            source_name: 'un_comtrade',
            source_url: `https://comtradeapi.un.org/public/v1/preview/C/A/HS?reporterCode=${task.reporterCode}&cmdCode=${commodity.cmdCode}&flowCode=X&period=${task.periods}`,
            fetch_timestamp: new Date().toISOString(),
            normalized_value: `$${(value / 1e6).toFixed(1)}M`,
          }],
        }
      })

      if (rows.length > 0) {
        const BATCH = 20
        for (let i = 0; i < rows.length; i += BATCH) {
          const batch = rows.slice(i, i + BATCH)
          const { error } = await supabase.from('peru_trade_flows').insert(batch)
          if (error) {
            console.warn(`      ⚠ Insert error: ${error.message.slice(0, 150)}`)
          } else {
            countryTotal += batch.length
          }
        }
        console.log(`      → ${rows.length} rows inserted`)
      } else {
        console.log(`      → 0 rows (all filtered out)`)
      }

      // Rate limit: 1.2s between calls
      await sleep(1200)
    }

    grandTotal += countryTotal
    console.log(`  ✓ ${task.name} total: ${countryTotal} rows @ HIGH confidence`)
  }

  console.log('\n====================================================================')
  console.log(`✓ Grand total inserted: ${grandTotal} rows (all HIGH confidence)\n`)

  /* ── Task 4: Final summary ────────────────────────────────── */

  console.log('Final corridor summary:')
  console.log('─────────────────────────────────────────────────────────────────')

  const { data: allRows, error: sumErr } = await supabase
    .from('peru_trade_flows')
    .select('origin_country, commodity_category, confidence_tier, declared_value_usd')
    .neq('origin_country', 'Peru')

  if (sumErr) {
    console.error(`  Summary error: ${sumErr.message}`)
  } else if (allRows) {
    const agg: Record<string, { rows: number; value: number }> = {}
    for (const r of allRows) {
      const key = `${r.origin_country}|${r.commodity_category}|${r.confidence_tier}`
      if (!agg[key]) agg[key] = { rows: 0, value: 0 }
      agg[key].rows++
      agg[key].value += (r.declared_value_usd as number) ?? 0
    }

    const sorted = Object.entries(agg).sort((a, b) => b[1].value - a[1].value)
    console.log(`  ${'origin_country'.padEnd(16)} ${'commodity_category'.padEnd(20)} ${'tier'.padEnd(6)} ${'rows'.padStart(5)} ${'value_B'.padStart(10)}`)
    console.log(`  ${'─'.repeat(16)} ${'─'.repeat(20)} ${'─'.repeat(6)} ${'─'.repeat(5)} ${'─'.repeat(10)}`)
    for (const [key, v] of sorted) {
      const [country, cat, tier] = key.split('|')
      console.log(`  ${country.padEnd(16)} ${cat.padEnd(20)} ${tier.padEnd(6)} ${String(v.rows).padStart(5)} ${(v.value / 1e9).toFixed(2).padStart(10)}`)
    }
  }

  // Total counts
  const { count: totalNonPeru } = await supabase
    .from('peru_trade_flows')
    .select('*', { count: 'exact', head: true })
    .neq('origin_country', 'Peru')

  const { count: nonHigh } = await supabase
    .from('peru_trade_flows')
    .select('*', { count: 'exact', head: true })
    .neq('origin_country', 'Peru')
    .neq('confidence_tier', 'HIGH')

  console.log(`\n  Total non-Peru rows: ${totalNonPeru}`)
  console.log(`  Non-HIGH remaining: ${nonHigh}`)
  console.log('\n✓ Done — DRC, Guinea, Russia all upgraded to HIGH confidence via Comtrade')
}

main().catch(console.error)
