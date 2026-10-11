import { NextRequest, NextResponse } from 'next/server';
import { paymentIdSchema } from '@/src/lib/schemas';
import { rpcErrorResponse, withTeamSession } from '@/src/lib/billingApi';

export async function POST(_request: NextRequest, { params }: { params: Promise<{ paymentId: string }> }) {
  const paymentId = paymentIdSchema.safeParse((await params).paymentId);
  if (!paymentId.success) return NextResponse.json({ error: 'Paiement introuvable.' }, { status: 404 });

  return withTeamSession(async supabase => {
    const { error } = await supabase.rpc('confirm_guest_payment', { p_payment: paymentId.data });
    if (error) return rpcErrorResponse(error, { 409: 'Ce paiement n’est plus en attente de validation.' });
    return NextResponse.json({ confirmed: true });
  });
}
