-- 1) Accès réservé : seul le super-admin Digifeel ouvre un compte (invitation).
--    Une inscription libre (API publique) ne reçoit plus aucun profil, donc aucun droit.
-- 2) Annulation d'une vente : un code à usage unique est remis au responsable du restaurant ;
--    lui seul peut ensuite confirmer ou contester l'annulation. Après 30 jours, les ventes
--    annulées ne sont plus visibles que par le responsable de leur restaurant.

create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.invited_at is null then
    return new;
  end if;
  insert into public.app_users (id, role, display_name)
  values (
    new.id,
    'restaurant_admin',
    left(coalesce(new.raw_user_meta_data ->> 'display_name', ''), 100)
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

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
    insert into public.app_users (id, role, restaurant_id, display_name)
    values (p_owner, 'restaurant_admin', v_id, left(trim(p_name), 100))
    on conflict (id) do update
      set role = 'restaurant_admin', restaurant_id = v_id,
          display_name = coalesce(nullif(public.app_users.display_name, ''), excluded.display_name);
  end if;
  if p_tables > 0 then perform public.admin_add_tables(v_id, p_tables); end if;
  return v_id;
end;
$$;
revoke execute on function public.admin_provision_restaurant(text, text, text, text, uuid, integer) from public, anon, authenticated;
grant execute on function public.admin_provision_restaurant(text, text, text, text, uuid, integer) to service_role;

-- Codes d'annulation : seul le hash est conservé, jamais lisible par l'API.
create table if not exists public.pos_void_codes (
  sale_id uuid primary key references public.pos_sales(id) on delete cascade,
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  code_hash text not null check (code_hash ~ '^[a-f0-9]{64}$'),
  failed_attempts integer not null default 0,
  created_at timestamptz not null default now(),
  used_at timestamptz
);
alter table public.pos_void_codes enable row level security;
revoke all on public.pos_void_codes from anon, authenticated;

create table if not exists public.pos_void_reviews (
  sale_id uuid primary key references public.pos_sales(id) on delete cascade,
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  decision text not null check (decision in ('confirmed', 'contested')),
  note text check (length(note) <= 300),
  reviewed_by uuid references auth.users(id) on delete set null,
  reviewed_at timestamptz not null default now()
);
alter table public.pos_void_reviews enable row level security;
revoke all on public.pos_void_reviews from anon, authenticated;
grant select on public.pos_void_reviews to authenticated;
create policy "Restaurant owner reads void reviews"
  on public.pos_void_reviews for select to authenticated
  using (public.current_app_role() = 'restaurant_admin' and restaurant_id = public.current_restaurant_id());

-- Le code est renvoyé une seule fois, au moment de l'annulation.
drop function if exists public.void_pos_sale(uuid, text);
create function public.void_pos_sale(
  p_sale_id uuid,
  p_reason text default null
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_role text;
  v_restaurant_id uuid;
  v_sale public.pos_sales%rowtype;
  v_alphabet constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  v_bytes bytea := extensions.gen_random_bytes(8);
  v_code text := '';
begin
  if v_user_id is null then
    raise exception 'Authentication required' using errcode = '28000';
  end if;
  if length(coalesce(p_reason, '')) > 300 then
    raise exception 'Void reason is too long' using errcode = '22023';
  end if;

  select role, restaurant_id into v_role, v_restaurant_id
  from public.app_users
  where id = v_user_id;

  if v_role <> 'restaurant_admin' or v_restaurant_id is null then
    raise exception 'Only a restaurant manager can void a sale' using errcode = '42501';
  end if;

  select * into v_sale from public.pos_sales where id = p_sale_id for update;
  if not found or v_sale.restaurant_id <> v_restaurant_id then
    raise exception 'Sale not found' using errcode = 'P0002';
  end if;
  if v_sale.voided_at is not null then
    raise exception 'Sale is already voided' using errcode = '23505';
  end if;
  if exists (
    select 1 from public.pos_z_reports z
    where z.restaurant_id = v_restaurant_id
      and z.through_seq >= (
        select j.seq from public.pos_journal j
        where j.restaurant_id = v_restaurant_id and j.sale_id = p_sale_id and j.entry_type = 'sale'
      )
  ) then
    raise exception 'Sale belongs to a closed day' using errcode = '23514';
  end if;

  update public.pos_sales
  set voided_at = now(), voided_by = v_user_id, void_reason = nullif(trim(coalesce(p_reason, '')), '')
  where id = p_sale_id;

  perform public.pos_journal_append(v_restaurant_id, 'reversal', p_sale_id, v_sale.ticket_number,
    -v_sale.total_dzd, v_sale.payment_method, v_user_id, clock_timestamp(),
    jsonb_build_object('reason', nullif(trim(coalesce(p_reason, '')), '')));

  for i in 0..7 loop
    v_code := v_code || substr(v_alphabet, (get_byte(v_bytes, i) % 32) + 1, 1);
  end loop;
  insert into public.pos_void_codes (sale_id, restaurant_id, code_hash)
  values (p_sale_id, v_restaurant_id, encode(extensions.digest(v_code, 'sha256'), 'hex'));

  return v_code;
end;
$$;
revoke execute on function public.void_pos_sale(uuid, text) from public, anon;
grant execute on function public.void_pos_sale(uuid, text) to authenticated;

-- Confirme ou conteste une annulation avec son code (usage unique, 5 essais maximum).
create or replace function public.review_voided_sale(
  p_sale_id uuid,
  p_code text,
  p_decision text,
  p_note text default null
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_restaurant_id uuid;
  v_role text;
  v_row public.pos_void_codes%rowtype;
  v_code text := upper(regexp_replace(coalesce(p_code, ''), '[^A-Za-z0-9]', '', 'g'));
begin
  if v_user_id is null then
    raise exception 'Authentication required' using errcode = '28000';
  end if;
  if p_decision not in ('confirmed', 'contested') or length(coalesce(p_note, '')) > 300 then
    raise exception 'Invalid decision' using errcode = '22023';
  end if;

  select role, restaurant_id into v_role, v_restaurant_id from public.app_users where id = v_user_id;
  if v_role <> 'restaurant_admin' or v_restaurant_id is null then
    raise exception 'Only a restaurant manager can review a void' using errcode = '42501';
  end if;

  select * into v_row from public.pos_void_codes
  where sale_id = p_sale_id and restaurant_id = v_restaurant_id
  for update;
  if not found or v_row.used_at is not null or v_row.failed_attempts >= 5 then
    raise exception 'Void code unavailable' using errcode = '42501';
  end if;

  if v_row.code_hash <> encode(extensions.digest(v_code, 'sha256'), 'hex') then
    update public.pos_void_codes set failed_attempts = failed_attempts + 1 where sale_id = p_sale_id;
    return false;
  end if;

  update public.pos_void_codes set used_at = now() where sale_id = p_sale_id;
  insert into public.pos_void_reviews (sale_id, restaurant_id, decision, note, reviewed_by)
  values (p_sale_id, v_restaurant_id, p_decision, nullif(trim(coalesce(p_note, '')), ''), v_user_id);
  perform public.write_audit(v_restaurant_id, 'pos_void_reviewed', 'pos_sale', p_sale_id::text, null,
    jsonb_build_object('decision', p_decision));
  return true;
end;
$$;
revoke execute on function public.review_voided_sale(uuid, text, text, text) from public, anon;
grant execute on function public.review_voided_sale(uuid, text, text, text) to authenticated;

-- Ventes annulées depuis plus de 30 jours : visibles uniquement par le responsable du restaurant.
drop policy if exists "Restaurant team reads POS sales" on public.pos_sales;
create policy "Restaurant team reads POS sales"
  on public.pos_sales for select to authenticated
  using (
    (
      public.can_access_restaurant(restaurant_id)
      or (cashier_user_id = (select auth.uid()) and restaurant_id = public.current_restaurant_id())
    )
    and (
      voided_at is null
      or voided_at > now() - interval '30 days'
      or (public.current_app_role() = 'restaurant_admin' and restaurant_id = public.current_restaurant_id())
    )
  );

drop policy if exists "Restaurant team reads POS sale items" on public.pos_sale_items;
create policy "Restaurant team reads POS sale items"
  on public.pos_sale_items for select to authenticated
  using (
    exists (
      select 1
      from public.pos_sales sale
      where sale.id = sale_id
        and (
          public.can_access_restaurant(sale.restaurant_id)
          or (sale.cashier_user_id = (select auth.uid()) and sale.restaurant_id = public.current_restaurant_id())
        )
        and (
          sale.voided_at is null
          or sale.voided_at > now() - interval '30 days'
          or (public.current_app_role() = 'restaurant_admin' and sale.restaurant_id = public.current_restaurant_id())
        )
    )
  );
