import { NextResponse } from 'next/server';
import { withTeamSession } from '@/src/lib/billingApi';

export async function GET() {
  return withTeamSession(async supabase => {
    const { data, error } = await supabase
      .from('payments')
      .select('id, amount_dzd, tip_dzd, method, created_at, bills!inner(table_label)')
      .eq('status', 'pending')
      .in('method', ['cash', 'baridimob'])
      .order('created_at', { ascending: false })
      .limit(50);
    if (error) {
      console.error('Pending guest payments could not be loaded.', error);
      return NextResponse.json({ error: 'Les paiements à valider sont indisponibles.' }, { status: 503 });
    }
    const { data: restaurant } = await supabase.from('restaurants').select('currency').limit(1).maybeSingle();
    return NextResponse.json({ payments: data ?? [], currency: restaurant?.currency === 'EUR' ? 'EUR' : 'DZD' }, { headers: { 'Cache-Control': 'no-store' } });
  });
}
