import { RestaurantPOS } from '@/src/components/next/RestaurantPOS';
import { PendingGuestPayments } from '@/src/components/next/PendingGuestPayments';

export default function CashierPage() {
  return (
    <>
      <RestaurantPOS />
      <PendingGuestPayments />
    </>
  );
}
