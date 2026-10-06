import { NextResponse } from 'next/server';
import { getAuthenticatedAppUser } from '@/src/lib/supabase/auth';

/** Retourne une réponse d'erreur si l'appelant n'est pas superadmin, sinon null. */
export async function requireSuperAdmin(): Promise<NextResponse | null> {
  const current = await getAuthenticatedAppUser();
  if (!current) return NextResponse.json({ error: 'Authentification requise.' }, { status: 401 });
  if (current.profile.role !== 'super_admin') {
    return NextResponse.json({ error: 'Accès réservé au super-administrateur.' }, { status: 403 });
  }
  return null;
}
