import { RestaurantPOS } from '@/src/components/next/RestaurantPOS';
import { PendingGuestPayments } from '@/src/components/next/PendingGuestPayments';
import { LicenseBanner } from '@/src/components/next/LicenseBanner';
import { PrinterSettings } from '@/src/components/next/PrinterSettings';
import { LocalBackupPanel } from '@/src/components/next/LocalBackup';
import { CounterTicketPrinter } from '@/src/components/next/CounterTicketPrinter';

export default function CashierPage() {
  return (
    <>
      <LicenseBanner />
      <RestaurantPOS />
      <CounterTicketPrinter />
      <PrinterSettings />
      <LocalBackupPanel />
      <PendingGuestPayments />
    </>
  );
}
