import { NextResponse } from 'next/server';
import { rpcErrorResponse, withTeamSession } from '@/src/lib/billingApi';

export async function POST() {
  return withTeamSession(async supabase => {
    const { data, error } = await supabase.rpc('claim_counter_tickets');
    if (error) return rpcErrorResponse(error);
    return NextResponse.json({ items: data ?? [] }, { headers: { 'Cache-Control': 'private, no-store' } });
  });
}
