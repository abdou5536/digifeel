import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import { createSupabaseServiceClient } from '@/src/lib/supabase/server';

/**
 * Lien public d'une table : /r/<slug-restaurant>/t/<numéro>.
 * Retrouve la puce de cette table dans CE restaurant puis redirige vers la page d'avis /r/<puce>.
 */
export default async function TableScanPage({ params }: { params: Promise<{ slug: string; numero: string }> }) {
  const { slug, numero } = await params;
  const tableNumber = Number(numero);
  if (!/^[a-z0-9-]{1,60}$/.test(slug) || !Number.isInteger(tableNumber) || tableNumber < 1 || tableNumber > 999) notFound();

  const supabase = createSupabaseServiceClient();
  const { data: restaurant } = await supabase.from('restaurants').select('id, name, active').eq('slug', slug).maybeSingle();
  if (!restaurant) notFound();

  if (!restaurant.active) {
    return (
      <main className="next-account-layout">
        <section className="next-glass-card next-surface-card next-account-card">
          <span className="next-kicker">SERVICE INDISPONIBLE</span>
          <h1 className="next-page-heading">{restaurant.name} n’accepte plus d’avis pour le moment.</h1>
          <p className="next-muted">Merci de votre visite.</p>
          <Link className="product-button" href="/">Retour</Link>
        </section>
      </main>
    );
  }

  const { data: chip } = await supabase
    .from('chips').select('id').eq('restaurant_id', restaurant.id).eq('table_number', tableNumber).eq('status', 'active').maybeSingle();
  if (!chip) notFound();
  redirect(`/r/${chip.id}`);
}
