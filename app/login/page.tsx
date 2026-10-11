import { redirect } from 'next/navigation';
import { AuthExperience } from '@/src/components/next/AuthExperience';
import { getAuthenticatedAppUser } from '@/src/lib/supabase/auth';

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  const safeNext = next?.startsWith('/') && !next.startsWith('//') ? next : '/caisse';
  const current = await getAuthenticatedAppUser().catch(() => null);
  if (current) redirect(current.role === 'super_admin' ? '/admin' : safeNext);
  return <AuthExperience nextPath={safeNext} />;
}
