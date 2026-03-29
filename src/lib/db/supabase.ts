import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://nipwrfsiiajddhisqkex.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

// Client for browser / public access
export const supabase = createClient(supabaseUrl, supabaseAnonKey || supabaseServiceKey);

// Server client with service role key for ingestion/pipeline operations
export function getServiceClient() {
  if (!supabaseServiceKey) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY is required for server operations');
  }
  return createClient(supabaseUrl, supabaseServiceKey);
}

// Direct postgres connection string for scripts
export const DATABASE_URL = process.env.DATABASE_URL ||
  'postgresql://postgres:MineralScope2026!@db.nipwrfsiiajddhisqkex.supabase.co:5432/postgres';
