import { RestaurantTools } from '@/src/components/next/RestaurantTools';
import { LegacyWorkspaceGate } from '@/src/components/next/LegacyWorkspaceGate';

export default function RestaurantTipsPage() {
  return <LegacyWorkspaceGate><RestaurantTools page="tips" /></LegacyWorkspaceGate>;
}
