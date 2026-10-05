import { RestaurantPOS } from '@/src/components/next/RestaurantPOS';
import { PendingGuestPayments } from '@/src/components/next/PendingGuestPayments';

export default async function CashierPage({ searchParams }: { searchParams: Promise<{ demo?: string }> }) {
  const { demo } = await searchParams;
  return (
    <>
      <RestaurantPOS demo={demo === '1'} />
      {!demo && <PendingGuestPayments />}
    </>
  );
}
