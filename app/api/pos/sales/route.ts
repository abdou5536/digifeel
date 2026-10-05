import { NextRequest, NextResponse } from 'next/server';
import { parseJsonObject } from '@/src/lib/security';
import { getAuthenticatedAppUser } from '@/src/lib/supabase/auth';
import { createSupabaseServerClient } from '@/src/lib/supabase/server';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const PAYMENT_METHODS = new Set(['cash', 'card', 'baridimob']);

export async function GET(request: NextRequest) {
  try {
    const current = await getAuthenticatedAppUser();
    if (!current) return NextResponse.json({ error: 'Connectez-vous pour consulter les ventes.' }, { status: 401 });
    if (!['restaurant_admin', 'server'].includes(current.profile.role) || !current.profile.restaurant_id) {
      return NextResponse.json({ error: 'Aucun restaurant n’est associé à ce compte.' }, { status: 403 });
    }

    const supabase = await createSupabaseServerClient();
    let query = supabase.from('pos_sales')
      .select('id,total_dzd,payment_method,payment_reference,sync_source,sold_at,pos_sale_items(product_name,quantity,unit_price_dzd,line_total_dzd)')
      .eq('restaurant_id', current.profile.restaurant_id)
      .order('sold_at', { ascending: false })
      .limit(100);
    if (request.nextUrl.searchParams.get('period') === 'today') {
      const now = new Date();
      const parts = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Africa/Algiers',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      }).formatToParts(now);
      const value = (type: string) => parts.find(part => part.type === type)?.value ?? '';
      const startOfDay = new Date(`${value('year')}-${value('month')}-${value('day')}T00:00:00+01:00`);
      query = query.gte('sold_at', startOfDay.toISOString());
    }
    const { data, error } = await query;
    if (error) throw error;
    return NextResponse.json({ sales: data ?? [] }, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) {
    console.error('POS sales could not be loaded.', error);
    return NextResponse.json({ error: 'L’historique des ventes n’a pas pu être chargé.' }, { status: 503 });
  }
}

export async function POST(request: NextRequest) {
  const body = await parseJsonObject(request);
  const saleId = typeof body?.id === 'string' ? body.id : '';
  const paymentMethod = typeof body?.paymentMethod === 'string' ? body.paymentMethod : '';
  const paymentReference = typeof body?.paymentReference === 'string' ? body.paymentReference.trim() : '';
  const syncSource = body?.syncSource;
  const soldAt = typeof body?.soldAt === 'string' ? body.soldAt : '';
  const items = body?.items;
  if (!UUID_PATTERN.test(saleId) || !PAYMENT_METHODS.has(paymentMethod) ||
      paymentReference.length > 120 ||
      (syncSource !== 'online' && syncSource !== 'offline') ||
      !Number.isFinite(Date.parse(soldAt)) ||
      !Array.isArray(items) || items.length < 1 || items.length > 100 ||
      items.some(item => !item || typeof item !== 'object' ||
        typeof item.productId !== 'string' || !UUID_PATTERN.test(item.productId) ||
        !Number.isInteger(item.quantity) || item.quantity < 1 || item.quantity > 100 ||
        !Number.isInteger(item.priceDzd) || item.priceDzd < 0 || item.priceDzd > 100_000_000)) {
    return NextResponse.json({ error: 'Vérifiez le ticket et son mode de paiement.' }, { status: 400 });
  }

  try {
    const current = await getAuthenticatedAppUser();
    if (!current) return NextResponse.json({ error: 'Authentification requise.' }, { status: 401 });
    if (!['restaurant_admin', 'server'].includes(current.profile.role) || !current.profile.restaurant_id) {
      return NextResponse.json({ error: 'Aucun restaurant n’est associé à ce compte.' }, { status: 403 });
    }

    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.rpc('submit_pos_sale', {
      p_sale_id: saleId,
      p_items: items,
      p_payment_method: paymentMethod,
      p_payment_reference: paymentReference || null,
      p_sync_source: syncSource,
      p_sold_at: soldAt
    });
    if (error) {
      console.error('POS sale could not be saved.', error);
      const status = error.code === '42501' ? 403
        : error.code === '23505' ? 409
          : error.code === '22023' ? 409
            : 503;
      return NextResponse.json({
        error: status === 409
          ? 'Le menu a changé depuis la création de ce ticket. Vérifiez le prix et créez un nouveau ticket.'
          : status === 403 ? 'Votre compte ne peut pas enregistrer cette vente.'
            : 'La vente n’a pas pu être synchronisée.'
      }, { status });
    }
    return NextResponse.json({ id: data, synced: true });
  } catch (error) {
    console.error('POS sale service is unavailable.', error);
    return NextResponse.json({ error: 'La vente est conservée localement et sera synchronisée au retour du réseau.' }, { status: 503 });
  }
}
