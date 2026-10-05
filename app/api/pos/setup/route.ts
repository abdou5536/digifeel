import { NextRequest, NextResponse } from 'next/server';
import { parseJsonObject } from '@/src/lib/security';
import { getAuthenticatedAppUser } from '@/src/lib/supabase/auth';
import { createSupabaseServerClient } from '@/src/lib/supabase/server';

export async function POST(request: NextRequest) {
  const body = await parseJsonObject(request);
  const name = typeof body?.name === 'string' ? body.name.trim() : '';
  const address = typeof body?.address === 'string' ? body.address.trim() : '';
  if (name.length < 2 || name.length > 120 || address.length > 200) {
    return NextResponse.json({ error: 'Vérifiez le nom et l’adresse du restaurant.' }, { status: 400 });
  }

  try {
    const current = await getAuthenticatedAppUser();
    if (!current) return NextResponse.json({ error: 'Connectez-vous pour créer votre espace restaurant.' }, { status: 401 });
    if (current.profile.role !== 'restaurant_admin' || current.profile.restaurant_id) {
      return NextResponse.json({ error: 'Ce compte ne peut pas créer un nouvel espace restaurant.' }, { status: 403 });
    }

    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.rpc('setup_pos_restaurant', {
      p_name: name,
      p_address: address || null
    });
    if (error) {
      console.error('Restaurant POS setup failed.', error);
      return NextResponse.json({ error: error.code === '42501'
        ? 'Un restaurant est déjà associé à ce compte.'
        : 'L’espace restaurant n’a pas pu être créé.' }, { status: error.code === '42501' ? 403 : 503 });
    }
    return NextResponse.json({ restaurantId: data }, { status: 201 });
  } catch (error) {
    console.error('Restaurant POS setup service is unavailable.', error);
    return NextResponse.json({ error: 'La configuration du restaurant est momentanément indisponible.' }, { status: 503 });
  }
}
