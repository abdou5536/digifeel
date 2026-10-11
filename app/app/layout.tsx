import type { ReactNode } from 'react';
import { redirect } from 'next/navigation';
import { getAuthenticatedAppUser } from '@/src/lib/supabase/auth';

export default async function RestaurantLayout({ children }: { children: ReactNode }) {
  const current = await getAuthenticatedAppUser();
  if (current?.profile.role === 'server') redirect('/caisse');
  if (process.env.NODE_ENV === 'production') {
    if (!current) redirect('/login?next=%2Fapp');
    if (!['super_admin', 'restaurant_admin', 'server', 'kitchen'].includes(current.profile.role)) {
      redirect('/dashboard');
    }
  }

  return children;
}