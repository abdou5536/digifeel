import { NextRequest, NextResponse } from 'next/server';
import { parseJsonObject } from '@/src/lib/security';
import { getAuthenticatedAppUser } from '@/src/lib/supabase/auth';
import { createSupabaseServerClient } from '@/src/lib/supabase/server';

const MAX_PRICE_DZD = 100_000_000;

export async function GET() {
  try {
    const current = await getAuthenticatedAppUser();
    if (!current) return NextResponse.json({ error: 'Connectez-vous pour ouvrir la caisse.' }, { status: 401 });
    if (current.profile.role === 'restaurant_admin' && !current.profile.restaurant_id) {
      return NextResponse.json({ unconfigured: true, products: [] });
    }
    if (!['restaurant_admin', 'server'].includes(current.profile.role) || !current.profile.restaurant_id) {
      return NextResponse.json({ error: 'Aucun restaurant n’est associé à ce compte.' }, { status: 403 });
    }

    const supabase = await createSupabaseServerClient();
    const [restaurantResult, productsResult] = await Promise.all([
      supabase.from('restaurants').select('id,name').eq('id', current.profile.restaurant_id).maybeSingle(),
      supabase.from('pos_products')
        .select('id,name,category,price_dzd,active,updated_at')
        .eq('restaurant_id', current.profile.restaurant_id)
        .order('category')
        .order('name')
    ]);
    if (restaurantResult.error) throw restaurantResult.error;
    if (productsResult.error) throw productsResult.error;
    if (!restaurantResult.data) return NextResponse.json({ error: 'Restaurant introuvable.' }, { status: 404 });

    return NextResponse.json({
      userId: current.authUser.id,
      restaurant: restaurantResult.data,
      role: current.profile.role,
      products: productsResult.data ?? []
    }, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) {
    console.error('POS product catalog could not be loaded.', error);
    return NextResponse.json({ error: 'Le menu n’a pas pu être chargé.' }, { status: 503 });
  }
}

export async function POST(request: NextRequest) {
  const body = await parseJsonObject(request);
  const name = typeof body?.name === 'string' ? body.name.trim() : '';
  const category = typeof body?.category === 'string' ? body.category.trim() : '';
  const priceDzd = body?.priceDzd;
  if (name.length < 1 || name.length > 120 || category.length < 1 || category.length > 60 ||
      !Number.isInteger(priceDzd) || (priceDzd as number) < 0 || (priceDzd as number) > MAX_PRICE_DZD) {
    return NextResponse.json({ error: 'Vérifiez le nom, la catégorie et le prix en dinars.' }, { status: 400 });
  }

  try {
    const current = await getAuthenticatedAppUser();
    if (!current) return NextResponse.json({ error: 'Authentification requise.' }, { status: 401 });
    if (current.profile.role !== 'restaurant_admin' || !current.profile.restaurant_id) {
      return NextResponse.json({ error: 'Seul le gérant peut modifier le menu.' }, { status: 403 });
    }

    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.from('pos_products')
      .insert({
        restaurant_id: current.profile.restaurant_id,
        name,
        category,
        price_dzd: priceDzd as number
      })
      .select('id,name,category,price_dzd,active,updated_at')
      .single();
    if (error) throw error;
    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    console.error('POS product could not be created.', error);
    return NextResponse.json({ error: 'Le produit n’a pas pu être ajouté.' }, { status: 503 });
  }
}

export async function PATCH(request: NextRequest) {
  const body = await parseJsonObject(request);
  const id = typeof body?.id === 'string' ? body.id : '';
  const name = typeof body?.name === 'string' ? body.name.trim() : '';
  const category = typeof body?.category === 'string' ? body.category.trim() : '';
  const priceDzd = body?.priceDzd;
  const active = body?.active;
  if (!/^[0-9a-f-]{36}$/i.test(id) || name.length < 1 || name.length > 120 ||
      category.length < 1 || category.length > 60 ||
      !Number.isInteger(priceDzd) || (priceDzd as number) < 0 || (priceDzd as number) > MAX_PRICE_DZD ||
      typeof active !== 'boolean') {
    return NextResponse.json({ error: 'Vérifiez les informations du produit.' }, { status: 400 });
  }

  try {
    const current = await getAuthenticatedAppUser();
    if (!current) return NextResponse.json({ error: 'Authentification requise.' }, { status: 401 });
    if (current.profile.role !== 'restaurant_admin' || !current.profile.restaurant_id) {
      return NextResponse.json({ error: 'Seul le gérant peut modifier le menu.' }, { status: 403 });
    }

    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.from('pos_products')
      .update({ name, category, price_dzd: priceDzd as number, active, updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('restaurant_id', current.profile.restaurant_id)
      .select('id,name,category,price_dzd,active,updated_at')
      .maybeSingle();
    if (error) throw error;
    if (!data) return NextResponse.json({ error: 'Produit introuvable.' }, { status: 404 });
    return NextResponse.json(data);
  } catch (error) {
    console.error('POS product could not be updated.', error);
    return NextResponse.json({ error: 'Le produit n’a pas pu être modifié.' }, { status: 503 });
  }
}
