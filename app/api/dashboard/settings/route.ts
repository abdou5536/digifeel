import { NextRequest, NextResponse } from 'next/server';
import { isValidGoogleReviewUrl, parseJsonObject } from '@/src/lib/security';
import { getAuthenticatedAppUser } from '@/src/lib/supabase/auth';
import { createSupabaseServerClient } from '@/src/lib/supabase/server';

export async function PATCH(request: NextRequest) {
  const body = await parseJsonObject(request);
  const name = typeof body?.name === 'string' ? body.name.trim() : '';
  const address = typeof body?.address === 'string' ? body.address.trim() : '';
  const googleReviewUrl = body?.googleReviewUrl;
  const tipEnabled = body?.tipEnabled;
  const logoUrl = typeof body?.logoUrl === 'string' ? body.logoUrl.trim() : '';
  if (name.length < 2 || name.length > 120 || address.length > 200 ||
      !isValidGoogleReviewUrl(googleReviewUrl) || typeof tipEnabled !== 'boolean' ||
      logoUrl.length > 2048 || (logoUrl !== '' && !/^(https:\/\/|data:image\/svg\+xml;base64,)/i.test(logoUrl))) {
    return NextResponse.json({ error: 'Vérifiez le nom, l’adresse et le lien Google.' }, { status: 400 });
  }

  try {
    const current = await getAuthenticatedAppUser();
    if (!current) return NextResponse.json({ error: 'Authentification requise.' }, { status: 401 });
    if (current.profile.role !== 'restaurant_admin' || !current.profile.restaurant_id) {
      return NextResponse.json({ error: 'Accès réservé au restaurateur.' }, { status: 403 });
    }
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.from('restaurants').update({
      name,
      address: address || null,
      google_review_url: googleReviewUrl,
      tip_enabled: tipEnabled,
      logo_url: logoUrl || null,
      updated_at: new Date().toISOString()
    }).eq('id', current.profile.restaurant_id);
    if (error) throw error;
    return NextResponse.json({ saved: true });
  } catch (error) {
    console.error('Restaurant settings could not be saved.', error);
    return NextResponse.json({ error: 'Les réglages n’ont pas pu être enregistrés.' }, { status: 503 });
  }
}
