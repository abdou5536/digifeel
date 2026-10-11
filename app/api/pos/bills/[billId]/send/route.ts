import { NextResponse } from 'next/server';
import { billIdSchema } from '@/src/lib/schemas';
import { rpcErrorResponse, withTeamSession } from '@/src/lib/billingApi';

export async function POST(_request: Request, { params }: { params: Promise<{ billId: string }> }) {
  const id = billIdSchema.safeParse((await params).billId);
  if (!id.success) return NextResponse.json({ error: 'Requête invalide.' }, { status: 400 });
  return withTeamSession(async supabase => {
    const { data, error } = await supabase.rpc('send_bill_to_counter', { p_bill: id.data });
    if (error) return rpcErrorResponse(error);
    return NextResponse.json({ sent: data as number });
  });
}
