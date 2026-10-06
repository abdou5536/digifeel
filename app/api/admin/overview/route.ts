import { NextResponse } from 'next/server';
import { getAuthenticatedAppUser } from '@/src/lib/supabase/auth';
import { createSupabaseServerClient } from '@/src/lib/supabase/server';

export async function GET() {
  try {
    const current = await getAuthenticatedAppUser();
    if (!current) return NextResponse.json({ error: 'Connectez-vous pour ouvrir l’administration.' }, { status: 401 });
    if (current.profile.role !== 'super_admin') {
      return NextResponse.json({ error: 'Accès réservé au super-administrateur.' }, { status: 403 });
    }

    const supabase = await createSupabaseServerClient();
    const [restaurantsResult, batchesResult] = await Promise.all([
      supabase.from('restaurants').select('id,name,slug,active,created_at,chips(id,status,table_number,created_at),subscriptions(status,trial_ends_at)').order('created_at', { ascending: false }),
      supabase.from('chip_batches').select('id,name,created_at').order('created_at', { ascending: false }).limit(50)
    ]);
    if (restaurantsResult.error) throw restaurantsResult.error;
    if (batchesResult.error) throw batchesResult.error;
    return NextResponse.json({ restaurants: restaurantsResult.data ?? [], batches: batchesResult.data ?? [] });
  } catch (error) {
    console.error('Admin workspace data could not be loaded.', error);
    return NextResponse.json({ error: 'L’administration est momentanément indisponible.' }, { status: 503 });
  }
}
