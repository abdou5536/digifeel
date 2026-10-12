-- Couleur d'accent propre à chaque restaurant (caisse et tableau de bord).
-- Retour arrière : supabase/rollback/202610240001_brand_color.down.sql

alter table public.restaurants
  add column if not exists brand_color text
  check (brand_color is null or brand_color ~ '^#[0-9a-fA-F]{6}$');

grant update (brand_color) on public.restaurants to authenticated;
