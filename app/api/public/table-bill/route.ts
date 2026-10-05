import { NextRequest, NextResponse } from 'next/server';
import { parseJsonObject } from '@/src/lib/security';
import { guestTokenSchema } from '@/src/lib/schemas';
import { createSupabaseServerClient } from '@/src/lib/supabase/server';

export async function POST(request: NextRequest) {
  const token = guestTokenSchema.safeParse((await parseJsonObject(request))?.token);
  if (!token.success) return NextResponse.json({ error: 'Session invalide.' }, { status: 401 });
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc('guest_get_bill', { p_token: token.data });
  if (error) return NextResponse.json({ error: 'Session expirée ou invalide.' }, { status: error.code === '42501' ? 401 : 503 });
  return NextResponse.json({ bill: data }, { headers: { 'Cache-Control': 'no-store' } });
}