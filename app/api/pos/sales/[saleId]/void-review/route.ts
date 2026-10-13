import { NextRequest, NextResponse } from 'next/server';
import { parseJsonObject } from '@/src/lib/security';
import { posSaleIdSchema, reviewVoidSchema } from '@/src/lib/schemas';
import { getAuthenticatedAppUser } from '@/src/lib/supabase/auth';
import { createSupabaseServerClient } from '@/src/lib/supabase/server';
import { rpcErrorResponse } from '@/src/lib/billingApi';

// Confirme ou conteste une annulation grâce au code à usage unique remis au responsable.
export async function POST(request: NextRequest, { params }: { params: Promise<{ saleId: string }> }) {
  const id = posSaleIdSchema.safeParse((await params).saleId);
  const parsed = reviewVoidSchema.safeParse(await parseJsonObject(request) ?? {});
  if (!id.success || !parsed.success) return NextResponse.json({ error: 'Requête invalide.' }, { status: 400 });

  const current = await getAuthenticatedAppUser();
  if (!current) return NextResponse.json({ error: 'Authentification requise.' }, { status: 401 });
  if (current.profile.role !== 'restaurant_admin' || !current.profile.restaurant_id) {
    return NextResponse.json({ error: 'Seul le responsable du restaurant peut utiliser ce code.' }, { status: 403 });
  }

  const supabase = await createSupabaseServerClient();
  const { data: accepted, error } = await supabase.rpc('review_voided_sale', {
    p_sale_id: id.data,
    p_code: parsed.data.code,
    p_decision: parsed.data.decision,
    p_note: parsed.data.note || null
  });
  if (error) {
    console.error('Voided sale review failed.', error);
    return rpcErrorResponse(error, { 403: 'Code indisponible : déjà utilisé ou trop d’essais.' });
  }
  if (accepted !== true) return NextResponse.json({ error: 'Code incorrect.' }, { status: 403 });
  return NextResponse.json({ ok: true });
}
