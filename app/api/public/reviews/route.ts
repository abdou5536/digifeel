import { NextRequest, NextResponse } from 'next/server';
import { hashRequestDevice, parseJsonObject } from '@/src/lib/security';
import { reviewSchema } from '@/src/lib/schemas';
import { createSupabaseServiceClient } from '@/src/lib/supabase/server';

export async function POST(request: NextRequest) {
  const parsed = reviewSchema.safeParse(await parseJsonObject(request));
  if (!parsed.success) {
    return NextResponse.json({ error: 'Vérifiez votre note et votre commentaire.' }, { status: 400 });
  }
  const { chipId, stars, comment, serverId, tipAmountMinor } = parsed.data;
  const body = parsed.data;
  try {
    const supabase = createSupabaseServiceClient();
    const deviceHash = hashRequestDevice(request, body?.deviceId);
    const { data, error } = await supabase.rpc('submit_public_review', {
      p_chip_id: chipId,
      p_device_hash: deviceHash,
      p_stars: stars,
      p_comment: comment,
      p_server_id: serverId,
      p_tip_amount_minor: tipAmountMinor
    });
    if (error) {
      console.error('Public review could not be saved.', error);
      const status = error.code === '54000' ? 429
        : error.code === 'P0002' ? 404
          : error.code === '22023' ? 400 : 503;
      return NextResponse.json({
        error: status === 429 ? 'Trop d’avis envoyés. Réessayez plus tard.'
          : status === 404 ? 'Cette puce n’est plus active.'
            : status === 400 ? 'Le serveur choisi n’est pas disponible.'
              : 'Votre avis n’a pas pu être enregistré.'
      }, { status });
    }
    return NextResponse.json(data);
  } catch (error) {
    console.error('Public review service is unavailable.', error);
    return NextResponse.json({ error: 'Le service des avis est momentanément indisponible.' }, { status: 503 });
  }
}
