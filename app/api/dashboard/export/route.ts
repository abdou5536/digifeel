import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedAppUser } from '@/src/lib/supabase/auth';
import { getRestaurantDashboardContext, hasActiveDashboardAccess } from '@/src/lib/supabase/dashboard';
import { createSupabaseServerClient } from '@/src/lib/supabase/server';

const ALLOWED_PERIODS = new Set([7, 30, 90, 365]);
const PAGE_SIZE = 500;

export async function GET(request: NextRequest) {
  try {
    const current = await getAuthenticatedAppUser();
    if (!current) return NextResponse.json({ error: 'Connectez-vous pour exporter vos données.' }, { status: 401 });
    if (!['restaurant_admin', 'server'].includes(current.profile.role) || !current.profile.restaurant_id) {
      return NextResponse.json({ error: 'Aucun restaurant n’est associé à ce compte.' }, { status: 403 });
    }

    const days = Number(request.nextUrl.searchParams.get('days') ?? 30);
    if (!Number.isInteger(days) || !ALLOWED_PERIODS.has(days)) {
      return NextResponse.json({ error: 'Choisissez une période de 7, 30, 90 ou 365 jours.' }, { status: 400 });
    }

    const { restaurant, subscription } = await getRestaurantDashboardContext(current);
    if (!restaurant) return NextResponse.json({ error: 'Le restaurant associé à ce compte est introuvable.' }, { status: 404 });
    if (!restaurant.active || !hasActiveDashboardAccess(subscription)) {
      return NextResponse.json({ error: 'Les exports nécessitent un abonnement actif. Les puces continuent de fonctionner.' }, { status: 403 });
    }

    const to = new Date();
    const from = new Date(Date.UTC(to.getUTCFullYear(), to.getUTCMonth(), to.getUTCDate() - days + 1));
    const supabase = await createSupabaseServerClient();
    const { data: summary, error: summaryError } = await supabase.rpc('get_dashboard_summary', {
      p_from: from.toISOString(),
      p_to: to.toISOString()
    });
    if (summaryError) throw summaryError;

    const reviews: Array<{
      id: string;
      stars: number;
      comment: string;
      created_at: string;
      server_id: string | null;
      servers: { name: string } | Array<{ name: string }> | null;
    }> = [];
    for (let offset = 0; ; offset += PAGE_SIZE) {
      const { data, error } = await supabase
        .from('reviews')
        .select('id,stars,comment,created_at,server_id,servers(name)')
        .eq('restaurant_id', current.profile.restaurant_id)
        .gte('created_at', from.toISOString())
        .lt('created_at', to.toISOString())
        .order('created_at', { ascending: false })
        .range(offset, offset + PAGE_SIZE - 1);
      if (error) throw error;
      reviews.push(...(data ?? []));
      if (!data || data.length < PAGE_SIZE) break;
    }

    const allScansByDay = current.profile.role === 'restaurant_admin' ? summary?.scans_by_day ?? [] : [];
    return NextResponse.json({
      restaurantName: restaurant.name,
      periodDays: days,
      generatedAt: to.toISOString(),
      scansCount: current.profile.role === 'restaurant_admin' ? summary?.scans_count ?? 0 : 0,
      scansByDay: allScansByDay,
      reviewCount: summary?.review_count ?? reviews.length,
      averageRating: summary?.average_rating ?? 0,
      reviews: reviews.map(review => ({
        id: review.id,
        stars: review.stars,
        comment: review.comment,
        created_at: review.created_at,
        server_id: review.server_id,
        server_name: Array.isArray(review.servers) ? review.servers[0]?.name ?? null : review.servers?.name ?? null
      }))
    }, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) {
    console.error('Restaurant data export could not be prepared.', error);
    return NextResponse.json({ error: 'Les données n’ont pas pu être exportées.' }, { status: 503 });
  }
}
