import { NextRequest, NextResponse } from 'next/server';
import { parseJsonObject } from '@/src/lib/security';
import { tableCodeSchema } from '@/src/lib/schemas';
import { createSupabaseServerClient } from '@/src/lib/supabase/server';

// Rate limiting : à appliquer côté Cloudflare (règle sur /api/public/*), voir DEPLOIEMENT.md.
export async function POST(request: NextRequest) {
  const code = tableCodeSchema.safeParse((await parseJsonObject(request))?.code);
  if (!code.success) return NextResponse.json({ error: 'Table inconnue.' }, { status: 404 });
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc('open_guest_session', { p_code: code.data });
  if (error) {
    return NextResponse.json({ error: error.code === '22023' ? 'Aucune addition ouverte pour cette table.' : 'Service indisponible.' },
      { status: error.code === '22023' ? 404 : 503 });
  }
  return NextResponse.json({ token: data }, { headers: { 'Cache-Control': 'no-store' } });
}