import { NextRequest, NextResponse } from 'next/server';
import { parseJsonObject } from '@/src/lib/security';
import { requireSuperAdmin } from '@/src/lib/supabase/requireSuperAdmin';
import { createSupabaseServiceClient } from '@/src/lib/supabase/server';
import { computeStarBonus } from '@/src/lib/billing/starBonus';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const PERIOD = /^\d{4}-(0[1-9]|1[0-2])$/;

export async function POST(request: NextRequest) {
  const denied = await requireSuperAdmin();
  if (denied) return denied;

  const body = await parseJsonObject(request);
  const restaurantId = typeof body?.restaurantId === 'string' ? body.restaurantId : '';
  const action = body?.action;
  if (!UUID.test(restaurantId) || !['baseline', 'snapshot', 'invoice'].includes(action as string)) {
    return NextResponse.json({ error: 'Requête invalide.' }, { status: 400 });
  }

  const supabase = createSupabaseServiceClient();
  try {
    if (action === 'baseline' || action === 'snapshot') {
      const rating = body?.rating;
      const reviewCount = body?.reviewCount ?? null;
      if (typeof rating !== 'number' || rating < 0 || rating > 5 ||
          (reviewCount !== null && (!Number.isInteger(reviewCount) || (reviewCount as number) < 0))) {
        return NextResponse.json({ error: 'Note (0 à 5) ou nombre d’avis invalide.' }, { status: 400 });
      }
      const { error } = await supabase.from('star_ratings').insert({
        restaurant_id: restaurantId,
        kind: action,
        rating: Math.round(rating * 10) / 10,
        review_count: reviewCount
      });
      if (error) throw error;
      return NextResponse.json({ ok: true }, { status: 201 });
    }

    const period = typeof body?.period === 'string' ? body.period : '';
    if (!PERIOD.test(period)) return NextResponse.json({ error: 'Période invalide (AAAA-MM).' }, { status: 400 });

    const [{ data: ratings, error: ratingsError }, { data: billed, error: billedError }] = await Promise.all([
      supabase.from('star_ratings').select('kind,rating,observed_at').eq('restaurant_id', restaurantId).order('observed_at', { ascending: false }),
      supabase.from('star_billed_tiers').select('tier_id,period,amount_cents').eq('restaurant_id', restaurantId)
    ]);
    if (ratingsError) throw ratingsError;
    if (billedError) throw billedError;

    const end = new Date(Date.UTC(Number(period.slice(0, 4)), Number(period.slice(5, 7)), 1)).toISOString();
    const baseline = ratings?.find(row => row.kind === 'baseline');
    const latest = ratings?.find(row => row.kind === 'snapshot' && row.observed_at < end);
    const result = computeStarBonus({
      period,
      baseline: baseline ? { rating: Number(baseline.rating), establishedAt: baseline.observed_at } : null,
      latest: latest ? { rating: Number(latest.rating), observedAt: latest.observed_at } : null,
      billedTierIds: (billed ?? []).map(row => row.tier_id),
      alreadyBilledThisPeriodCents: (billed ?? []).filter(row => row.period === period).reduce((sum, row) => sum + row.amount_cents, 0)
    });
    if (!result.eligible) return NextResponse.json({ error: result.reason, result }, { status: 422 });

    const line = result.lines[0];
    const { error } = await supabase.from('star_billed_tiers').insert({
      restaurant_id: restaurantId, tier_id: line.tierId, period, amount_cents: line.amountCents
    });
    if (error) {
      if (error.code === '23505') return NextResponse.json({ error: 'Ce palier a déjà été facturé.' }, { status: 409 });
      throw error;
    }
    return NextResponse.json({ result }, { status: 201 });
  } catch (error) {
    console.error('Star bonus action failed.', error);
    return NextResponse.json({ error: 'L’opération n’a pas pu être enregistrée.' }, { status: 503 });
  }
}
