import { AuthExperience } from '@/src/components/next/AuthExperience';

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  const safeNext = next?.startsWith('/') && !next.startsWith('//') ? next : '/caisse';
  return <AuthExperience nextPath={safeNext} />;
}
