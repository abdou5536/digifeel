import { NextRequest, NextResponse } from 'next/server';
import { parseJsonObject } from '@/src/lib/security';
import { billIdSchema } from '@/src/lib/schemas';
import { rpcErrorResponse, withTeamSession } from '@/src/lib/billingApi';

export async function POST(request: NextRequest, { params }: { params: Promise<{ billId: string }> }) {
  const id = billIdSchema.safeParse((await params).billId);
  const body = await parseJsonObject(request);
  const discount = body?.discountMinor;
  if (!id.success || typeof discount !== 'number' || !Number.isSafeInteger(discount) || discount < 0) {
    return NextResponse.json({ error: 'Requête invalide.' }, { status: 400 });
  }
  return withTeamSession(async supabase => {
    const { error } = await supabase.rpc('set_bill_discount', { p_bill: id.data, p_discount: discount });
    if (error) return rpcErrorResponse(error);
    return NextResponse.json({ ok: true });
  });
}
