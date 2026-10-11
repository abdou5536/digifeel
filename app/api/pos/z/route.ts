import { NextResponse } from 'next/server';
import { getAuthenticatedAppUser } from '@/src/lib/supabase/auth';
import { createSupabaseServerClient } from '@/src/lib/supabase/server';
import { rpcErrorResponse } from '@/src/lib/billingApi';

const NO_STORE = { 'Cache-Control': 'private, no-store' };

export async function GET() {
  const current = await getAuthenticatedAppUser();
  if (!current) return NextResponse.json({ error: 'Authentification requise.' }, { status: 401 });
  if (current.profile.role !== 'restaurant_admin' || !current.profile.restaurant_id) {
    return NextResponse.json({ error: 'Réservé au responsable du restaurant.' }, { status: 403 });
  }
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.from('pos_z_reports')
    .select('id,number,sales_count,reversals_count,totals_by_method,net_total_dzd,closed_at')
    .eq('restaurant_id', current.profile.restaurant_id)
    .order('number', { ascending: false })
    .limit(30);
  if (error) {
    console.error('Z reports could not be loaded.', error);
    return NextResponse.json({ error: 'Les clôtures n’ont pas pu être chargées.' }, { status: 503 });
  }
  return NextResponse.json({ reports: data ?? [] }, { headers: NO_STORE });
}

export async function POST() {
  const current = await getAuthenticatedAppUser();
  if (!current) return NextResponse.json({ error: 'Authentification requise.' }, { status: 401 });
  if (current.profile.role !== 'restaurant_admin' || !current.profile.restaurant_id) {
    return NextResponse.json({ error: 'Seul le responsable peut clôturer la caisse.' }, { status: 403 });
  }
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc('close_pos_day');
  if (error) {
    console.error('POS day could not be closed.', error);
    return rpcErrorResponse(error, { 404: 'Aucune vente à clôturer depuis le dernier Z.' });
  }
  return NextResponse.json({ ok: true });
}
