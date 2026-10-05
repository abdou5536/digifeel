import { NextRequest, NextResponse } from 'next/server';
import { parseJsonObject } from '@/src/lib/security';
import { getAuthenticatedAppUser } from '@/src/lib/supabase/auth';
import { createSupabaseServerClient, createSupabaseServiceClient } from '@/src/lib/supabase/server';

export async function POST(request: NextRequest) {
  const body = await parseJsonObject(request);
  const name = typeof body?.name === 'string' ? body.name.trim() : '';
  const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : '';
  if (name.length < 2 || name.length > 100 || email.length > 254 ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: 'Indiquez un nom et une adresse e-mail valides.' }, { status: 400 });
  }

  let serverId: string | null = null;
  let invitedUserId: string | null = null;
  try {
    const current = await getAuthenticatedAppUser();
    if (!current) return NextResponse.json({ error: 'Authentification requise.' }, { status: 401 });
    if (current.profile.role !== 'restaurant_admin' || !current.profile.restaurant_id) {
      return NextResponse.json({ error: 'Seul le restaurateur peut inviter un serveur.' }, { status: 403 });
    }

    const supabase = await createSupabaseServerClient();
    const { data: server, error: serverError } = await supabase
      .from('servers')
      .insert({ restaurant_id: current.profile.restaurant_id, name })
      .select('id')
      .single();
    if (serverError) throw serverError;
    serverId = server.id;

    const admin = createSupabaseServiceClient();
    const { data: invited, error: inviteError } = await admin.auth.admin.inviteUserByEmail(email, {
      data: { display_name: name }
    });
    if (inviteError || !invited.user) throw inviteError || new Error('Supabase n’a pas créé le compte invité.');
    invitedUserId = invited.user.id;

    const { error: profileError } = await admin.from('app_users').update({
      role: 'server',
      restaurant_id: current.profile.restaurant_id,
      server_id: serverId,
      display_name: name
    }).eq('id', invitedUserId);
    if (profileError) throw profileError;

    const { error: linkError } = await admin.from('servers').update({ user_id: invitedUserId }).eq('id', serverId);
    if (linkError) throw linkError;
    return NextResponse.json({ id: serverId, name, email, invitationSent: true }, { status: 201 });
  } catch (error) {
    console.error('Restaurant server invitation failed.', error);
    if (invitedUserId || serverId) {
      try {
        const admin = createSupabaseServiceClient();
        if (invitedUserId) await admin.auth.admin.deleteUser(invitedUserId);
        if (serverId) await admin.from('servers').delete().eq('id', serverId);
      } catch (cleanupError) {
        console.error('Failed to clean up an incomplete server invitation.', cleanupError);
      }
    }
    return NextResponse.json({ error: 'Le compte serveur n’a pas pu être invité. Vérifiez la configuration e-mail Supabase.' }, { status: 503 });
  }
}
