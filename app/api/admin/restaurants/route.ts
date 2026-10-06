import { NextRequest, NextResponse } from 'next/server';
import { isValidGoogleReviewUrl, parseJsonObject } from '@/src/lib/security';
import { requireSuperAdmin } from '@/src/lib/supabase/requireSuperAdmin';
import { createSupabaseServiceClient } from '@/src/lib/supabase/server';

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/;

/** Crée un restaurant + le compte de son propriétaire + ses tables (puces/QR). Superadmin uniquement. */
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
  const ownerPassword = typeof body?.ownerPassword === 'string' ? body.ownerPassword : '';
  const tables = body?.tables;

  if (name.length < 2 || name.length > 120) return invalid('Le nom doit contenir 2 à 120 caractères.');
  if (slug && (!SLUG.test(slug) || slug.length > 60)) return invalid('Identifiant d’URL invalide (lettres minuscules, chiffres et tirets).');
  if (googleReviewUrl && !isValidGoogleReviewUrl(googleReviewUrl)) return invalid('Le lien Google d’avis est invalide.');
  if (logoUrl && !/^https:\/\//i.test(logoUrl)) return invalid('Le logo doit être une adresse https://.');
  if (!EMAIL.test(ownerEmail)) return invalid('Adresse e-mail du restaurateur invalide.');
  if (ownerPassword.length < 10 || ownerPassword.length > 72) return invalid('Le mot de passe doit contenir 10 à 72 caractères.');
  if (!Number.isInteger(tables) || (tables as number) < 0 || (tables as number) > 200) return invalid('Nombre de tables : 0 à 200.');

  const supabase = createSupabaseServiceClient();
  try {
    const { data: created, error: userError } = await supabase.auth.admin.createUser({
      email: ownerEmail,
      password: ownerPassword,
      email_confirm: true,
      user_metadata: { display_name: name }
    });
    if (userError || !created.user) {
      const exists = userError?.message?.toLowerCase().includes('already');
      return NextResponse.json({ error: exists ? 'Un compte existe déjà avec cet e-mail.' : 'Le compte n’a pas pu être créé.' }, { status: exists ? 409 : 503 });
    }

    const { data: restaurantId, error } = await supabase.rpc('admin_provision_restaurant', {
      p_name: name,
      p_slug: slug || null,
      p_google_url: googleReviewUrl || null,
      p_logo_url: logoUrl || null,
      p_owner: created.user.id,
      p_tables: tables as number
    });
    if (error) {
      await supabase.auth.admin.deleteUser(created.user.id);
      console.error('Restaurant provisioning failed.', error);
      return NextResponse.json({ error: error.code === '23505' ? 'Cet identifiant d’URL est déjà utilisé.' : 'Le restaurant n’a pas pu être créé.' }, { status: error.code === '23505' ? 409 : 503 });
    }
    return NextResponse.json({ restaurantId }, { status: 201 });
  } catch (error) {
    console.error('Restaurant creation service is unavailable.', error);
    return NextResponse.json({ error: 'Le service est momentanément indisponible.' }, { status: 503 });
  }
}

function invalid(error: string) {
  return NextResponse.json({ error }, { status: 400 });
}
