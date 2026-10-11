import { NextRequest, NextResponse } from 'next/server';
import { isValidGoogleReviewUrl, parseJsonObject } from '@/src/lib/security';
import { getAuthenticatedAppUser } from '@/src/lib/supabase/auth';
import { createSupabaseServerClient } from '@/src/lib/supabase/server';

export async function GET() {
  try {
    const current = await getAuthenticatedAppUser();
    if (!current) return NextResponse.json({ error: 'Authentification requise.' }, { status: 401 });
    if (current.profile.role !== 'restaurant_admin' || !current.profile.restaurant_id) {
      return NextResponse.json({ error: 'Accès réservé au restaurateur.' }, { status: 403 });
    }
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.from('restaurants')
      .select('baridimob_rip, baridimob_phone')
      .eq('id', current.profile.restaurant_id)
      .maybeSingle();
    if (error) throw error;
    if (!data) return NextResponse.json({ error: 'Restaurant introuvable.' }, { status: 404 });
    return NextResponse.json({
      baridimobRip: data.baridimob_rip ?? '',
      baridimobPhone: data.baridimob_phone ?? ''
    }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    console.error('Restaurant payment settings could not be loaded.', error);
    return NextResponse.json({ error: 'Les réglages de paiement sont indisponibles.' }, { status: 503 });
  }
}

export async function PATCH(request: NextRequest) {
  const body = await parseJsonObject(request);
  const name = typeof body?.name === 'string' ? body.name.trim() : '';
  const address = typeof body?.address === 'string' ? body.address.trim() : '';
  const googleReviewUrl = body?.googleReviewUrl;
  const tipEnabled = body?.tipEnabled;
  const logoUrl = typeof body?.logoUrl === 'string' ? body.logoUrl.trim() : '';
  const baridimobRip = typeof body?.baridimobRip === 'string' ? body.baridimobRip.trim() : '';
  const baridimobPhone = typeof body?.baridimobPhone === 'string' ? body.baridimobPhone.trim() : '';
  if (name.length < 2 || name.length > 120 || address.length > 200 ||
      !isValidGoogleReviewUrl(googleReviewUrl) || typeof tipEnabled !== 'boolean' ||
      logoUrl.length > 2048 || (logoUrl !== '' && !/^(https:\/\/|data:image\/svg\+xml;base64,)/i.test(logoUrl)) ||
      (body?.baridimobRip !== undefined && (typeof body.baridimobRip !== 'string' || baridimobRip.length > 34)) ||
      (body?.baridimobPhone !== undefined && (typeof body.baridimobPhone !== 'string' || baridimobPhone.length > 32))) {
    return NextResponse.json({ error: 'Vérifiez le nom, l’adresse et le lien Google.' }, { status: 400 });
  }

  try {
    const current = await getAuthenticatedAppUser();
    if (!current) return NextResponse.json({ error: 'Authentification requise.' }, { status: 401 });
    if (current.profile.role !== 'restaurant_admin' || !current.profile.restaurant_id) {
      return NextResponse.json({ error: 'Accès réservé au restaurateur.' }, { status: 403 });
    }
    const supabase = await createSupabaseServerClient();
    const patch: Record<string, string | boolean | null> = {
      name,
      address: address || null,
      google_review_url: googleReviewUrl,
      tip_enabled: tipEnabled,
      logo_url: logoUrl || null,
      updated_at: new Date().toISOString()
    };
    if (body?.baridimobRip !== undefined) patch.baridimob_rip = baridimobRip || null;
    if (body?.baridimobPhone !== undefined) patch.baridimob_phone = baridimobPhone || null;
    const { error } = await supabase.from('restaurants').update(patch).eq('id', current.profile.restaurant_id);
    if (error) throw error;
    return NextResponse.json({ saved: true });
  } catch (error) {
    console.error('Restaurant settings could not be saved.', error);
    return NextResponse.json({ error: 'Les réglages n’ont pas pu être enregistrés.' }, { status: 503 });
  }
}
