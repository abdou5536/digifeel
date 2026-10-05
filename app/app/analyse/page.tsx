import { RestaurantTools } from '@/src/components/next/RestaurantTools';
import { LegacyWorkspaceGate } from '@/src/components/next/LegacyWorkspaceGate';

export default function RestaurantAnalysisPage() {
  return <LegacyWorkspaceGate><RestaurantTools page="analysis" /></LegacyWorkspaceGate>;
}
