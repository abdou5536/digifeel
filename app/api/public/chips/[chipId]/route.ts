import { NextResponse } from 'next/server';
import { createSupabaseServiceClient } from '@/src/lib/supabase/server';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function GET(_request: Request, { params }: { params: Promise<{ chipId: string }> }) {
  const { chipId } = await params;
  if (!UUID_PATTERN.test(chipId)) {
    return NextResponse.json({ state: 'unknown', error: 'Cette puce n’existe pas.' });
  }

  try {
    const supabase = createSupabaseServiceClient();
    const { data: chip, error } = await supabase
      .from('chips')
      .select('status, restaurants(name, google_review_url, logo_url, tip_enabled, active), restaurant_id')
      .eq('id', chipId)
      .maybeSingle();
    if (error) throw error;

    if (!chip) {
      return NextResponse.json({ state: 'unknown', error: 'Cette puce n’existe pas.' });
    }
    if (chip.status === 'disabled') {
      return NextResponse.json({ state: 'disabled', error: 'Cette puce a été désactivée par le restaurant.' });
    }
    if (chip.status === 'inactive') {
      return NextResponse.json({ state: 'inactive', error: 'Cette puce attend son activation.' });
    }

    const restaurant = chip.restaurants && !Array.isArray(chip.restaurants) ? chip.restaurants : null;
    if (restaurant && !restaurant.active) {
      return NextResponse.json({ state: 'disabled', error: 'Ce restaurant n’accepte plus d’avis pour le moment.' });
    }
    if (!chip.restaurant_id || !restaurant?.google_review_url) {
      return NextResponse.json({ state: 'unconfigured', error: 'Cette puce n’est pas encore activée pour un restaurant.' });
    }

    const { data: servers, error: serversError } = await supabase
      .from('servers')
      .select('id, name')
      .eq('restaurant_id', chip.restaurant_id)
      .eq('active', true)
      .order('name');
    if (serversError) throw serversError;

    return NextResponse.json({
      state: 'ready',
      restaurant: {
        name: restaurant.name,
        googleReviewUrl: restaurant.google_review_url,
        logoUrl: restaurant.logo_url,
        tipEnabled: restaurant.tip_enabled
      },
      servers: servers ?? []
    });
  } catch (error) {
    console.error('Public chip details could not be loaded.', error);
    return NextResponse.json({ error: 'Le service est momentanément indisponible.' }, { status: 503 });
  }
}
