import { redirect } from 'next/navigation';
import { AdminWorkspace } from '@/src/components/next/AdminWorkspace';
import { getAuthenticatedAppUser } from '@/src/lib/supabase/auth';

export default async function AdminPage() {
  const current = await getAuthenticatedAppUser();
  if (!current) redirect('/login?next=/admin');
  if (current.profile.role !== 'super_admin') redirect('/app');

  return <AdminWorkspace />;
}
