import { NextRequest, NextResponse } from 'next/server';
import { isValidGoogleReviewUrl, parseJsonObject } from '@/src/lib/security';
import { requireSuperAdmin } from '@/src/lib/supabase/requireSuperAdmin';
import { createSupabaseServiceClient } from '@/src/lib/supabase/server';

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/;

/** Crée un restaurant, invite son propriétaire et provisionne ses tables (puces/QR). Superadmin uniquement. */
export async function POST(request: NextRequest) {
  const denied = await requireSuperAdmin();
  if (denied) return denied;

  const body = await parseJsonObject(request);
  const str = (key: string) => (typeof body?.[key] === 'string' ? (body[key] as string).trim() : '');
  const name = str('name');
  const slug = str('slug').toLowerCase();
  const googleReviewUrl = str('googleReviewUrl');
  const logoUrl = str('logoUrl');
  const ownerEmail = str('ownerEmail').toLowerCase();
  const tables = body?.tables;
  const currency = body?.currency === 'EUR' ? 'EUR' : 'DZD';

  if (name.length < 2 || name.length > 120) return invalid('Le nom doit contenir 2 à 120 caractères.');
  if (slug && (!SLUG.test(slug) || slug.length > 60)) return invalid('Identifiant d’URL invalide (lettres minuscules, chiffres et tirets).');
  if (googleReviewUrl && !isValidGoogleReviewUrl(googleReviewUrl)) return invalid('Le lien Google d’avis est invalide.');
  if (logoUrl && !/^https:\/\//i.test(logoUrl)) return invalid('Le logo doit être une adresse https://.');
  if (!EMAIL.test(ownerEmail)) return invalid('Adresse e-mail du restaurateur invalide.');
  if (!Number.isInteger(tables) || (tables as number) < 0 || (tables as number) > 200) return invalid('Nombre de tables : 0 à 200.');

  const supabase = createSupabaseServiceClient();
  let invitedUserId: string | null = null;
  try {
    const origin = process.env.APP_ORIGIN ? new URL(process.env.APP_ORIGIN).origin : request.nextUrl.origin;
    const redirectTo = new URL('/auth/callback', origin);
    redirectTo.searchParams.set('next', '/login?setup=1');
    const { data: invitation, error: invitationError } = await supabase.auth.admin.inviteUserByEmail(ownerEmail, {
      data: { display_name: name },
      redirectTo: redirectTo.toString()
    });
    if (invitationError || !invitation.user) {
      const message = invitationError?.message.toLowerCase() ?? '';
      const exists = message.includes('already') || message.includes('registered');
      return NextResponse.json({
        error: exists ? 'Un compte existe déjà avec cet e-mail.' : 'L’invitation n’a pas pu être envoyée. Vérifiez la configuration e-mail Supabase.'
      }, { status: exists ? 409 : 503 });
    }
    invitedUserId = invitation.user.id;

    const { data: restaurantId, error } = await supabase.rpc('admin_provision_restaurant', {
      p_name: name,
      p_slug: slug || null,
      p_google_url: googleReviewUrl || null,
      p_logo_url: logoUrl || null,
      p_owner: invitedUserId,
      p_tables: tables as number
    });
    if (error) {
      if (error.code === '23505') {
        await supabase.auth.admin.deleteUser(invitedUserId);
        invitedUserId = null;
        return NextResponse.json({ error: 'Cet identifiant d’URL est déjà utilisé.' }, { status: 409 });
      }
      throw error;
    }
    if (currency !== 'DZD') {
      const { error: currencyError } = await supabase.from('restaurants').update({ currency }).eq('id', restaurantId as string);
      if (currencyError) console.error('Restaurant currency could not be set.', currencyError);
    }
    return NextResponse.json({ restaurantId, invitationSent: true }, { status: 201 });
  } catch (error) {
    if (invitedUserId) {
      const { error: cleanupError } = await supabase.auth.admin.deleteUser(invitedUserId);
      if (cleanupError) console.error('Incomplete restaurant invitation could not be removed.', cleanupError);
    }
    console.error('Restaurant creation service is unavailable.', error);
    return NextResponse.json({ error: 'Le service est momentanément indisponible.' }, { status: 503 });
  }
}

function invalid(error: string) {
  return NextResponse.json({ error }, { status: 400 });
}
