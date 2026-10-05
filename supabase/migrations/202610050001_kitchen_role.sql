-- RÃ´le `kitchen` : lit les commandes de SON restaurant et change leur statut. Rien d'autre.
-- Retour arriÃ¨re : supabase/rollback/202610050001_kitchen_role.down.sql

alter table public.app_users
  drop constraint if exists app_users_role_check;
alter table public.app_users
  add constraint app_users_role_check
  check (role in ('super_admin', 'restaurant_admin', 'server', 'reseller', 'kitchen'));

create table if not exists public.table_orders (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  table_label text not null check (length(trim(table_label)) between 1 and 40),
  status text not null default 'new'
    check (status in ('new', 'preparing', 'ready', 'served', 'cancelled')),
  note text check (length(note) <= 300),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, restaurant_id)
);

create table if not exists public.table_order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null,
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  product_name text not null check (length(product_name) between 1 and 120),
  quantity integer not null check (quantity between 1 and 100),
  created_at timestamptz not null default now(),
  foreign key (order_id, restaurant_id)
    references public.table_orders(id, restaurant_id) on delete cascade
);

create index if not exists table_orders_restaurant_status_idx
  on public.table_orders(restaurant_id, status, created_at desc);
create index if not exists table_order_items_order_idx
  on public.table_order_items(order_id);

create or replace function public.guard_table_order_update()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.restaurant_id is distinct from old.restaurant_id
     or new.table_label is distinct from old.table_label
     or new.note is distinct from old.note
     or new.created_by is distinct from old.created_by
     or new.created_at is distinct from old.created_at
     or new.id is distinct from old.id then
    raise exception 'Only the order status can be changed' using errcode = '42501';
  end if;
  if new.status is distinct from old.status and not (
    (old.status = 'new' and new.status in ('preparing', 'cancelled'))
    or (old.status = 'preparing' and new.status in ('ready', 'cancelled'))
    or (old.status = 'ready' and new.status = 'served')
  ) then
    raise exception 'Invalid order status transition % -> %', old.status, new.status using errcode = '22023';
  end if;
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists table_orders_guard_update on public.table_orders;
create trigger table_orders_guard_update
  before update on public.table_orders
  for each row execute procedure public.guard_table_order_update();

alter table public.table_orders enable row level security;
alter table public.table_order_items enable row level security;

revoke all on public.table_orders, public.table_order_items from anon, authenticated;
grant select, insert on public.table_orders, public.table_order_items to authenticated;
grant update (status) on public.table_orders to authenticated;

create policy "Team reads orders of its restaurant"
  on public.table_orders for select to authenticated
  using (
    public.is_super_admin()
    or (
      public.current_app_role() in ('restaurant_admin', 'server', 'kitchen')
      and restaurant_id = public.current_restaurant_id()
    )
  );

create policy "Admins and servers create orders"
  on public.table_orders for insert to authenticated
  with check (
    public.current_app_role() in ('restaurant_admin', 'server')
    and restaurant_id = public.current_restaurant_id()
    and status = 'new'
  );

create policy "Team changes order status"
  on public.table_orders for update to authenticated
  using (
    public.current_app_role() in ('restaurant_admin', 'server', 'kitchen')
    and restaurant_id = public.current_restaurant_id()
  )
  with check (
    restaurant_id = public.current_restaurant_id()
    and (public.current_app_role() <> 'kitchen' or status in ('preparing', 'ready', 'served'))
  );

create policy "Team reads order items of its restaurant"
  on public.table_order_items for select to authenticated
  using (
    public.is_super_admin()
    or (
      public.current_app_role() in ('restaurant_admin', 'server', 'kitchen')
      and restaurant_id = public.current_restaurant_id()
    )
  );

create policy "Admins and servers add order items"
  on public.table_order_items for insert to authenticated
  with check (
    public.current_app_role() in ('restaurant_admin', 'server')
    and restaurant_id = public.current_restaurant_id()
  );

-- La cuisine ne voit que son propre compte, pas le reste de l'équipe.
drop policy if exists "Users see their own account or their restaurant team" on public.app_users;
create policy "Users see their own account or their restaurant team"
  on public.app_users for select to authenticated
  using (
    id = (select auth.uid())
    or public.is_super_admin()
    or (
      restaurant_id is not null
      and restaurant_id = public.current_restaurant_id()
      and public.current_app_role() <> 'kitchen'
    )
  );
