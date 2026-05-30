import { createClient, SupabaseClient } from '@supabase/supabase-js';

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is required`);
  return value;
}

function getSupabaseUrl(): string {
  return process.env.NAUTILUS_SUPABASE_URL
    || process.env.NEXT_PUBLIC_SUPABASE_URL
    || requireEnv('NEXT_PUBLIC_SUPABASE_URL');
}

function getSupabaseAnonKey(): string {
  return process.env.NAUTILUS_SUPABASE_ANON_KEY
    || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    || requireEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY');
}

function getSupabaseServiceKey(): string {
  return process.env.NAUTILUS_SUPABASE_SERVICE_ROLE_KEY
    || process.env.SUPABASE_SERVICE_ROLE_KEY
    || requireEnv('SUPABASE_SERVICE_ROLE_KEY');
}

let publicClient: SupabaseClient | null = null;
let serviceClient: SupabaseClient | null = null;

// Client for browser / public access. Kept lazy so next build can import API modules
// without requiring production Supabase credentials at module-evaluation time.
export function getPublicClient() {
  publicClient ??= createClient(getSupabaseUrl(), getSupabaseAnonKey());
  return publicClient;
}

export const supabase = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    return getPublicClient()[prop as keyof SupabaseClient];
  },
});

// Server client with service role key for ingestion/pipeline operations.
export function getServiceClient() {
  serviceClient ??= createClient(getSupabaseUrl(), getSupabaseServiceKey());
  return serviceClient;
}

// Direct postgres connection string for scripts
export const DATABASE_URL = process.env.DATABASE_URL || '';
