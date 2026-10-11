import { redirect } from 'next/navigation';
import { RestaurantDashboard } from '@/src/components/next/RestaurantDashboard';
import { getAuthenticatedAppUser } from '@/src/lib/supabase/auth';

export default async function DashboardPage({ searchParams }: { searchParams: Promise<{ demo?: string }> }) {
  const { demo } = await searchParams;
  const current = await getAuthenticatedAppUser();
  if (current?.profile.role === 'server') redirect('/caisse');
  return <RestaurantDashboard demo={demo === '1'} />;
}
