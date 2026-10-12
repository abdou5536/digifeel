import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { getSupabasePublicConfig, getSupabaseServiceKey } from './config';

export async function createSupabaseServerClient() {
  const { url, anonKey } = getSupabasePublicConfig();
  const cookieStore = await cookies();

  return createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        } catch {
          // Les Server Components ne peuvent pas écrire les cookies ; le proxy renouvelle la session.
        }
      }
    }
  });
}

export function createSupabaseServiceClient() {
  const { url } = getSupabasePublicConfig();
  return createClient(url, getSupabaseServiceKey(), {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false
    }
  });
}
