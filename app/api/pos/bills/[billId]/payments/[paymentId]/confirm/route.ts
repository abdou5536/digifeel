import { NextRequest, NextResponse } from 'next/server';
import { billIdSchema, paymentIdSchema } from '@/src/lib/schemas';
import { rpcErrorResponse, withTeamSession } from '@/src/lib/billingApi';

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ billId: string; paymentId: string }> }
) {
  const { billId: rawBillId, paymentId: rawPaymentId } = await params;
  const billId = billIdSchema.safeParse(rawBillId);
  const paymentId = paymentIdSchema.safeParse(rawPaymentId);
  if (!billId.success || !paymentId.success) {
    return NextResponse.json({ error: 'Paiement introuvable.' }, { status: 404 });
  }

  return withTeamSession(async supabase => {
    const { error } = await supabase.rpc('confirm_pos_card_payment', {
      p_bill: billId.data,
      p_payment: paymentId.data
    });
    if (error) {
      return rpcErrorResponse(error, { 409: 'Ce paiement carte n’est plus en attente de confirmation.' });
    }
    return NextResponse.json({ confirmed: true });
  });
}
