import { NextRequest, NextResponse } from 'next/server';
import { parseJsonObject } from '@/src/lib/security';
import { requireSuperAdmin } from '@/src/lib/supabase/requireSuperAdmin';
import { createSupabaseServerClient, createSupabaseServiceClient } from '@/src/lib/supabase/server';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/** Superadmin : { active: boolean } active/désactive le restaurant ; { addTables: n } génère n tables supplémentaires. */
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ restaurantId: string }> }) {
  const { restaurantId } = await params;
  if (!UUID.test(restaurantId)) return NextResponse.json({ error: 'Restaurant inconnu.' }, { status: 404 });
  const denied = await requireSuperAdmin();
  if (denied) return denied;

  const body = await parseJsonObject(request);
  try {
    if (typeof body?.active === 'boolean') {
      const supabase = await createSupabaseServerClient();
      const { error } = await supabase.rpc('super_set_restaurant_active', { p_restaurant: restaurantId, p_active: body.active });
      if (error) throw error;
      return NextResponse.json({ active: body.active });
    }
    const count = body?.addTables;
    if (Number.isInteger(count) && (count as number) >= 1 && (count as number) <= 200) {
      const { data, error } = await createSupabaseServiceClient().rpc('admin_add_tables', { p_restaurant: restaurantId, p_count: count as number });
      if (error) throw error;
      return NextResponse.json({ tables: data }, { status: 201 });
    }
    return NextResponse.json({ error: 'Requête invalide.' }, { status: 400 });
  } catch (error) {
    console.error('Restaurant update failed.', error);
    return NextResponse.json({ error: 'La modification n’a pas pu être enregistrée.' }, { status: 503 });
  }
}
