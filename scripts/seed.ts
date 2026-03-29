/**
 * PortGraph Peru — Seed Script
 *
 * Runs the full pipeline:
 * 1. Fetch real trade data from OEC (Observatory of Economic Complexity)
 * 2. Run METEOR entity resolution on imported country names
 * 3. Run QUASAR anomaly detection (year-over-year changes per buyer country)
 * 4. Run AURORA confidence scoring
 *
 * Usage: npx tsx scripts/seed.ts
 */

import { createClient } from '@supabase/supabase-js';
import { ingestOEC } from '../src/lib/ingest/oec-ingestor';
import { runMeteorPipeline } from '../src/lib/pipeline/meteor';
import { runCometPipeline } from '../src/lib/pipeline/comet';
import { runAuroraPipeline } from '../src/lib/pipeline/aurora';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://nipwrfsiiajddhisqkex.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

if (!supabaseKey) {
  console.error('ERROR: Set SUPABASE_SERVICE_ROLE_KEY or NEXT_PUBLIC_SUPABASE_ANON_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  console.log('PortGraph Peru — Seed Script');
  console.log('============================\n');

  // Step 1: Fetch real trade data from OEC
  console.log('Step 1: Ingesting OEC BACI trade data (Peru mining exports, 2019-2022)...');
  try {
    const oecResult = await ingestOEC(supabase);
    console.log(`  Fetched: ${oecResult.fetched} records`);
    console.log(`  Ingested: ${oecResult.ingested} trade flows`);
    console.log(`  Countries: ${oecResult.countries}`);
    console.log(`  Years: ${oecResult.years.join(', ')}`);
    if (oecResult.errors > 0) {
      console.log(`  Errors: ${oecResult.errors}`);
    }
  } catch (err) {
    console.error('OEC ingestion failed:', err);
    process.exit(1);
  }

  // Step 2: Run METEOR entity resolution
  console.log('\nStep 2: Running METEOR entity resolution...');
  const meteorResult = await runMeteorPipeline(supabase);
  console.log(`  Vessels resolved: ${meteorResult.vessels_resolved}`);
  console.log(`  Companies resolved: ${meteorResult.companies_resolved}`);
  console.log(`  Ports resolved: ${meteorResult.ports_resolved}`);
  console.log(`  Unresolved: ${meteorResult.unresolved_count}`);

  // Step 3: Run COMET chain reconstruction
  console.log('\nStep 3: Running COMET chain reconstruction...');
  const cometResult = await runCometPipeline(supabase);
  console.log(`  Chains built: ${cometResult.chains_built}`);
  console.log(`  HIGH confidence: ${cometResult.high_confidence}`);
  console.log(`  MEDIUM confidence: ${cometResult.medium_confidence}`);
  console.log(`  LOW confidence: ${cometResult.low_confidence}`);
  console.log(`  Unmatched calls: ${cometResult.unmatched_calls}`);

  // Step 4: Run AURORA trust validation + anomaly detection (QUASAR YoY)
  console.log('\nStep 4: Running AURORA trust validation + QUASAR anomaly detection...');
  const auroraResult = await runAuroraPipeline(supabase);
  console.log(`  Flows validated: ${auroraResult.flows_validated}`);
  console.log(`  Flagged: ${auroraResult.flagged_count}`);
  console.log(`  Anomalies detected: ${auroraResult.anomalies_detected}`);

  // Summary
  console.log('\n============================');
  console.log('Seed complete. Pipeline summary:');
  console.log(`  Data source: OEC BACI (real bilateral trade flows)`);
  console.log(`  Entities resolved: ${meteorResult.vessels_resolved + meteorResult.companies_resolved + meteorResult.ports_resolved}`);
  console.log(`  Anomaly flags: ${auroraResult.anomalies_detected}`);
  console.log('\nHero question ready: "Who is buying Peruvian copper concentrate? How have those relationships changed year-over-year?"');
}

main().catch(console.error);
