import { NextResponse, type NextRequest } from 'next/server';
import { createSupabaseServerClient } from '@/src/lib/supabase/server';

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get('code');
  const next = request.nextUrl.searchParams.get('next');
  const destination = next?.startsWith('/') && !next.startsWith('//') ? next : '/dashboard';
  if (code) {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(new URL(destination, request.url));
    console.error('Supabase email confirmation could not be completed.', error);
  }
  return NextResponse.redirect(new URL('/login?error=confirmation', request.url));
}
