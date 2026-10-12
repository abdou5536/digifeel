import { NextRequest, NextResponse } from 'next/server';
import { parseJsonObject } from '@/src/lib/security';
import { addBillItemSchema, billIdSchema } from '@/src/lib/schemas';
import { rpcErrorResponse, withTeamSession } from '@/src/lib/billingApi';

export async function POST(request: NextRequest, { params }: { params: Promise<{ billId: string }> }) {
  const id = billIdSchema.safeParse((await params).billId);
  const parsed = addBillItemSchema.safeParse(await parseJsonObject(request));
  if (!id.success || !parsed.success) return NextResponse.json({ error: 'Requête invalide.' }, { status: 400 });
  // Le prix n'est jamais lu depuis le client : la base le copie depuis le catalogue.
  return withTeamSession(async supabase => {
    const { error } = await supabase.rpc('add_bill_item', { p_bill: id.data, p_product: parsed.data.productId, p_quantity: parsed.data.quantity });
    if (error) return rpcErrorResponse(error);
    return NextResponse.json({ ok: true }, { status: 201 });
  });
}