import { HelpExperience } from '@/src/components/next/HelpExperience';
import { LegacyWorkspaceGate } from '@/src/components/next/LegacyWorkspaceGate';

export default function RestaurantHelpPage() {
  return <LegacyWorkspaceGate><HelpExperience /></LegacyWorkspaceGate>;
}
