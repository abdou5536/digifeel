import { NextRequest, NextResponse } from 'next/server';
import { isValidGoogleReviewUrl, parseJsonObject } from '@/src/lib/security';
import { getAuthenticatedAppUser } from '@/src/lib/supabase/auth';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  const body = await parseJsonObject(request);
  const restaurantId = typeof body?.restaurantId === 'string' ? body.restaurantId : '';
  const restaurantName = typeof body?.restaurantName === 'string' ? body.restaurantName.trim() : '';
  const city = typeof body?.city === 'string' ? body.city.trim() : '';
  const googleReviewUrl = typeof body?.googleReviewUrl === 'string' ? body.googleReviewUrl.trim() : '';
  if (restaurantId.length < 1 || restaurantId.length > 80 || restaurantName.length < 2 || restaurantName.length > 120 || city.length > 100 || !isValidGoogleReviewUrl(googleReviewUrl)) {
    return NextResponse.json({ error: 'Vérifiez le nom du restaurant, la ville et le lien Google Avis.' }, { status: 400 });
  }
  try {
    const current = await getAuthenticatedAppUser();
    if (!current) {
      return NextResponse.json({ error: 'Connectez-vous pour récupérer la note Google.' }, { status: 401 });
    }
    if (current.profile.role !== 'super_admin' && (current.profile.role !== 'restaurant_admin' || current.profile.restaurant_id !== restaurantId)) {
      return NextResponse.json({ error: 'Authentification gérant requise pour interroger Google Places.' }, { status: 403 });
    }
    const apiKey = process.env.GOOGLE_PLACES_API_KEY;
    if (!apiKey) return NextResponse.json({ error: 'API Google Places non configurée. Vous pouvez saisir la note manuellement.' }, { status: 503 });
    const query = new URLSearchParams({
      input: [restaurantName, city].filter(Boolean).join(' '),
      inputtype: 'textquery',
      fields: 'place_id,name,rating,user_ratings_total',
      key: apiKey
    });
    const response = await fetch(`https://maps.googleapis.com/maps/api/place/findplacefromtext/json?${query}`, {
      signal: AbortSignal.timeout(8000),
      cache: 'no-store'
    });
    if (!response.ok) throw new Error(`Google Places a répondu ${response.status}.`);
    const result: unknown = await response.json();
    if (!result || typeof result !== 'object') throw new Error('Réponse Google Places invalide.');
    const payload = result as { status?: string; candidates?: Array<{ rating?: number; user_ratings_total?: number }> };
    const candidate = payload.candidates?.[0];
    if (payload.status !== 'OK' || !candidate || typeof candidate.rating !== 'number' || typeof candidate.user_ratings_total !== 'number') {
      return NextResponse.json({ error: 'Aucun établissement avec une note exploitable trouvé. Saisissez-la manuellement.' }, { status: 404 });
    }
    return NextResponse.json({
      rating: candidate.rating,
      reviewCount: candidate.user_ratings_total,
      observedAt: new Date().toISOString(),
      source: 'google_places'
    }, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) {
    console.error('Google Places rating could not be fetched.', error);
    return NextResponse.json({ error: 'La note Google n’a pas pu être récupérée. Vous pouvez la saisir manuellement.' }, { status: 502 });
  }
}
