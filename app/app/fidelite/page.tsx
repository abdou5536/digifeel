import { RestaurantTools } from '@/src/components/next/RestaurantTools';
import { LegacyWorkspaceGate } from '@/src/components/next/LegacyWorkspaceGate';

export default function RestaurantLoyaltyPage() {
  return <LegacyWorkspaceGate><RestaurantTools page="loyalty" /></LegacyWorkspaceGate>;
}
