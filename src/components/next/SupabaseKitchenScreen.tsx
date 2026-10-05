'use client';

import { KitchenScreen } from './KitchenScreen';
import { LegacyWorkspaceGate } from './LegacyWorkspaceGate';

export function SupabaseKitchenScreen() {
  return <LegacyWorkspaceGate><KitchenScreen /></LegacyWorkspaceGate>;
}