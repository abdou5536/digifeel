import { NextResponse } from 'next/server';
import { withTeamSession } from '@/src/lib/billingApi';

export async function GET() {
  return withTeamSession(async supabase => {
    const [guestResult, cardResult] = await Promise.all([
      supabase.from('payments')
        .select('id, bill_id, amount_dzd, tip_dzd, method, created_at, bills!inner(id, table_label, status)')
        .eq('status', 'pending')
        .in('method', ['cash', 'baridimob'])
        .order('created_at', { ascending: false })
        .limit(50),
      supabase.from('payments')
        .select('id, bill_id, amount_dzd, tip_dzd, method, created_at, bills!inner(id, table_label, status)')
        .eq('status', 'pending')
        .eq('method', 'card')
        .order('created_at', { ascending: false })
        .limit(50)
    ]);
    if (guestResult.error) {
      console.error('Pending guest payments could not be loaded.', guestResult.error);
      return NextResponse.json({ error: 'Les paiements à valider sont indisponibles.' }, { status: 503 });
    }
    if (cardResult.error) {
      console.error('Pending POS card payments could not be loaded.', cardResult.error);
      return NextResponse.json({ error: 'Les paiements carte à valider sont indisponibles.' }, { status: 503 });
    }
    const { data: restaurant, error: restaurantError } = await supabase.from('restaurants').select('currency').limit(1).maybeSingle();
    if (restaurantError) {
      console.error('Restaurant payment currency could not be loaded.', restaurantError);
      return NextResponse.json({ error: 'La devise des paiements est indisponible.' }, { status: 503 });
    }
    const payments = [...(guestResult.data ?? []), ...(cardResult.data ?? [])]
      .sort((left, right) => right.created_at.localeCompare(left.created_at));
    return NextResponse.json({ payments, currency: restaurant?.currency === 'EUR' ? 'EUR' : 'DZD' }, { headers: { 'Cache-Control': 'no-store' } });
  });
}
