import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedAppUser } from '@/src/lib/supabase/auth';
import { createSupabaseServerClient, createSupabaseServiceClient } from '@/src/lib/supabase/server';
import { buildSalesReport } from '@/src/lib/pos/salesReport';

const ALLOWED_PERIODS = new Set([7, 30, 90, 365]);

export async function GET(request: NextRequest) {
  try {
    const current = await getAuthenticatedAppUser();
    if (!current) return NextResponse.json({ error: 'Connectez-vous pour voir les ventes.' }, { status: 401 });
    if (!['restaurant_admin', 'server'].includes(current.profile.role) || !current.profile.restaurant_id) {
      return NextResponse.json({ error: 'Aucun restaurant n’est associé à ce compte.' }, { status: 403 });
    }
    const days = Number(request.nextUrl.searchParams.get('days') ?? 30);
    if (!Number.isInteger(days) || !ALLOWED_PERIODS.has(days)) {
      return NextResponse.json({ error: 'Choisissez une période de 7, 30, 90 ou 365 jours.' }, { status: 400 });
    }
    const to = new Date();
    const from = new Date(Date.UTC(to.getUTCFullYear(), to.getUTCMonth(), to.getUTCDate() - days + 1));
    const report = await buildSalesReport(await createSupabaseServerClient(), createSupabaseServiceClient(), current.profile.restaurant_id, from, to);
    return NextResponse.json(report, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) {
    console.error('Sales report could not be prepared.', error);
    return NextResponse.json({ error: 'Les ventes n’ont pas pu être chargées.' }, { status: 503 });
  }
}
