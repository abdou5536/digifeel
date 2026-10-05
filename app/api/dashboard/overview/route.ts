import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedAppUser } from '@/src/lib/supabase/auth';
import { getRestaurantDashboardContext, hasActiveDashboardAccess } from '@/src/lib/supabase/dashboard';
import { createSupabaseServerClient } from '@/src/lib/supabase/server';

const ALLOWED_PERIODS = new Set([7, 30, 90, 365]);

export async function GET(request: NextRequest) {
  try {
    const current = await getAuthenticatedAppUser();
    if (!current) return NextResponse.json({ error: 'Connectez-vous pour ouvrir votre espace.' }, { status: 401 });
    if (!['restaurant_admin', 'server'].includes(current.profile.role)) {
      return NextResponse.json({ error: 'Cet espace est réservé aux restaurateurs et aux serveurs.' }, { status: 403 });
    }

    const rawDays = Number(request.nextUrl.searchParams.get('days') ?? 30);
    if (!Number.isInteger(rawDays) || !ALLOWED_PERIODS.has(rawDays)) {
      return NextResponse.json({ error: 'Choisissez une période de 7, 30, 90 ou 365 jours.' }, { status: 400 });
    }
    if (!current.profile.restaurant_id) return NextResponse.json({ unconfigured: true }, { status: 200 });

    const { restaurant, subscription } = await getRestaurantDashboardContext(current);
    if (!restaurant) return NextResponse.json({ error: 'Le restaurant associé à ce compte est introuvable.' }, { status: 404 });

    const hasAccess = hasActiveDashboardAccess(subscription);
    if (!hasAccess) {
      return NextResponse.json({
        restaurant,
        subscription,
        hasAccess: false,
        role: current.profile.role,
        displayName: current.profile.display_name,
        periodDays: rawDays
      });
    }

    const to = new Date();
    const from = new Date(Date.UTC(to.getUTCFullYear(), to.getUTCMonth(), to.getUTCDate() - rawDays + 1));
    const supabase = await createSupabaseServerClient();
    const { data: summary, error } = await supabase.rpc('get_dashboard_summary', {
      p_from: from.toISOString(),
      p_to: to.toISOString()
    });
    if (error) throw error;

    return NextResponse.json({
      restaurant,
      subscription,
      hasAccess: true,
      role: current.profile.role,
      displayName: current.profile.display_name,
      periodDays: rawDays,
      scansCount: summary?.scans_count ?? 0,
      scansByDay: summary?.scans_by_day ?? [],
      reviewCount: summary?.review_count ?? 0,
      averageRating: summary?.average_rating ?? 0,
      reviews: summary?.reviews ?? [],
      servers: summary?.servers ?? []
    });
  } catch (error) {
    console.error('Restaurant dashboard data could not be loaded.', error);
    return NextResponse.json({ error: 'Le tableau de bord est momentanément indisponible.' }, { status: 503 });
  }
}
