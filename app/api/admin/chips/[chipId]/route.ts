import { NextRequest, NextResponse } from 'next/server';
import { parseJsonObject } from '@/src/lib/security';
import { getAuthenticatedAppUser } from '@/src/lib/supabase/auth';
import { createSupabaseServiceClient } from '@/src/lib/supabase/server';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ chipId: string }> }) {
  const { chipId } = await params;
  const body = await parseJsonObject(request);
  if (!UUID_PATTERN.test(chipId) || (body?.status !== 'active' && body?.status !== 'disabled')) {
    return NextResponse.json({ error: 'La puce ou son statut est invalide.' }, { status: 400 });
  }

  try {
    const current = await getAuthenticatedAppUser();
    if (!current) return NextResponse.json({ error: 'Authentification requise.' }, { status: 401 });
    if (current.profile.role !== 'super_admin') return NextResponse.json({ error: 'Accès réservé au super-administrateur.' }, { status: 403 });

    const supabase = createSupabaseServiceClient();
    if (body.status === 'active') {
      const { data: existing, error: lookupError } = await supabase
        .from('chips')
        .select('restaurant_id')
        .eq('id', chipId)
        .maybeSingle();
      if (lookupError) throw lookupError;
      if (!existing) return NextResponse.json({ error: 'Cette puce n’existe pas.' }, { status: 404 });
      if (!existing.restaurant_id) return NextResponse.json({ error: 'Cette puce doit être associée à un restaurant avant sa réactivation.' }, { status: 409 });
      const { data: restaurant, error: restaurantError } = await supabase
        .from('restaurants')
        .select('google_review_url')
        .eq('id', existing.restaurant_id)
        .maybeSingle();
      if (restaurantError) throw restaurantError;
      if (!restaurant?.google_review_url) return NextResponse.json({ error: 'Le restaurant doit configurer son lien Google avant la réactivation.' }, { status: 409 });
    }
    const { data, error } = await supabase.from('chips').update({ status: body.status }).eq('id', chipId).select('id,status').maybeSingle();
    if (error) throw error;
    if (!data) return NextResponse.json({ error: 'Cette puce n’existe pas.' }, { status: 404 });
    return NextResponse.json(data);
  } catch (error) {
    console.error('Admin chip status could not be updated.', error);
    return NextResponse.json({ error: 'Le statut de la puce n’a pas pu être modifié.' }, { status: 503 });
  }
}
