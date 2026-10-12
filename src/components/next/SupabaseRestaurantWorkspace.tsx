'use client';

import { RestaurantWorkspace } from './RestaurantWorkspace';
import { LegacyWorkspaceGate } from './LegacyWorkspaceGate';

interface Props {
  role: 'restaurant_admin' | 'server';
  displayName: string;
}

/** Espace du restaurateur ou du serveur connecté (le rôle vient de la session serveur, jamais du client). */
export function SupabaseRestaurantWorkspace({ role }: Props) {
  return (
    <LegacyWorkspaceGate>
      <RestaurantWorkspace initialRole={role === 'server' ? 'serveur' : 'admin_restaurant'} />
    </LegacyWorkspaceGate>
  );
}