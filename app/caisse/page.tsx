import { RestaurantPOS } from '@/src/components/next/RestaurantPOS';
import { PendingGuestPayments } from '@/src/components/next/PendingGuestPayments';
import { LicenseBanner } from '@/src/components/next/LicenseBanner';
import { LocalBackupPanel } from '@/src/components/next/LocalBackup';

export default function CashierPage() {
  return (
    <>
      <LicenseBanner />
      <RestaurantPOS />
      <LocalBackupPanel />
      <PendingGuestPayments />
    </>
  );
}
