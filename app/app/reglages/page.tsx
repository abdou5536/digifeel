import { SettingsExperience } from '@/src/components/next/SettingsExperience';
import { LegacyWorkspaceGate } from '@/src/components/next/LegacyWorkspaceGate';

export default function RestaurantSettingsPage() {
  return <LegacyWorkspaceGate><SettingsExperience /></LegacyWorkspaceGate>;
}
