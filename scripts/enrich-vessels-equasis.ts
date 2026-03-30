/**
 * NAUTILUS — Equasis / MarineTraffic / FleetMon Vessel Enrichment
 *
 * For each bulk carrier IMO in our DB, fetch operator, manager, flag, destination.
 * Sources (in order of preference):
 *   1. VesselFinder vessel detail page (already known to work)
 *   2. MarineTraffic public vessel page
 *   3. FleetMon public vessel page
 *
 * Equasis requires login — we skip it and use freely scrapeable sources.
 *
 * Run: npx tsx scripts/enrich-vessels-equasis.ts
 */

import { createClient } from '@supabase/supabase-js'
import * as cheerio from 'cheerio'

const sb = createClient(
  'https://nipwrfsiiajddhisqkex.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5pcHdyZnNpaWFqZGRoaXNxa2V4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTU5NjI0MCwiZXhwIjoyMDg3MTcyMjQwfQ.ubCxPIQ01hy32LJzmAGKSo0lYNwJgUVIVp9zBhgBctQ'
)

const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'

interface VesselEnrichment {
  imo: string
  vessel_name: string
  operator_name?: string
  ship_manager?: string
  owner?: string
  flag?: string
  destination?: string
  destination_eta?: string
  source: string
}

async function fetchWithRetry(url: string, retries = 2): Promise<string | null> {
  for (let i = 0; i <= retries; i++) {
    try {
      const res = await fetch(url, {
        headers: { 'User-Agent': UA, 'Accept': 'text/html,application/xhtml+xml' },
      })
      if (res.ok) return await res.text()
      if (res.status === 429 || res.status === 403) {
        console.log(`    Rate limited (${res.status}), waiting...`)
        await new Promise(r => setTimeout(r, 3000 * (i + 1)))
        continue
      }
      return null
    } catch {
      if (i < retries) await new Promise(r => setTimeout(r, 2000))
    }
  }
  return null
}

async function enrichFromVesselFinder(imo: string, vesselName: string): Promise<VesselEnrichment | null> {
  const url = `https://www.vesselfinder.com/vessels/details/${imo}`
  const html = await fetchWithRetry(url)
  if (!html) return null

  const $ = cheerio.load(html)

  // Extract key-value pairs from vessel detail tables
  const details: Record<string, string> = {}
  $('table tr, .detail-row, .pair').each((_, el) => {
    const cells = $(el).find('td')
    if (cells.length >= 2) {
      const key = $(cells[0]).text().trim().toLowerCase()
      const val = $(cells[1]).text().trim()
      if (key && val) details[key] = val
    }
  })

  // Also try common selectors for vessel detail pages
  $('[class*="detail"], [class*="info"]').each((_, el) => {
    const text = $(el).text().trim()
    for (const field of ['Manager', 'Owner', 'Operator', 'Flag', 'Destination', 'ETA']) {
      const match = text.match(new RegExp(`${field}[:\\s]+([^\\n]+)`, 'i'))
      if (match) details[field.toLowerCase()] = match[1].trim()
    }
  })

  // Parse from raw HTML as fallback
  const operatorMatch = html.match(/(?:Operator|Technical Manager|Manager)[:\s]*<[^>]*>([^<]+)/i)
  const ownerMatch = html.match(/(?:Registered Owner|Owner)[:\s]*<[^>]*>([^<]+)/i)
  const flagMatch = html.match(/(?:Flag)[:\s]*<[^>]*>([^<]+)/i)
  const destMatch = html.match(/(?:Destination|Next Port)[:\s]*<[^>]*>([^<]+)/i)
  const etaMatch = html.match(/(?:ETA|Estimated)[:\s]*<[^>]*>([^<]+)/i)

  const operator = details['operator'] || details['manager'] || details['technical manager'] || operatorMatch?.[1]
  const owner = details['owner'] || details['registered owner'] || ownerMatch?.[1]
  const flag = details['flag'] || flagMatch?.[1]
  const destination = details['destination'] || destMatch?.[1]
  const eta = details['eta'] || etaMatch?.[1]

  if (!operator && !owner && !destination && !flag) return null

  return {
    imo,
    vessel_name: vesselName,
    operator_name: operator?.replace(/\s+/g, ' ').trim(),
    ship_manager: operator?.replace(/\s+/g, ' ').trim(),
    owner: owner?.replace(/\s+/g, ' ').trim(),
    flag: flag?.replace(/\s+/g, ' ').trim(),
    destination: destination?.replace(/\s+/g, ' ').trim(),
    destination_eta: eta?.replace(/\s+/g, ' ').trim(),
    source: 'vesselfinder',
  }
}

async function enrichFromMarineTraffic(imo: string, vesselName: string): Promise<VesselEnrichment | null> {
  // MarineTraffic public vessel pages use IMO-based URLs
  const slug = vesselName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/-+/g, '-')
  const url = `https://www.marinetraffic.com/en/ais/details/ships/imo:${imo}`
  const html = await fetchWithRetry(url)
  if (!html) return null

  const $ = cheerio.load(html)

  const details: Record<string, string> = {}

  // MarineTraffic uses detail-item pairs
  $('[class*="detail"] [class*="label"], [class*="detail"] [class*="value"]').each((_, el) => {
    const text = $(el).text().trim()
    if (text) {
      const parent = $(el).parent()
      const label = parent.find('[class*="label"]').text().trim().toLowerCase()
      const value = parent.find('[class*="value"]').text().trim()
      if (label && value) details[label] = value
    }
  })

  // Regex fallbacks on raw HTML
  const managerMatch = html.match(/(?:Manager|Operator)[:\s]*<[^>]*>([^<]+)/i)
  const flagMatch = html.match(/(?:Flag)[:\s]*<[^>]*>([^<]+)/i)
  const destMatch = html.match(/(?:Destination)[:\s]*<[^>]*>([^<]+)/i)
  const etaMatch = html.match(/(?:ETA)[:\s]*<[^>]*>([^<]+)/i)

  const manager = details['manager'] || details['operator'] || managerMatch?.[1]
  const flag = details['flag'] || flagMatch?.[1]
  const destination = details['destination'] || destMatch?.[1]
  const eta = details['eta'] || etaMatch?.[1]

  if (!manager && !destination && !flag) return null

  return {
    imo,
    vessel_name: vesselName,
    operator_name: manager?.replace(/\s+/g, ' ').trim(),
    ship_manager: manager?.replace(/\s+/g, ' ').trim(),
    flag: flag?.replace(/\s+/g, ' ').trim(),
    destination: destination?.replace(/\s+/g, ' ').trim(),
    destination_eta: eta?.replace(/\s+/g, ' ').trim(),
    source: 'marinetraffic',
  }
}

async function run() {
  console.log('NAUTILUS — Vessel Enrichment (Operator/Manager/Destination)\n')
  console.log('Sources: VesselFinder details → MarineTraffic fallback\n')

  // Get unique IMOs from vessel_call records
  const { data: flows, error } = await sb
    .from('peru_trade_flows')
    .select('match_details')
    .eq('commodity_category', 'vessel_call')
    .not('match_details', 'is', null)

  if (error) {
    console.error('DB error:', error.message)
    return
  }

  // Extract unique IMOs
  const imoMap = new Map<string, string>() // imo → vessel_name
  for (const f of flows ?? []) {
    const md = f.match_details as Record<string, unknown>
    const imo = md?.vessel_imo as string
    const name = md?.vessel_name as string
    if (imo && imo !== '?' && name) {
      imoMap.set(imo, name)
    }
  }

  console.log(`Found ${imoMap.size} unique IMOs to enrich\n`)

  let enriched = 0
  let updated = 0

  for (const [imo, vesselName] of imoMap) {
    console.log(`  ${vesselName} (IMO:${imo})`)

    // Try VesselFinder first
    let result = await enrichFromVesselFinder(imo, vesselName)

    // Fallback to MarineTraffic
    if (!result) {
      console.log('    → Trying MarineTraffic...')
      result = await enrichFromMarineTraffic(imo, vesselName)
    }

    if (result) {
      enriched++
      const enrichFields = {
        operator: result.operator_name || null,
        ship_manager: result.ship_manager || null,
        owner: result.owner || null,
        flag: result.flag || null,
        destination: result.destination || null,
        destination_eta: result.destination_eta || null,
        enrichment_source: result.source,
        enriched_at: new Date().toISOString(),
      }

      console.log(`    ✓ ${result.source}: operator=${result.operator_name || '—'} dest=${result.destination || '—'} flag=${result.flag || '—'}`)

      // Update all matching vessel_call rows for this IMO
      const { data: matching } = await sb
        .from('peru_trade_flows')
        .select('id, match_details')
        .eq('commodity_category', 'vessel_call')
        .not('match_details', 'is', null)

      for (const row of matching ?? []) {
        const md = row.match_details as Record<string, unknown>
        if (md?.vessel_imo === imo) {
          const updatedDetails = { ...md, ...enrichFields }
          const { error: ue } = await sb
            .from('peru_trade_flows')
            .update({ match_details: updatedDetails })
            .eq('id', row.id)
          if (!ue) updated++
        }
      }
    } else {
      console.log('    ✗ No enrichment data found')
    }

    // Rate limit between vessels
    await new Promise(r => setTimeout(r, 1500))
  }

  console.log(`\n✓ Enriched ${enriched}/${imoMap.size} vessels`)
  console.log(`✓ Updated ${updated} trade flow rows`)
}

run().catch(console.error)
