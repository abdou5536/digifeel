import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { SupabaseKitchenScreen } from '@/src/components/next/SupabaseKitchenScreen';
import { getAuthenticatedAppUser } from '@/src/lib/supabase/auth';

export const metadata: Metadata = {
  title: 'Écran cuisine',
  robots: { index: false, follow: false }
};

export default async function KitchenPage() {
  const current = await getAuthenticatedAppUser();
  if (!current) redirect('/login?next=%2Fapp%2Fcuisine');
  if (current.profile.role !== 'kitchen') redirect('/app');
  return <SupabaseKitchenScreen />;
}
