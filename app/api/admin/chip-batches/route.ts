import { NextRequest, NextResponse } from 'next/server';
import { parseJsonObject } from '@/src/lib/security';
import { getAuthenticatedAppUser } from '@/src/lib/supabase/auth';
import { createSupabaseServerClient } from '@/src/lib/supabase/server';

export async function POST(request: NextRequest) {
  const body = await parseJsonObject(request);
  const name = typeof body?.name === 'string' ? body.name.trim() : '';
  const count = body?.count;
  if (name.length < 1 || name.length > 100 || !Number.isInteger(count) || (count as number) < 1 || (count as number) > 100) {
    return NextResponse.json({ error: 'Indiquez un nom et un nombre de puces de 1 à 100.' }, { status: 400 });
  }

  try {
    const current = await getAuthenticatedAppUser();
    if (!current) return NextResponse.json({ error: 'Authentification requise.' }, { status: 401 });
    if (current.profile.role !== 'super_admin') {
      return NextResponse.json({ error: 'Accès réservé au super-administrateur.' }, { status: 403 });
    }

    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.rpc('create_chip_batch', {
      p_name: name,
      p_count: count as number
    });
    if (error) {
      console.error('Chip batch creation failed.', error);
      return NextResponse.json({ error: 'Le lot de puces n’a pas pu être créé.' }, { status: 503 });
    }
    return NextResponse.json({ name, chips: data }, { status: 201 });
  } catch (error) {
    console.error('Chip batch service is unavailable.', error);
    return NextResponse.json({ error: 'Le service de gestion des puces est indisponible.' }, { status: 503 });
  }
}
