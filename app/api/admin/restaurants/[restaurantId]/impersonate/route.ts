import { NextResponse } from 'next/server';
import { requireSuperAdmin } from '@/src/lib/supabase/requireSuperAdmin';
import { createSupabaseServerClient, createSupabaseServiceClient } from '@/src/lib/supabase/server';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/** Superadmin uniquement : génère un lien de connexion directe vers le compte restaurateur du restaurant ciblé. */
export async function POST(_request: Request, { params }: { params: Promise<{ restaurantId: string }> }) {
  const { restaurantId } = await params;
  if (!UUID.test(restaurantId)) return NextResponse.json({ error: 'Restaurant inconnu.' }, { status: 404 });
  const denied = await requireSuperAdmin();
  if (denied) return denied;

  try {
    const supabase = await createSupabaseServerClient();
    const { data: restaurant, error: restaurantError } = await supabase
      .from('restaurants')
      .select('id,name')
      .eq('id', restaurantId)
      .maybeSingle();
    if (restaurantError) throw restaurantError;
    if (!restaurant) return NextResponse.json({ error: 'Restaurant inconnu.' }, { status: 404 });

    const { data: owner, error: ownerError } = await supabase
      .from('app_users')
      .select('id, role')
      .eq('restaurant_id', restaurantId)
      .eq('role', 'restaurant_admin')
      .order('id')
      .limit(1)
      .maybeSingle();
    if (ownerError) throw ownerError;
    if (!owner) return NextResponse.json({ error: 'Aucun compte restaurateur trouvé pour ce restaurant.' }, { status: 404 });

    const serviceClient = createSupabaseServiceClient();
    const { data: authUser, error: authUserError } = await serviceClient.auth.admin.getUserById(owner.id);
    if (authUserError) throw authUserError;
    const email = authUser.user?.email;
    if (!email) return NextResponse.json({ error: 'Le compte restaurateur n’a pas d’adresse e-mail valide.' }, { status: 503 });

    const { data: link, error: linkError } = await serviceClient.auth.admin.generateLink({ type: 'magiclink', email });
    if (linkError) throw linkError;
    const tokenHash = link.properties?.hashed_token;
    if (!tokenHash) return NextResponse.json({ error: 'Le lien de connexion n’a pas pu être généré.' }, { status: 503 });

    const { error: auditError } = await supabase.rpc('super_admin_log_impersonation', {
      p_restaurant: restaurantId,
      p_target_email: email
    });
    if (auditError) console.error('Impersonation audit log failed.', auditError);

    const url = `/auth/confirm?token_hash=${encodeURIComponent(tokenHash)}&type=magiclink&next=${encodeURIComponent('/caisse')}`;
    return NextResponse.json({ url, email, restaurantName: restaurant.name });
  } catch (error) {
    console.error('Impersonation link could not be generated.', error);
    return NextResponse.json({ error: 'La connexion au restaurant n’a pas pu être préparée.' }, { status: 503 });
  }
}
