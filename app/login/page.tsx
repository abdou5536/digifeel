import { redirect } from 'next/navigation';
import { AuthExperience } from '@/src/components/next/AuthExperience';
import { getAuthenticatedAppUser } from '@/src/lib/supabase/auth';

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string; admin?: string }> }) {
  const { next, admin } = await searchParams;
  const safeNext = next?.startsWith('/') && !next.startsWith('//') ? next : '/caisse';
  const current = await getAuthenticatedAppUser().catch(() => null);
  if (current) redirect(current.profile.role === 'super_admin' ? '/admin' : safeNext);
  return <AuthExperience nextPath={safeNext} initialSuperAdmin={admin === '1'} />;
}
