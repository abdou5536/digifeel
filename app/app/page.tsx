import { redirect } from 'next/navigation';
import { SupabaseRestaurantWorkspace } from '@/src/components/next/SupabaseRestaurantWorkspace';
import { getAuthenticatedAppUser } from '@/src/lib/supabase/auth';

export default async function RestaurantAppPage() {
  const current = await getAuthenticatedAppUser();
  if (!current) redirect('/login?next=%2Fapp');
  if (current.profile.role === 'kitchen') redirect('/app/cuisine');
  if (current.profile.role !== 'restaurant_admin' && current.profile.role !== 'server') redirect('/dashboard');
  return <SupabaseRestaurantWorkspace role={current.profile.role} displayName={current.profile.display_name} />;
}
