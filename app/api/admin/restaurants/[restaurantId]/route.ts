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
    if (body?.subscription && typeof body.subscription === 'object') {
      const input = body.subscription as { status?: unknown; months?: unknown; freeDays?: unknown };
      const statuses = ['trialing', 'active', 'past_due', 'canceled', 'inactive'];
      if (typeof input.status !== 'string' || !statuses.includes(input.status)) return NextResponse.json({ error: 'Statut d’abonnement invalide.' }, { status: 400 });
      const months = input.months === undefined ? 0 : Number(input.months);
      const freeDays = input.freeDays === undefined ? 0 : Number(input.freeDays);
      if (!Number.isInteger(months) || months < 0 || months > 24 || !Number.isInteger(freeDays) || freeDays < 0 || freeDays > 90) {
        return NextResponse.json({ error: 'Durée invalide.' }, { status: 400 });
      }
      const service = createSupabaseServiceClient();
      const { data: current, error: readError } = await service.from('subscriptions').select('trial_ends_at,current_period_ends_at').eq('restaurant_id', restaurantId).maybeSingle();
      if (readError) throw readError;
      const now = Date.now();
      const latest = (value: string | null | undefined) => Math.max(now, value ? Date.parse(value) : 0);
      const update: Record<string, string> = { status: input.status, updated_at: new Date(now).toISOString() };
      if (months > 0) {
        const end = new Date(latest(current?.current_period_ends_at));
        end.setUTCMonth(end.getUTCMonth() + months);
        update.current_period_ends_at = end.toISOString();
      }
      if (freeDays > 0) update.trial_ends_at = new Date(latest(current?.trial_ends_at) + freeDays * 86_400_000).toISOString();
      const { error } = await service.from('subscriptions').upsert({ restaurant_id: restaurantId, ...update }, { onConflict: 'restaurant_id' });
      if (error) throw error;
      return NextResponse.json({ status: input.status });
    }
    return NextResponse.json({ error: 'Requête invalide.' }, { status: 400 });
  } catch (error) {
    console.error('Restaurant update failed.', error);
    return NextResponse.json({ error: 'La modification n’a pas pu être enregistrée.' }, { status: 503 });
  }
}
