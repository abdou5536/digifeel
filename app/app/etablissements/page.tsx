import { RestaurantTools } from '@/src/components/next/RestaurantTools';
import { LegacyWorkspaceGate } from '@/src/components/next/LegacyWorkspaceGate';

export default function RestaurantLocationsPage() {
  return <LegacyWorkspaceGate><RestaurantTools page="locations" /></LegacyWorkspaceGate>;
}
