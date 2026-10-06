-- Multi-restaurants : slug public, logo, activation par le superadmin, puces rattachées à un numéro de table.
-- Liens publics : /r/<slug>/t/<numéro de table>. Retour arrière : supabase/rollback/202610130001_slug_tables_provisioning.down.sql

alter table public.restaurants add column if not exists slug text;
alter table public.restaurants add column if not exists logo_url text check (length(logo_url) <= 2048);
alter table public.restaurants add column if not exists active boolean not null default true;

alter table public.chips add column if not exists table_number integer check (table_number between 1 and 999);

create or replace function public.slugify(p_text text)
returns text language sql immutable set search_path = '' as $$
  select trim(both '-' from regexp_replace(
    lower(translate(coalesce(p_text, ''),
      'àâäáãåçéèêëíìîïñóòôöõúùûüýÿÀÂÄÁÃÅÇÉÈÊËÍÌÎÏÑÓÒÔÖÕÚÙÛÜÝ',
      'aaaaaaceeeeiiiinooooouuuuyyaaaaaaceeeeiiiinooooouuuuy')),
    '[^a-z0-9]+', '-', 'g'))
$$;

-- Slug unique : si le nom est déjà pris, on ajoute un suffixe numérique.
create or replace function public.restaurants_set_slug()
returns trigger language plpgsql set search_path = '' as $$
declare v_base text; v_slug text; v_n integer := 1;
begin
  v_base := left(coalesce(nullif(public.slugify(coalesce(new.slug, new.name)), ''), 'restaurant'), 50);
  v_slug := v_base;
  while exists (select 1 from public.restaurants where slug = v_slug and id <> new.id) loop
    v_n := v_n + 1;
    v_slug := v_base || '-' || v_n;
  end loop;
  new.slug := v_slug;
  return new;
end;
$$;

drop trigger if exists restaurants_slug on public.restaurants;
create trigger restaurants_slug before insert on public.restaurants
  for each row execute procedure public.restaurants_set_slug();

-- Rétro-remplissage des restaurants existants (le trigger ne couvre que les insertions).
do $$
declare r record; v_base text; v_slug text; v_n integer;
begin
  for r in select id, name from public.restaurants where slug is null order by created_at loop
    v_base := left(coalesce(nullif(public.slugify(r.name), ''), 'restaurant'), 50);
    v_slug := v_base; v_n := 1;
    while exists (select 1 from public.restaurants where slug = v_slug) loop
      v_n := v_n + 1; v_slug := v_base || '-' || v_n;
    end loop;
    update public.restaurants set slug = v_slug where id = r.id;
  end loop;
end $$;

alter table public.restaurants alter column slug set not null;
alter table public.restaurants add constraint restaurants_slug_format check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and length(slug) <= 60);
create unique index if not exists restaurants_slug_key on public.restaurants(slug);
create unique index if not exists chips_restaurant_table_key on public.chips(restaurant_id, table_number) where table_number is not null;

-- Un restaurateur ne peut modifier QUE ses réglages : jamais slug, active, reseller_id…
revoke update on public.restaurants from authenticated;
grant update (name, google_review_url, address, city, tip_enabled, logo_url, updated_at) on public.restaurants to authenticated;

-- Un restaurant désactivé ne reçoit plus d'avis.
create or replace function public.reject_review_if_inactive()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if not exists (select 1 from public.restaurants where id = new.restaurant_id and active) then
    raise exception 'Restaurant is disabled' using errcode = 'P0002';
  end if;
  return new;
end;
$$;
drop trigger if exists reviews_reject_inactive on public.reviews;
create trigger reviews_reject_inactive before insert on public.reviews
  for each row execute procedure public.reject_review_if_inactive();

-- Superadmin : activer / désactiver un restaurant (appelé depuis l'application connectée).
create or replace function public.super_set_restaurant_active(p_restaurant uuid, p_active boolean)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null or not public.is_super_admin() then
    raise exception 'Super-admin access required' using errcode = '42501';
  end if;
  update public.restaurants set active = p_active, updated_at = now() where id = p_restaurant;
  if not found then raise exception 'Restaurant not found' using errcode = 'P0002'; end if;
end;
$$;
revoke execute on function public.super_set_restaurant_active(uuid, boolean) from public, anon;
grant execute on function public.super_set_restaurant_active(uuid, boolean) to authenticated;

-- Ajoute N tables (puce + code QR de table) à la suite des tables existantes.
-- Réservé à service_role : les routes serveur vérifient d'abord que l'appelant est superadmin.
create or replace function public.admin_add_tables(p_restaurant uuid, p_count integer)
returns table(table_number integer, chip_id text) language plpgsql security definer set search_path = '' as $$
declare
  v_start integer; i integer; v_chip text; v_code text; v_bytes bytea; j integer;
  v_alphabet text := 'abcdefghijklmnopqrstuvwxyz234567';
begin
  if p_count not between 1 and 200 then
    raise exception 'Table count is invalid' using errcode = '22023';
  end if;
  perform 1 from public.restaurants where id = p_restaurant for update;
  if not found then raise exception 'Restaurant not found' using errcode = 'P0002'; end if;
  select coalesce(max(c.table_number), 0) into v_start from public.chips c where c.restaurant_id = p_restaurant;
  if v_start + p_count > 999 then raise exception 'Too many tables' using errcode = '22023'; end if;

  for i in 1..p_count loop
    v_chip := pg_catalog.gen_random_uuid()::text;
    insert into public.chips (id, restaurant_id, table_number, status, activated_at, activation_code_hash)
    values (v_chip, p_restaurant, v_start + i, 'active', now(),
      encode(extensions.digest(extensions.gen_random_bytes(32), 'sha256'), 'hex'));

    v_code := ''; v_bytes := extensions.gen_random_bytes(16);
    for j in 0..15 loop v_code := v_code || substr(v_alphabet, (get_byte(v_bytes, j) % 32) + 1, 1); end loop;
    insert into public.dining_tables (restaurant_id, label, code)
    values (p_restaurant, (v_start + i)::text, v_code)
    on conflict (restaurant_id, label) do nothing;

    table_number := v_start + i; chip_id := v_chip; return next;
  end loop;
end;
$$;
revoke execute on function public.admin_add_tables(uuid, integer) from public, anon, authenticated;
grant execute on function public.admin_add_tables(uuid, integer) to service_role;

-- Crée un restaurant complet (réservé à service_role) : fiche, abonnement d'essai, propriétaire, tables.
create or replace function public.admin_provision_restaurant(
  p_name text, p_slug text, p_google_url text, p_logo_url text, p_owner uuid, p_tables integer
)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_id uuid;
begin
  if length(trim(coalesce(p_name, ''))) not between 2 and 120 then
    raise exception 'Restaurant name is invalid' using errcode = '22023';
  end if;
  insert into public.restaurants (name, slug, google_review_url, logo_url)
  values (trim(p_name), nullif(trim(coalesce(p_slug, '')), ''), nullif(trim(coalesce(p_google_url, '')), ''), nullif(trim(coalesce(p_logo_url, '')), ''))
  returning id into v_id;
  insert into public.subscriptions (restaurant_id, status, trial_ends_at) values (v_id, 'trialing', now() + interval '30 days');
  if p_owner is not null then
    update public.app_users set role = 'restaurant_admin', restaurant_id = v_id,
      display_name = coalesce(nullif(display_name, ''), trim(p_name)) where id = p_owner;
  end if;
  if p_tables > 0 then perform public.admin_add_tables(v_id, p_tables); end if;
  return v_id;
end;
$$;
revoke execute on function public.admin_provision_restaurant(text, text, text, text, uuid, integer) from public, anon, authenticated;
grant execute on function public.admin_provision_restaurant(text, text, text, text, uuid, integer) to service_role;
