import { NextRequest, NextResponse } from 'next/server';
import { parseJsonObject } from '@/src/lib/security';
import { openBillSchema } from '@/src/lib/schemas';
import { rpcErrorResponse, withTeamSession } from '@/src/lib/billingApi';

export async function GET() {
  return withTeamSession(async supabase => {
    const { data, error } = await supabase.from('bills')
      .select('id,table_label,status,discount_dzd,created_at,bill_items(id,product_id,product_name,quantity,unit_price_dzd,line_total_dzd),payments(id,amount_dzd,tip_dzd,method,status)')
      .eq('status', 'open')
      .order('created_at', { ascending: false });
    if (error) return rpcErrorResponse(error);
    return NextResponse.json({ bills: data ?? [] }, { headers: { 'Cache-Control': 'private, no-store' } });
  });
}

export async function POST(request: NextRequest) {
  const parsed = openBillSchema.safeParse(await parseJsonObject(request));
  if (!parsed.success) return NextResponse.json({ error: 'Table invalide.' }, { status: 400 });
  return withTeamSession(async supabase => {
    const { data: existing, error: lookupError } = await supabase.from('bills')
      .select('id')
      .eq('table_label', parsed.data.table)
      .eq('status', 'open')
      .limit(1)
      .maybeSingle();
    if (lookupError) return rpcErrorResponse(lookupError);
    if (existing) return NextResponse.json({ error: 'Cette table a déjà une addition ouverte.' }, { status: 409 });
    const { data, error } = await supabase.rpc('open_bill', { p_table: parsed.data.table });
    if (error) return rpcErrorResponse(error);
    return NextResponse.json({ id: data }, { status: 201 });
  });
}