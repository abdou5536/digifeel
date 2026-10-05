import { RestaurantDashboard } from '@/src/components/next/RestaurantDashboard';

export default async function DashboardPage({ searchParams }: { searchParams: Promise<{ demo?: string }> }) {
  const { demo } = await searchParams;
  return <RestaurantDashboard demo={demo === '1'} />;
}
