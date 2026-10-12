import { RestaurantTools } from '@/src/components/next/RestaurantTools';
import { LegacyWorkspaceGate } from '@/src/components/next/LegacyWorkspaceGate';

export default function RestaurantActivityPage() {
  return <LegacyWorkspaceGate><RestaurantTools page="journal" /></LegacyWorkspaceGate>;
}
