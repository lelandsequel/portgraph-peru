/**
 * Database Setup Script
 *
 * Reads schema.sql and executes it against Supabase.
 * Usage: npx tsx scripts/setup-db.ts
 */

import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://nipwrfsiiajddhisqkex.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

if (!supabaseKey) {
  console.error('ERROR: Set SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  console.log('PortGraph Peru — Database Setup');
  console.log('================================\n');

  const schemaPath = path.join(__dirname, '..', 'src', 'lib', 'db', 'schema.sql');
  const schema = fs.readFileSync(schemaPath, 'utf-8');

  // Split into individual statements
  const statements = schema
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('--'));

  console.log(`Found ${statements.length} SQL statements to execute.\n`);
  console.log('NOTE: Run this SQL directly in the Supabase SQL Editor at:');
  console.log('https://supabase.com/dashboard/project/nipwrfsiiajddhisqkex/sql\n');
  console.log('Copy the contents of src/lib/db/schema.sql and execute it.\n');
  console.log('Schema file location:', schemaPath);
}

main().catch(console.error);
