import { createClient, SupabaseClient, SupabaseClientOptions } from '@supabase/supabase-js';

let supabaseInstance: SupabaseClient | null = null;

export interface SupabaseConfig {
  supabaseUrl?: string;
  supabaseAnonKey?: string;
  options?: SupabaseClientOptions<'public'>;
}

/**
 * Retrieves or creates a singleton SupabaseClient.
 * Safely falls back to environment variables without hardcoded secrets.
 */
export function getSupabaseClient(config?: SupabaseConfig): SupabaseClient {
  if (supabaseInstance) return supabaseInstance;

  const url =
    config?.supabaseUrl ||
    (typeof process !== 'undefined' ? process.env?.NEXT_PUBLIC_SUPABASE_URL : undefined) ||
    'http://127.0.0.1:54321';

  const anonKey =
    config?.supabaseAnonKey ||
    (typeof process !== 'undefined' ? process.env?.NEXT_PUBLIC_SUPABASE_ANON_KEY : undefined) ||
    'public-anon-key-placeholder';

  supabaseInstance = createClient(url, anonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
    },
    ...config?.options,
  });

  return supabaseInstance;
}

/**
 * Reset singleton client instance (primarily used in testing).
 */
export function resetSupabaseClient(): void {
  supabaseInstance = null;
}
