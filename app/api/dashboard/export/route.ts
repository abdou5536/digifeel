import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedAppUser } from '@/src/lib/supabase/auth';
import { getRestaurantDashboardContext, hasActiveDashboardAccess } from '@/src/lib/supabase/dashboard';
import { createSupabaseServerClient, createSupabaseServiceClient } from '@/src/lib/supabase/server';
import { buildSalesReport } from '@/src/lib/pos/salesReport';

const ALLOWED_PERIODS = new Set([7, 30, 90, 365]);
const PAGE_SIZE = 500;
const STAR_TIER_LABELS: Record<string, string> = {
  'half-star': '+0,5 étoile',
  'one-star': '+1 étoile',
  'three-stars': '+3 étoiles'
};

export async function GET(request: NextRequest) {
  try {
    const current = await getAuthenticatedAppUser();
    if (!current) return NextResponse.json({ error: 'Connectez-vous pour exporter vos données.' }, { status: 401 });
    if (!['restaurant_admin', 'server'].includes(current.profile.role) || !current.profile.restaurant_id) {
      return NextResponse.json({ error: 'Aucun restaurant n’est associé à ce compte.' }, { status: 403 });
    }

    const month = request.nextUrl.searchParams.get('month');
    let days = Number(request.nextUrl.searchParams.get('days') ?? 30);
    let monthRange: { from: Date; to: Date } | null = null;
    if (month !== null) {
      const match = /^(\d{4})-(0[1-9]|1[0-2])$/.exec(month);
      if (!match) return NextResponse.json({ error: 'Mois invalide (AAAA-MM).' }, { status: 400 });
      const start = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, 1));
      if (start.getTime() > Date.now()) return NextResponse.json({ error: 'Ce mois n’a pas encore commencé.' }, { status: 400 });
      const end = new Date(Date.UTC(Number(match[1]), Number(match[2]), 1));
      monthRange = { from: start, to: end.getTime() > Date.now() ? new Date() : end };
      days = Math.round((end.getTime() - start.getTime()) / 86400000);
    } else if (!Number.isInteger(days) || !ALLOWED_PERIODS.has(days)) {
      return NextResponse.json({ error: 'Choisissez une période de 7, 30, 90 ou 365 jours.' }, { status: 400 });
    }

    const { restaurant, subscription } = await getRestaurantDashboardContext(current);
    if (!restaurant) return NextResponse.json({ error: 'Le restaurant associé à ce compte est introuvable.' }, { status: 404 });
    if (!restaurant.active || !hasActiveDashboardAccess(subscription)) {
      return NextResponse.json({ error: 'Les exports nécessitent un abonnement actif. Les puces continuent de fonctionner.' }, { status: 403 });
    }

    const to = monthRange?.to ?? new Date();
    const from = monthRange?.from ?? new Date(Date.UTC(to.getUTCFullYear(), to.getUTCMonth(), to.getUTCDate() - days + 1));
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
      handled_at: string | null;
      servers: { name: string } | Array<{ name: string }> | null;
    }> = [];
    for (let offset = 0; ; offset += PAGE_SIZE) {
      const { data, error } = await supabase
        .from('reviews')
        .select('id,stars,comment,created_at,server_id,handled_at,servers(name)')
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
    const sales = await buildSalesReport(supabase, createSupabaseServiceClient(), current.profile.restaurant_id, from, to, { includeLines: true });
    const { data: money } = await supabase.from('restaurants').select('currency,vat_rate_bp').eq('id', current.profile.restaurant_id).maybeSingle();
    const { data: billedTiers } = current.profile.role === 'restaurant_admin'
      ? await supabase.from('star_billed_tiers').select('tier_id,period,amount_cents').eq('restaurant_id', current.profile.restaurant_id).gte('period', from.toISOString().slice(0, 7)).lte('period', to.toISOString().slice(0, 7)).order('period')
      : { data: [] };
    const starBonus = (billedTiers ?? []).map(row => ({
      period: row.period,
      tierLabel: STAR_TIER_LABELS[row.tier_id] ?? row.tier_id,
      amountCents: row.amount_cents
    }));
    return NextResponse.json({
      restaurantName: restaurant.name,
      logoUrl: (restaurant as { logo_url?: string | null }).logo_url ?? null,
      starBonus,
      currency: money?.currency ?? 'DZD',
      vatRateBp: money?.vat_rate_bp ?? 0,
      periodDays: days,
      generatedAt: to.toISOString(),
      periodFrom: from.toISOString(),
      role: current.profile.role,
      sales,
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
        handled: Boolean(review.handled_at),
        server_name: Array.isArray(review.servers) ? review.servers[0]?.name ?? null : review.servers?.name ?? null
      }))
    }, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) {
    console.error('Restaurant data export could not be prepared.', error);
    return NextResponse.json({ error: 'Les données n’ont pas pu être exportées.' }, { status: 503 });
  }
}
