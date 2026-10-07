import { NextRequest, NextResponse } from 'next/server';
import { parseJsonObject } from '@/src/lib/security';
import { posSaleIdSchema, voidPosSaleSchema } from '@/src/lib/schemas';
import { getAuthenticatedAppUser } from '@/src/lib/supabase/auth';
import { createSupabaseServerClient } from '@/src/lib/supabase/server';
import { rpcErrorResponse } from '@/src/lib/billingApi';

// Annule une vente déjà enregistrée (erreur de saisie, remboursement…). Réservé aux responsables
// de restaurant : la vérification du rôle est faite à la fois ici et dans la fonction SQL.
export async function POST(request: NextRequest, { params }: { params: Promise<{ saleId: string }> }) {
  const id = posSaleIdSchema.safeParse((await params).saleId);
  const parsed = voidPosSaleSchema.safeParse(await parseJsonObject(request) ?? {});
  if (!id.success || !parsed.success) return NextResponse.json({ error: 'Requête invalide.' }, { status: 400 });

  const current = await getAuthenticatedAppUser();
  if (!current) return NextResponse.json({ error: 'Authentification requise.' }, { status: 401 });
  if (current.profile.role !== 'restaurant_admin' || !current.profile.restaurant_id) {
    return NextResponse.json({ error: 'Seul un responsable du restaurant peut annuler une vente.' }, { status: 403 });
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc('void_pos_sale', { p_sale_id: id.data, p_reason: parsed.data.reason || null });
  if (error) {
    console.error('POS sale could not be voided.', error);
    return rpcErrorResponse(error, {
      409: 'Cette vente est introuvable ou déjà annulée.',
      400: 'Une vente ne peut être annulée que le jour même de son enregistrement.'
    });
  }
  return NextResponse.json({ ok: true });
}
