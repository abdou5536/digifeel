create table if not exists public.pos_products (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  name text not null check (length(trim(name)) between 1 and 120),
  category text not null default 'Général' check (length(trim(category)) between 1 and 60),
  price_dzd integer not null check (price_dzd between 0 and 100000000),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, restaurant_id)
);

alter table public.restaurants alter column google_review_url drop not null;

create or replace function public.setup_pos_restaurant(
  p_name text,
  p_address text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_restaurant_id uuid;
begin
  if v_user_id is null then
    raise exception 'Authentication required' using errcode = '28000';
  end if;
  if length(trim(coalesce(p_name, ''))) not between 2 and 120
     or length(coalesce(p_address, '')) > 200 then
    raise exception 'Restaurant details are invalid' using errcode = '22023';
  end if;

  perform 1 from public.app_users
  where id = v_user_id
    and role = 'restaurant_admin'
    and restaurant_id is null
  for update;
  if not found then
    raise exception 'This account already has a restaurant or cannot create one' using errcode = '42501';
  end if;

  insert into public.restaurants (name, google_review_url, address)
  values (trim(p_name), null, nullif(trim(coalesce(p_address, '')), ''))
  returning id into v_restaurant_id;

  update public.app_users
  set restaurant_id = v_restaurant_id,
      display_name = coalesce(nullif(display_name, ''), trim(p_name))
  where id = v_user_id;

  return v_restaurant_id;
end;
$$;

revoke execute on function public.setup_pos_restaurant(text, text) from public, anon;
grant execute on function public.setup_pos_restaurant(text, text) to authenticated;

create table if not exists public.pos_sales (
  id uuid primary key,
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  cashier_user_id uuid not null references auth.users(id) on delete restrict,
  total_dzd bigint not null default 0 check (total_dzd between 0 and 100000000000),
  payment_method text not null check (payment_method in ('cash', 'card', 'baridimob')),
  payment_reference text check (length(payment_reference) <= 120),
  sync_source text not null default 'online' check (sync_source in ('online', 'offline')),
  sold_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table if not exists public.pos_sale_items (
  id uuid primary key default gen_random_uuid(),
  sale_id uuid not null references public.pos_sales(id) on delete cascade,
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  product_id uuid not null,
  product_name text not null check (length(product_name) between 1 and 120),
  quantity integer not null check (quantity between 1 and 100),
  unit_price_dzd integer not null check (unit_price_dzd between 0 and 100000000),
  line_total_dzd bigint generated always as (quantity::bigint * unit_price_dzd::bigint) stored,
  created_at timestamptz not null default now(),
  foreign key (product_id, restaurant_id)
    references public.pos_products(id, restaurant_id) on delete restrict
);

create index if not exists pos_products_restaurant_active_idx
  on public.pos_products(restaurant_id, active, name);
create index if not exists pos_sales_restaurant_created_idx
  on public.pos_sales(restaurant_id, created_at desc);
create index if not exists pos_sale_items_sale_idx
  on public.pos_sale_items(sale_id);

alter table public.pos_products enable row level security;
alter table public.pos_sales enable row level security;
alter table public.pos_sale_items enable row level security;

create policy "Restaurant team reads POS products"
  on public.pos_products for select to authenticated
  using (
    public.can_access_restaurant(restaurant_id)
    or (
      public.current_app_role() = 'server'
      and public.current_restaurant_id() = restaurant_id
    )
  );

create policy "Servers read their restaurant for POS"
  on public.restaurants for select to authenticated
  using (
    public.current_app_role() = 'server'
    and id = public.current_restaurant_id()
  );

create policy "Restaurant admins manage POS products"
  on public.pos_products for all to authenticated
  using (
    public.current_app_role() = 'restaurant_admin'
    and public.current_restaurant_id() = restaurant_id
  )
  with check (
    public.current_app_role() = 'restaurant_admin'
    and public.current_restaurant_id() = restaurant_id
  );

create policy "Restaurant team reads POS sales"
  on public.pos_sales for select to authenticated
  using (
    public.can_access_restaurant(restaurant_id)
    or (cashier_user_id = (select auth.uid()) and restaurant_id = public.current_restaurant_id())
  );

create policy "Restaurant team reads POS sale items"
  on public.pos_sale_items for select to authenticated
  using (
    exists (
      select 1
      from public.pos_sales sale
      where sale.id = sale_id
        and (
          public.can_access_restaurant(sale.restaurant_id)
          or (
            sale.cashier_user_id = (select auth.uid())
            and sale.restaurant_id = public.current_restaurant_id()
          )
        )
    )
  );

grant select, insert, update, delete on public.pos_products to authenticated;
grant select on public.pos_sales, public.pos_sale_items to authenticated;
revoke insert, update, delete on public.pos_sales, public.pos_sale_items from anon, authenticated;

create or replace function public.submit_pos_sale(
  p_sale_id uuid,
  p_items jsonb,
  p_payment_method text,
  p_payment_reference text default null,
  p_sync_source text default 'online',
  p_sold_at timestamptz default now()
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_restaurant_id uuid;
  v_role text;
  v_item jsonb;
  v_product_id uuid;
  v_quantity integer;
  v_price integer;
  v_product_price integer;
  v_name text;
  v_total bigint := 0;
  v_existing_restaurant uuid;
  v_existing_cashier uuid;
begin
  if v_user_id is null then
    raise exception 'Authentication required' using errcode = '28000';
  end if;

  select role, restaurant_id
  into v_role, v_restaurant_id
  from public.app_users
  where id = v_user_id;

  if v_role not in ('restaurant_admin', 'server') or v_restaurant_id is null then
    raise exception 'POS access denied' using errcode = '42501';
  end if;
  if p_sale_id is null
     or p_payment_method is null
     or p_payment_method not in ('cash', 'card', 'baridimob')
     or p_sync_source not in ('online', 'offline')
     or p_sync_source is null
     or length(coalesce(p_payment_reference, '')) > 120
     or p_sold_at is null
     or p_sold_at < now() - interval '30 days'
     or p_sold_at > now() + interval '5 minutes'
     or p_items is null
     or jsonb_typeof(p_items) <> 'array' then
    raise exception 'Sale details are invalid' using errcode = '22023';
  end if;
  if jsonb_array_length(p_items) not between 1 and 100 then
    raise exception 'Sale item count is invalid' using errcode = '22023';
  end if;

  select restaurant_id, cashier_user_id
  into v_existing_restaurant, v_existing_cashier
  from public.pos_sales
  where id = p_sale_id;
  if found then
    if v_existing_restaurant <> v_restaurant_id or v_existing_cashier <> v_user_id then
      raise exception 'Sale id is already in use' using errcode = '23505';
    end if;
    return p_sale_id;
  end if;

  for v_item in select value from jsonb_array_elements(p_items)
  loop
    if coalesce(v_item->>'productId', '') !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
       or coalesce(v_item->>'quantity', '') !~ '^[0-9]{1,3}$'
       or coalesce(v_item->>'priceDzd', '') !~ '^[0-9]{1,9}$' then
      raise exception 'Sale item is invalid' using errcode = '22023';
    end if;

    v_product_id := (v_item->>'productId')::uuid;
    v_quantity := (v_item->>'quantity')::integer;
    v_price := (v_item->>'priceDzd')::integer;
    if v_quantity not between 1 and 100 then
      raise exception 'Sale quantity is invalid' using errcode = '22023';
    end if;

    select name, price_dzd into v_name, v_product_price
    from public.pos_products
    where id = v_product_id
      and restaurant_id = v_restaurant_id
    for share;
    if not found then
      raise exception 'Product is unavailable' using errcode = '22023';
    end if;
    if v_product_price <> v_price then
      raise exception 'Product price changed or product is unavailable' using errcode = '22023';
    end if;
    v_total := v_total + (v_price::bigint * v_quantity::bigint);
    if v_total > 100000000000 then
      raise exception 'Sale total is too large' using errcode = '22023';
    end if;
  end loop;

  insert into public.pos_sales (id, restaurant_id, cashier_user_id, total_dzd, payment_method, payment_reference, sync_source, sold_at)
  values (p_sale_id, v_restaurant_id, v_user_id, v_total, p_payment_method, nullif(trim(coalesce(p_payment_reference, '')), ''), p_sync_source, p_sold_at);

  for v_item in select value from jsonb_array_elements(p_items)
  loop
    v_product_id := (v_item->>'productId')::uuid;
    v_quantity := (v_item->>'quantity')::integer;
    v_price := (v_item->>'priceDzd')::integer;
    select name into v_name
    from public.pos_products
    where id = v_product_id and restaurant_id = v_restaurant_id;
    insert into public.pos_sale_items (sale_id, restaurant_id, product_id, product_name, quantity, unit_price_dzd)
    values (p_sale_id, v_restaurant_id, v_product_id, v_name, v_quantity, v_price);
  end loop;

  return p_sale_id;
end;
$$;

revoke execute on function public.submit_pos_sale(uuid, jsonb, text, text, text, timestamptz) from public, anon;
grant execute on function public.submit_pos_sale(uuid, jsonb, text, text, text, timestamptz) to authenticated;
