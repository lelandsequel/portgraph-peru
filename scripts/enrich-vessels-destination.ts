/**
 * NAUTILUS — Vessel Destination Enrichment
 *
 * For each bulk carrier IMO, fetch destination port from:
 *   1. VesselFinder vessel detail page
 *   2. MyShipTracking vessel page
 *
 * Goal: "FEDERAL IMPACT is heading to Qingdao" — highest-value signal for Chiang.
 *
 * Run: npx tsx scripts/enrich-vessels-destination.ts
 */

import { createClient } from '@supabase/supabase-js'
import * as cheerio from 'cheerio'

const sb = createClient(
  'https://nipwrfsiiajddhisqkex.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5pcHdyZnNpaWFqZGRoaXNxa2V4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTU5NjI0MCwiZXhwIjoyMDg3MTcyMjQwfQ.ubCxPIQ01hy32LJzmAGKSo0lYNwJgUVIVp9zBhgBctQ'
)

const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'

// Map destination port names to countries (major copper/zinc destinations)
const PORT_COUNTRY_MAP: Record<string, string> = {
  'qingdao': 'China', 'shanghai': 'China', 'tianjin': 'China', 'ningbo': 'China',
  'guangzhou': 'China', 'zhanjiang': 'China', 'lianyungang': 'China', 'dalian': 'China',
  'rizhao': 'China', 'caofeidian': 'China', 'yantai': 'China', 'fangcheng': 'China',
  'saganoseki': 'Japan', 'naoshima': 'Japan', 'onahama': 'Japan', 'tamano': 'Japan',
  'tokyo': 'Japan', 'yokohama': 'Japan', 'osaka': 'Japan', 'kobe': 'Japan',
  'onsan': 'South Korea', 'busan': 'South Korea', 'ulsan': 'South Korea', 'incheon': 'South Korea',
  'hamburg': 'Germany', 'rotterdam': 'Netherlands', 'antwerp': 'Belgium',
  'mumbai': 'India', 'kandla': 'India', 'tuticorin': 'India', 'visakhapatnam': 'India',
  'iskenderun': 'Turkey', 'istanbul': 'Turkey',
  'constanta': 'Romania', 'varna': 'Bulgaria',
  'santos': 'Brazil', 'san antonio': 'Chile',
  'kaohsiung': 'Taiwan', 'taichung': 'Taiwan',
  'haiphong': 'Vietnam', 'ho chi minh': 'Vietnam',
  'johor': 'Malaysia', 'port klang': 'Malaysia',
  'richards bay': 'South Africa',
}

function resolveCountry(destination: string): string | null {
  if (!destination) return null
  const lower = destination.toLowerCase()
  for (const [port, country] of Object.entries(PORT_COUNTRY_MAP)) {
    if (lower.includes(port)) return country
  }
  return null
}

async function fetchPage(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': UA, 'Accept': 'text/html,application/xhtml+xml' },
    })
    if (res.ok) return await res.text()
    if (res.status === 429 || res.status === 403) {
      await new Promise(r => setTimeout(r, 3000))
    }
    return null
  } catch {
    return null
  }
}

interface DestinationResult {
  destination: string
  destination_country: string | null
  destination_eta: string | null
  source: string
}

async function getDestinationFromVesselFinder(imo: string): Promise<DestinationResult | null> {
  const html = await fetchPage(`https://www.vesselfinder.com/vessels/details/${imo}`)
  if (!html) return null

  const $ = cheerio.load(html)

  // Try structured data first
  let destination: string | null = null
  let eta: string | null = null

  // VesselFinder uses various table/detail layouts
  $('td, dd, .value, [class*="dest"], [class*="route"]').each((_, el) => {
    const text = $(el).text().trim()
    if (!destination) {
      const prev = $(el).prev().text().trim().toLowerCase()
      if (prev.includes('destination') || prev.includes('next port')) {
        if (text && text !== '-' && text !== 'N/A') destination = text
      }
    }
    if (!eta) {
      const prev = $(el).prev().text().trim().toLowerCase()
      if (prev.includes('eta') || prev.includes('estimated')) {
        if (text && text !== '-' && text !== 'N/A') eta = text
      }
    }
  })

  // Regex fallbacks
  if (!destination) {
    const destMatch = html.match(/(?:Destination|DEST|Next Port|Heading to)[:\s]*<[^>]*>?\s*([A-Z][A-Za-z\s,]+?)(?:<|$|\n)/i)
    if (destMatch) destination = destMatch[1].trim()
  }
  if (!eta) {
    const etaMatch = html.match(/(?:ETA|Estimated Arrival)[:\s]*<[^>]*>?\s*([^<\n]+)/i)
    if (etaMatch) eta = etaMatch[1].trim()
  }

  // Also check AIS-reported destination from page meta/title
  const aisDestMatch = html.match(/AIS Destination[:\s]*([^<\n]+)/i) || html.match(/Reported Destination[:\s]*([^<\n]+)/i)
  if (!destination && aisDestMatch) destination = aisDestMatch[1].trim()

  if (!destination || destination === '-' || destination.length < 2) return null

  return {
    destination: destination.replace(/\s+/g, ' ').trim(),
    destination_country: resolveCountry(destination),
    destination_eta: eta?.replace(/\s+/g, ' ').trim() || null,
    source: 'vesselfinder',
  }
}

async function getDestinationFromMyShipTracking(imo: string): Promise<DestinationResult | null> {
  const html = await fetchPage(`https://www.myshiptracking.com/vessels/${imo}`)
  if (!html) return null

  const $ = cheerio.load(html)

  let destination = ''
  let eta = ''

  // MyShipTracking vessel detail layout
  $('td, .detail-value, [class*="dest"]').each((_, el) => {
    const text = $(el).text().trim()
    const prev = $(el).prev().text().trim().toLowerCase()
    if (!destination && (prev.includes('destination') || prev.includes('next port'))) {
      if (text && text !== '-' && text !== 'N/A') destination = text
    }
    if (!eta && (prev.includes('eta') || prev.includes('estimated'))) {
      if (text && text !== '-' && text !== 'N/A') eta = text
    }
  })

  // Regex fallbacks
  if (!destination) {
    const m = html.match(/(?:Destination|DEST)[:\s]*<[^>]*>?\s*([A-Z][A-Za-z\s,]+?)(?:<|$)/i)
    if (m) destination = m[1].trim()
  }

  if (!destination || destination === '-' || destination.length < 2) return null

  return {
    destination: destination.replace(/\s+/g, ' ').trim(),
    destination_country: resolveCountry(destination),
    destination_eta: eta ? eta.replace(/\s+/g, ' ').trim() : null,
    source: 'myshiptracking',
  }
}

async function run() {
  console.log('NAUTILUS — Vessel Destination Enrichment\n')
  console.log('Sources: VesselFinder → MyShipTracking fallback\n')

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

  const imoMap = new Map<string, string>()
  for (const f of flows ?? []) {
    const md = f.match_details as Record<string, unknown>
    const imo = md?.vessel_imo as string
    const name = md?.vessel_name as string
    if (imo && imo !== '?' && name) {
      imoMap.set(imo, name)
    }
  }

  console.log(`Found ${imoMap.size} unique IMOs to check destinations\n`)

  let found = 0
  let updated = 0
  const routeSignals: Array<{ vessel: string; imo: string; destination: string; country: string }> = []

  for (const [imo, vesselName] of imoMap) {
    console.log(`  ${vesselName} (IMO:${imo})`)

    // Try VesselFinder first
    let result = await getDestinationFromVesselFinder(imo)

    // Fallback to MyShipTracking
    if (!result) {
      console.log('    → Trying MyShipTracking...')
      result = await getDestinationFromMyShipTracking(imo)
    }

    if (result) {
      found++
      console.log(`    ✓ ${result.source}: dest=${result.destination} country=${result.destination_country || '?'} eta=${result.destination_eta || '—'}`)

      // Track route signals (Peru → Asia/key destinations)
      if (result.destination_country) {
        routeSignals.push({
          vessel: vesselName,
          imo,
          destination: result.destination,
          country: result.destination_country,
        })
      }

      // Update matching trade flow rows
      const { data: matching } = await sb
        .from('peru_trade_flows')
        .select('id, match_details')
        .eq('commodity_category', 'vessel_call')
        .not('match_details', 'is', null)

      for (const row of matching ?? []) {
        const md = row.match_details as Record<string, unknown>
        if (md?.vessel_imo === imo) {
          const updatedDetails = {
            ...md,
            destination: result.destination,
            destination_country: result.destination_country,
            destination_eta: result.destination_eta,
            destination_source: result.source,
            destination_enriched_at: new Date().toISOString(),
          }
          // Also update top-level destination_country on the flow
          const { error: ue } = await sb
            .from('peru_trade_flows')
            .update({
              match_details: updatedDetails,
              destination_country: result.destination_country,
              destination_port: result.destination,
            })
            .eq('id', row.id)
          if (!ue) updated++
        }
      }
    } else {
      console.log('    ✗ No destination found')
    }

    // Rate limit
    await new Promise(r => setTimeout(r, 1500))
  }

  // Summary
  console.log(`\n${'═'.repeat(60)}`)
  console.log(`✓ Destinations found: ${found}/${imoMap.size} vessels`)
  console.log(`✓ Trade flow rows updated: ${updated}`)

  if (routeSignals.length > 0) {
    console.log(`\n🚢 ROUTE SIGNALS (vessels with confirmed destinations):`)
    for (const rs of routeSignals) {
      console.log(`  ${rs.vessel} (IMO:${rs.imo}) → ${rs.destination} [${rs.country}]`)
    }

    // Insert route_confirmed signal records
    const now = new Date().toISOString()
    const signalRows = routeSignals.map(rs => ({
      commodity: 'Copper/Zinc Concentrate',
      commodity_category: 'route_signal',
      origin_country: 'Peru',
      peru_port: 'Various',
      peru_port_unlocode: 'PECLL',
      destination_country: rs.country,
      destination_port: rs.destination,
      arrival_time: now,
      match_method: 'route_confirmed',
      match_details: {
        data_source: 'destination_enrichment',
        vessel_name: rs.vessel,
        vessel_imo: rs.imo,
        destination: rs.destination,
        destination_country: rs.country,
        signal_type: 'route_confirmed',
        note: `${rs.vessel} loaded at Peru port, confirmed heading to ${rs.destination} (${rs.country})`,
        enriched_at: now,
      },
      confidence_score: 0.88,
      confidence_tier: 'HIGH',
      provenance: [{
        field: 'destination',
        raw_value: rs.destination,
        source_name: 'destination_enrichment',
        fetch_timestamp: now,
      }],
    }))

    if (signalRows.length > 0) {
      const { error: ie } = await sb.from('peru_trade_flows').insert(signalRows)
      if (ie) {
        console.warn(`Signal insert error: ${ie.message.slice(0, 80)}`)
      } else {
        console.log(`✓ Inserted ${signalRows.length} route_confirmed signal rows`)
      }
    }
  }
}

run().catch(console.error)
