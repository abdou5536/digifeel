import { NextRequest, NextResponse } from 'next/server';
import { parseJsonObject } from '@/src/lib/security';
import { openBillSchema } from '@/src/lib/schemas';
import { rpcErrorResponse, withTeamSession } from '@/src/lib/billingApi';

export async function POST(request: NextRequest) {
  const parsed = openBillSchema.safeParse(await parseJsonObject(request));
  if (!parsed.success) return NextResponse.json({ error: 'Table invalide.' }, { status: 400 });
  return withTeamSession(async supabase => {
    const { data, error } = await supabase.rpc('open_bill', { p_table: parsed.data.table });
    if (error) return rpcErrorResponse(error);
    return NextResponse.json({ id: data }, { status: 201 });
  });
}