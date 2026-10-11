import { notFound } from 'next/navigation';
import type { ReactNode } from 'react';
import { isLocalWorkspaceEnabled } from '@/src/lib/features';
import { LegacyWorkspaceErrorBoundary } from './LegacyWorkspaceErrorBoundary';

export function LegacyWorkspaceGate({ children }: { children: ReactNode }) {
  if (!isLocalWorkspaceEnabled()) notFound();

  return (
    <LegacyWorkspaceErrorBoundary>{children}</LegacyWorkspaceErrorBoundary>
  );
}