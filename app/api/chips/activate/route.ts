import { NextRequest, NextResponse } from 'next/server';
import { parseJsonObject } from '@/src/lib/security';
import { createSupabaseServerClient } from '@/src/lib/supabase/server';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function POST(request: NextRequest) {
  const body = await parseJsonObject(request);
  if (!body) return NextResponse.json({ error: 'Requête invalide.' }, { status: 400 });

  const chipId = typeof body.chipId === 'string' ? body.chipId.trim() : '';
  const activationCode = typeof body.activationCode === 'string' ? body.activationCode.trim() : '';
  const name = typeof body.name === 'string' ? body.name.trim() : '';
  const googleReviewUrl = typeof body.googleReviewUrl === 'string' ? body.googleReviewUrl.trim() : '';
  const address = typeof body.address === 'string' ? body.address.trim() : '';
  if (!UUID_PATTERN.test(chipId) || activationCode.length < 24 || activationCode.length > 40 ||
      name.length < 2 || name.length > 120 || address.length > 200 ||
      googleReviewUrl.length > 2048) {
    return NextResponse.json({ error: 'Vérifiez les informations de la puce et du restaurant.' }, { status: 400 });
  }

  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: 'Connectez-vous pour activer cette puce.' }, { status: 401 });

    const { data: restaurantId, error } = await supabase.rpc('activate_chip_with_owner', {
      p_chip_id: chipId,
      p_activation_code: activationCode,
      p_restaurant_name: name,
      p_google_review_url: googleReviewUrl,
      p_address: address
    });
    if (error) {
      console.error('Chip activation failed.', error);
      const status = error.code === '42501' ? 403
        : error.code === 'P0002' || error.code === '23505' ? 409
          : error.code === '22023' ? 400 : 503;
      return NextResponse.json({
        error: status === 409 ? 'Code incorrect, puce déjà utilisée ou activation déjà effectuée.'
          : status === 403 ? 'Ce compte ne peut pas activer une puce.'
            : status === 400 ? 'Le lien Google ou les informations du restaurant sont invalides.'
              : 'L’activation est momentanément indisponible.'
      }, { status });
    }

    return NextResponse.json({ restaurantId }, { status: 201 });
  } catch (error) {
    console.error('Chip activation service is unavailable.', error);
    return NextResponse.json({ error: 'Le service d’activation est indisponible.' }, { status: 503 });
  }
}
