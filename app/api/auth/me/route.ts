import { NextResponse } from 'next/server';
import { getAuthenticatedAppUser } from '@/src/lib/supabase/auth';

export async function GET() {
  try {
    const current = await getAuthenticatedAppUser();
    if (!current) return NextResponse.json({ user: null });
    return NextResponse.json({
      user: {
        ...current.profile,
        id: current.authUser.id,
        email: current.authUser.email
      }
    });
  } catch (error) {
    console.error('Unable to load Digifeel user session.', error);
    return NextResponse.json({ error: 'Le service de comptes est indisponible.' }, { status: 503 });
  }
}
