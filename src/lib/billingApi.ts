import { NextResponse } from 'next/server';
import { getAuthenticatedAppUser } from '@/src/lib/supabase/auth';
import { createSupabaseServerClient } from '@/src/lib/supabase/server';

export function rpcErrorResponse(error: { code?: string }) {
  const status = error.code === '42501' ? 403 : error.code === '22023' || error.code === '23505' ? 409 : error.code === '23514' ? 400 : 503;
  const messages: Record<number, string> = {
    403: 'Action non autorisée.', 409: 'Opération refusée (addition fermée, doublon ou montant incorrect).',
    400: 'Données invalides.', 503: 'Service indisponible.'
  };
  return NextResponse.json({ error: messages[status] }, { status });
}

// Les droits sont appliqués par la base (RLS + RPC) ; ici on vérifie seulement la session.
export async function withTeamSession<T>(run: (supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>) => Promise<T>) {
  const current = await getAuthenticatedAppUser();
  if (!current) return NextResponse.json({ error: 'Authentification requise.' }, { status: 401 });
  if (!['restaurant_admin', 'server'].includes(current.profile.role) || !current.profile.restaurant_id) {
    return NextResponse.json({ error: 'Accès refusé.' }, { status: 403 });
  }
  return run(await createSupabaseServerClient());
}