import { notFound } from 'next/navigation';
import { createSupabaseServiceClient } from '@/src/lib/supabase/server';

type MenuSection = {
  name: string;
  items: Array<{ name: string; description: string; price: string | null }>;
};

export const dynamic = 'force-dynamic';

export default async function PublicAiMenuPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const supabase = createSupabaseServiceClient();
  const { data, error } = await supabase.from('restaurant_menus')
    .select('title,sections,restaurant_id')
    .eq('public_slug', slug).eq('status', 'published').maybeSingle();
  if (error) {
    console.error('Public AI menu could not be loaded.', error);
    throw new Error('Le menu est momentanément indisponible.');
  }
  if (!data) notFound();
  const { data: restaurant, error: restaurantError } = await supabase.from('restaurants')
    .select('name').eq('id', data.restaurant_id).maybeSingle();
  if (restaurantError) {
    console.error('Public menu restaurant could not be loaded.', restaurantError);
    throw new Error('Le menu est momentanément indisponible.');
  }

  const sections = data.sections as MenuSection[];
  return (
    <main className="public-ai-menu">
      <header><span>DIGIFEEL</span><small>MENU EN LIGNE</small></header>
      <section className="public-ai-menu__intro">
        <span>{restaurant?.name ?? 'Restaurant'}</span>
        <h1>{data.title}</h1>
        <p>Scannez, choisissez et profitez. Bon appétit !</p>
      </section>
      {sections.map(section => <section className="public-ai-menu__section" key={section.name}>
        <h2>{section.name}</h2>
        {section.items.map((item, index) => <article className="public-ai-menu__item" key={`${item.name}-${index}`}>
          <div><h3>{item.name}</h3>{item.description && <p>{item.description}</p>}</div>
          {item.price && <strong>{item.price}</strong>}
        </article>)}
      </section>)}
      <footer>Menu fourni par {restaurant?.name ?? 'le restaurant'} · Propulsé par Digifeel</footer>
    </main>
  );
}
