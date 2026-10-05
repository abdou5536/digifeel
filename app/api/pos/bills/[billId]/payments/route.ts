import { NextRequest, NextResponse } from 'next/server';
import { parseJsonObject } from '@/src/lib/security';
import { billIdSchema, paymentRequestSchema } from '@/src/lib/schemas';
import { rpcErrorResponse, withTeamSession } from '@/src/lib/billingApi';

export async function POST(request: NextRequest, { params }: { params: Promise<{ billId: string }> }) {
  const id = billIdSchema.safeParse((await params).billId);
  const parsed = paymentRequestSchema.omit({ billId: true }).safeParse(await parseJsonObject(request));
  if (!id.success || !parsed.success) return NextResponse.json({ error: 'Requête invalide.' }, { status: 400 });
  // Stripe n'est pas branché : refus explicite plutôt qu'une fausse réussite.
  if (parsed.data.method === 'stripe') return NextResponse.json({ error: 'Paiement par carte non activé.' }, { status: 501 });
  return withTeamSession(async supabase => {
    const { data, error } = await supabase.rpc('record_payment', {
      p_bill: id.data, p_amount: parsed.data.amountDzd, p_tip: parsed.data.tipDzd,
      p_method: parsed.data.method, p_key: parsed.data.idempotencyKey
    });
    if (error) return rpcErrorResponse(error);
    return NextResponse.json({ id: data }, { status: 201 });
  });
}