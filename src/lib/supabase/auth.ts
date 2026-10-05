import type { User } from '@supabase/supabase-js';
import { createSupabaseServerClient } from './server';

export type AppRole = 'super_admin' | 'restaurant_admin' | 'server' | 'reseller' | 'kitchen';

export interface AppUser {
  id: string;
  role: AppRole;
  restaurant_id: string | null;
  server_id: string | null;
  display_name: string;
}

export interface AuthenticatedAppUser {
  authUser: User;
  profile: AppUser;
}

export async function getAuthenticatedAppUser(): Promise<AuthenticatedAppUser | null> {
  const supabase = await createSupabaseServerClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError?.name === 'AuthSessionMissingError') return null;
  if (authError) throw authError;
  if (!user) return null;

  const { data: profile, error: profileError } = await supabase
    .from('app_users')
    .select('id, role, restaurant_id, server_id, display_name')
    .eq('id', user.id)
    .maybeSingle();
  if (profileError) throw profileError;
  if (!profile) return null;

  return { authUser: user, profile: profile as AppUser };
}
