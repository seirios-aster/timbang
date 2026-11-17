import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { AUTH_STORAGE_KEY, SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL } from '@/config/supabase';

let client: SupabaseClient | null = null;

/** The one Supabase client. Created on first use. */
export function getClient(): SupabaseClient {
  client ??= createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    auth: {
      storageKey: AUTH_STORAGE_KEY,
      persistSession: true,
      autoRefreshToken: true,
      // Return from Google or an email link with a one-time code, not tokens in the address. The app's
      // screens live in the address's hash, which tokens would break.
      flowType: 'pkce',
      detectSessionInUrl: true,
    },
  });
  return client;
}

/** Where to come back to after signing in: the app's own address. */
export function appUrl(): string {
  return `${window.location.origin}${import.meta.env.BASE_URL}`;
}
