import { notFound } from 'next/navigation';
import type { ReactNode } from 'react';
import { isLocalWorkspaceEnabled } from '@/src/lib/features';

export const dynamic = 'force-dynamic';

export default function Layout({ children }: { children: ReactNode }) {
  if (!isLocalWorkspaceEnabled()) notFound();
  return children;
}