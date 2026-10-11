import { NextRequest, NextResponse } from 'next/server';
import { parseJsonObject } from '@/src/lib/security';
import { getAuthenticatedAppUser } from '@/src/lib/supabase/auth';
import { createSupabaseServerClient } from '@/src/lib/supabase/server';
import { MENU_IMPORT_LIMIT } from '@/src/lib/pos/menu-import';

const MAX_PRICE = 100_000_000;

export async function POST(request: NextRequest) {
  const body = await parseJsonObject(request);
  const items = body?.items;
  const valid = Array.isArray(items) && items.length > 0 && items.length <= MENU_IMPORT_LIMIT && items.every(item =>
    item && typeof item === 'object' &&
    typeof item.name === 'string' && item.name.trim().length >= 1 && item.name.trim().length <= 120 &&
    typeof item.category === 'string' && item.category.trim().length >= 1 && item.category.trim().length <= 60 &&
    Number.isInteger(item.priceMinor) && item.priceMinor >= 0 && item.priceMinor <= MAX_PRICE);
  if (!valid) return NextResponse.json({ error: 'Le fichier du menu contient des lignes invalides.' }, { status: 400 });

  try {
    const current = await getAuthenticatedAppUser();
    if (!current) return NextResponse.json({ error: 'Authentification requise.' }, { status: 401 });
    if (current.profile.role !== 'restaurant_admin' || !current.profile.restaurant_id) {
      return NextResponse.json({ error: 'Seul le gérant peut modifier le menu.' }, { status: 403 });
    }
    const supabase = await createSupabaseServerClient();
    const rows = (items as Array<{ name: string; category: string; priceMinor: number }>).map(item => ({
      restaurant_id: current.profile.restaurant_id,
      name: item.name.trim(),
      category: item.category.trim(),
      price_dzd: item.priceMinor
    }));
    const { error } = await supabase.from('pos_products').insert(rows);
    if (error) throw error;
    return NextResponse.json({ imported: rows.length }, { status: 201 });
  } catch (error) {
    console.error('POS menu import failed.', error);
    return NextResponse.json({ error: 'Le menu n’a pas pu être importé.' }, { status: 503 });
  }
}
