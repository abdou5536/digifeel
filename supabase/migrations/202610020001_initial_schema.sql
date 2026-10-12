-- Digifeel schema for Supabase. Run with `supabase db push`.
create extension if not exists pgcrypto with schema extensions;

create table if not exists public.restaurants (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(trim(name)) between 2 and 120),
  google_review_url text not null,
  address text,
  city text,
  tip_enabled boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.chip_batches (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(trim(name)) between 1 and 100),
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now()
);

create table if not exists public.servers (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  user_id uuid unique references auth.users(id) on delete set null,
  name text not null check (length(trim(name)) between 2 and 100),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (id, restaurant_id)
);

create table if not exists public.app_users (
  id uuid primary key references auth.users(id) on delete cascade,
  role text not null default 'restaurant_admin'
    check (role in ('super_admin', 'restaurant_admin', 'server')),
  restaurant_id uuid references public.restaurants(id) on delete cascade,
  server_id uuid,
  display_name text not null default '',
  created_at timestamptz not null default now(),
  constraint app_users_server_restaurant_fk
    foreign key (server_id, restaurant_id)
    references public.servers(id, restaurant_id)
    on delete set null (server_id)
);

create table if not exists public.chips (
  id text primary key default gen_random_uuid()::text,
  batch_id uuid references public.chip_batches(id) on delete set null,
  restaurant_id uuid references public.restaurants(id) on delete set null,
  activation_code_hash text not null unique,
  status text not null default 'inactive' check (status in ('inactive', 'active', 'disabled')),
  activated_at timestamptz,
  created_at timestamptz not null default now(),
  constraint chips_activation_code_hash_format check (activation_code_hash ~ '^[a-f0-9]{64}$')
);

create table if not exists public.scans (
  id uuid primary key default gen_random_uuid(),
  chip_id text not null references public.chips(id) on delete cascade,
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  device_hash text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.reviews (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  chip_id text not null references public.chips(id) on delete restrict,
  server_id uuid,
  stars smallint not null check (stars between 1 and 5),
  comment text not null default '' check (length(comment) <= 2000),
  device_hash text not null,
  created_at timestamptz not null default now(),
  constraint reviews_server_restaurant_fk
    foreign key (server_id, restaurant_id)
    references public.servers(id, restaurant_id)
    on delete set null (server_id)
);

create table if not exists public.tips (
  id uuid primary key default gen_random_uuid(),
  review_id uuid not null unique references public.reviews(id) on delete cascade,
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  server_id uuid,
  amount_minor integer not null check (amount_minor between 0 and 1000000),
  currency text not null default 'EUR' check (currency in ('EUR', 'DZD')),
  status text not null default 'not_collected'
    check (status in ('not_collected', 'pending', 'paid', 'refunded')),
  created_at timestamptz not null default now(),
  constraint tips_server_restaurant_fk
    foreign key (server_id, restaurant_id)
    references public.servers(id, restaurant_id)
    on delete set null (server_id)
);

create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null unique references public.restaurants(id) on delete cascade,
  status text not null default 'trialing'
    check (status in ('trialing', 'active', 'past_due', 'canceled', 'inactive')),
  started_at timestamptz not null default now(),
  trial_ends_at timestamptz not null default (now() + interval '30 days'),
  current_period_ends_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.rate_limit_windows (
  key_hash text not null,
  action text not null,
  window_start timestamptz not null,
  request_count integer not null check (request_count >= 1),
  primary key (key_hash, action, window_start)
);

create index if not exists chips_restaurant_id_idx on public.chips(restaurant_id);
create index if not exists scans_restaurant_created_idx on public.scans(restaurant_id, created_at desc);
create index if not exists scans_device_created_idx on public.scans(device_hash, created_at desc);
create index if not exists reviews_restaurant_created_idx on public.reviews(restaurant_id, created_at desc);
create index if not exists reviews_server_created_idx on public.reviews(server_id, created_at desc);
create index if not exists tips_restaurant_created_idx on public.tips(restaurant_id, created_at desc);
create index if not exists subscriptions_status_idx on public.subscriptions(status);

create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
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

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_auth_user();

create or replace function public.current_app_role()
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select role from public.app_users where id = (select auth.uid())
$$;

create or replace function public.current_restaurant_id()
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select restaurant_id from public.app_users where id = (select auth.uid())
$$;

create or replace function public.current_server_id()
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select server_id from public.app_users where id = (select auth.uid())
$$;

create or replace function public.is_super_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(public.current_app_role() = 'super_admin', false)
$$;

create or replace function public.can_access_restaurant(target_restaurant uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    public.is_super_admin()
    or (
      public.current_app_role() = 'restaurant_admin'
      and public.current_restaurant_id() = target_restaurant
    ),
    false
  )
$$;

create or replace function public.consume_rate_limit(
  p_key_hash text,
  p_action text,
  p_limit integer,
  p_window_seconds integer
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_window timestamptz;
  v_count integer;
begin
  if p_key_hash !~ '^[a-f0-9]{64}$'
     or p_action not in ('scan', 'review')
     or p_limit < 1
     or p_window_seconds < 1
     or p_window_seconds > 86400 then
    raise exception 'Invalid rate limit arguments' using errcode = '22023';
  end if;

  v_window := to_timestamp(
    floor(extract(epoch from now()) / p_window_seconds) * p_window_seconds
  );

  insert into public.rate_limit_windows (key_hash, action, window_start, request_count)
  values (p_key_hash, p_action, v_window, 1)
  on conflict (key_hash, action, window_start)
  do update set request_count = public.rate_limit_windows.request_count + 1
  returning request_count into v_count;

  return v_count <= p_limit;
end;
$$;

create or replace function public.activate_chip_with_owner(
  p_chip_id text,
  p_activation_code text,
  p_restaurant_name text,
  p_google_review_url text,
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
  v_code text := upper(regexp_replace(trim(p_activation_code), '[^A-Za-z0-9]', '', 'g'));
begin
  if v_user_id is null then
    raise exception 'Authentication required' using errcode = '28000';
  end if;

  if length(trim(p_restaurant_name)) not between 2 and 120
     or p_google_review_url !~* '^https://([a-z0-9-]+\.)*google\.com/'
        and p_google_review_url !~* '^https://(www\.)?g\.page/'
        and p_google_review_url !~* '^https://maps\.app\.goo\.gl/' then
    raise exception 'Restaurant details or Google review URL are invalid' using errcode = '22023';
  end if;

  if length(v_code) not between 24 and 32 or p_chip_id !~ '^[0-9a-f-]{36}$' then
    raise exception 'Activation code or chip id is invalid' using errcode = '22023';
  end if;

  perform 1 from public.app_users
  where id = v_user_id and role = 'restaurant_admin' and restaurant_id is null
  for update;
  if not found then
    raise exception 'This account cannot activate a chip' using errcode = '42501';
  end if;

  perform 1 from public.chips
  where id = p_chip_id
    and status = 'inactive'
    and activation_code_hash = encode(extensions.digest(v_code, 'sha256'), 'hex')
  for update;
  if not found then
    raise exception 'Activation code is invalid or already used' using errcode = 'P0002';
  end if;

  insert into public.restaurants (name, google_review_url, address)
  values (trim(p_restaurant_name), trim(p_google_review_url), nullif(trim(coalesce(p_address, '')), ''))
  returning id into v_restaurant_id;

  update public.app_users
  set restaurant_id = v_restaurant_id, display_name = coalesce(nullif(display_name, ''), trim(p_restaurant_name))
  where id = v_user_id;

  update public.chips
  set restaurant_id = v_restaurant_id,
      status = 'active',
      activated_at = now(),
      activation_code_hash = encode(extensions.digest(extensions.gen_random_bytes(32), 'sha256'), 'hex')
  where id = p_chip_id;

  insert into public.subscriptions (restaurant_id, status, trial_ends_at)
  values (v_restaurant_id, 'trialing', now() + interval '30 days');

  return v_restaurant_id;
end;
$$;

create or replace function public.create_chip_batch(p_name text, p_count integer)
returns table(chip_id text, activation_code text)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_batch_id uuid;
  v_code text;
  v_chip_id text;
  i integer;
begin
  if auth.uid() is null or not public.is_super_admin() then
    raise exception 'Super-admin access required' using errcode = '42501';
  end if;
  if length(trim(p_name)) not between 1 and 100 or p_count not between 1 and 100 then
    raise exception 'Batch name or size is invalid' using errcode = '22023';
  end if;

  insert into public.chip_batches (name, created_by)
  values (trim(p_name), auth.uid())
  returning id into v_batch_id;

  for i in 1..p_count loop
    v_chip_id := pg_catalog.gen_random_uuid()::text;
    v_code := upper(encode(extensions.gen_random_bytes(16), 'hex'));
    insert into public.chips (id, batch_id, activation_code_hash)
    values (
      v_chip_id,
      v_batch_id,
      encode(extensions.digest(v_code, 'sha256'), 'hex')
    );
    chip_id := v_chip_id;
    activation_code := v_code;
    return next;
  end loop;
end;
$$;

create or replace function public.record_public_scan(p_chip_id text, p_device_hash text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_restaurant_id uuid;
begin
  if p_device_hash !~ '^[a-f0-9]{64}$'
     or not public.consume_rate_limit(p_device_hash, 'scan', 40, 60) then
    return false;
  end if;

  select restaurant_id into v_restaurant_id
  from public.chips
  where id = p_chip_id and status = 'active' and restaurant_id is not null;

  if v_restaurant_id is null then
    return false;
  end if;

  if exists (
    select 1 from public.scans
    where chip_id = p_chip_id and device_hash = p_device_hash
      and created_at > now() - interval '90 seconds'
  ) then
    return true;
  end if;

  insert into public.scans (chip_id, restaurant_id, device_hash)
  values (p_chip_id, v_restaurant_id, p_device_hash);
  return true;
end;
$$;

create or replace function public.submit_public_review(
  p_chip_id text,
  p_device_hash text,
  p_stars integer,
  p_comment text,
  p_server_id uuid,
  p_tip_amount_minor integer
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_restaurant_id uuid;
  v_google_url text;
  v_tip_enabled boolean;
  v_review_id uuid;
begin
  if p_device_hash !~ '^[a-f0-9]{64}$'
     or not public.consume_rate_limit(p_device_hash, 'review', 6, 3600) then
    raise exception 'Too many review submissions. Please try again later.' using errcode = '54000';
  end if;

  if p_stars not between 1 and 5
     or length(coalesce(p_comment, '')) > 2000
     or p_tip_amount_minor not between 0 and 1000000 then
    raise exception 'Review details are invalid' using errcode = '22023';
  end if;

  select c.restaurant_id, r.google_review_url, r.tip_enabled
  into v_restaurant_id, v_google_url, v_tip_enabled
  from public.chips c
  join public.restaurants r on r.id = c.restaurant_id
  where c.id = p_chip_id and c.status = 'active';

  if v_restaurant_id is null then
    raise exception 'Chip is unavailable' using errcode = 'P0002';
  end if;

  if p_server_id is not null and not exists (
    select 1 from public.servers
    where id = p_server_id and restaurant_id = v_restaurant_id and active
  ) then
    raise exception 'Selected server is unavailable' using errcode = '22023';
  end if;

  insert into public.reviews (restaurant_id, chip_id, server_id, stars, comment, device_hash)
  values (v_restaurant_id, p_chip_id, p_server_id, p_stars, coalesce(trim(p_comment), ''), p_device_hash)
  returning id into v_review_id;

  if p_tip_amount_minor > 0 and v_tip_enabled then
    insert into public.tips (review_id, restaurant_id, server_id, amount_minor, status)
    values (v_review_id, v_restaurant_id, p_server_id, p_tip_amount_minor, 'not_collected');
  end if;

  return jsonb_build_object(
    'review_id', v_review_id,
    'google_review_url', v_google_url,
    'tip_collected', false
  );
end;
$$;

alter table public.restaurants enable row level security;
alter table public.chip_batches enable row level security;
alter table public.chips enable row level security;
alter table public.app_users enable row level security;
alter table public.servers enable row level security;
alter table public.scans enable row level security;
alter table public.reviews enable row level security;
alter table public.tips enable row level security;
alter table public.subscriptions enable row level security;
alter table public.rate_limit_windows enable row level security;

create policy "Users see their own account or their restaurant team"
  on public.app_users for select to authenticated
  using (
    id = (select auth.uid())
    or public.is_super_admin()
    or (restaurant_id is not null and restaurant_id = public.current_restaurant_id())
  );

create policy "Restaurant team reads its restaurant"
  on public.restaurants for select to authenticated
  using (public.can_access_restaurant(id));

create policy "Restaurant owners update their restaurant settings"
  on public.restaurants for update to authenticated
  using (
    public.is_super_admin()
    or (public.current_app_role() = 'restaurant_admin' and id = public.current_restaurant_id())
  )
  with check (
    public.is_super_admin()
    or (public.current_app_role() = 'restaurant_admin' and id = public.current_restaurant_id())
  );

create policy "Super admins manage chip batches"
  on public.chip_batches for all to authenticated
  using (public.is_super_admin()) with check (public.is_super_admin());

create policy "Restaurant team reads its chips"
  on public.chips for select to authenticated
  using (public.is_super_admin() or public.can_access_restaurant(restaurant_id));

create policy "Restaurant team reads its servers"
  on public.servers for select to authenticated
  using (public.can_access_restaurant(restaurant_id));

create policy "Servers read their own server profile"
  on public.servers for select to authenticated
  using (id = public.current_server_id() and user_id = (select auth.uid()));

create policy "Restaurant owners manage servers"
  on public.servers for all to authenticated
  using (public.is_super_admin() or (
    public.current_app_role() = 'restaurant_admin'
    and restaurant_id = public.current_restaurant_id()
  ))
  with check (public.is_super_admin() or (
    public.current_app_role() = 'restaurant_admin'
    and restaurant_id = public.current_restaurant_id()
  ));

create policy "Restaurant admins read scans"
  on public.scans for select to authenticated
  using (public.can_access_restaurant(restaurant_id));

create policy "Restaurant admins and assigned servers read reviews"
  on public.reviews for select to authenticated
  using (
    public.can_access_restaurant(restaurant_id)
    or (public.current_app_role() = 'server' and server_id = public.current_server_id())
  );

create policy "Restaurant admins and assigned servers read tips"
  on public.tips for select to authenticated
  using (
    public.can_access_restaurant(restaurant_id)
    or (public.current_app_role() = 'server' and server_id = public.current_server_id())
  );

create policy "Restaurant admins read subscriptions"
  on public.subscriptions for select to authenticated
  using (public.can_access_restaurant(restaurant_id));

revoke all on public.rate_limit_windows from anon, authenticated;
revoke execute on function public.activate_chip_with_owner(text, text, text, text, text) from public, anon;
revoke execute on function public.record_public_scan(text, text) from public, anon, authenticated;
revoke execute on function public.submit_public_review(text, text, integer, text, uuid, integer) from public, anon, authenticated;
revoke execute on function public.consume_rate_limit(text, text, integer, integer) from public, anon, authenticated;
grant execute on function public.activate_chip_with_owner(text, text, text, text, text) to authenticated;
revoke execute on function public.create_chip_batch(text, integer) from public, anon;
grant execute on function public.create_chip_batch(text, integer) to authenticated;
grant execute on function public.record_public_scan(text, text) to service_role;
grant execute on function public.submit_public_review(text, text, integer, text, uuid, integer) to service_role;
grant execute on function public.consume_rate_limit(text, text, integer, integer) to service_role;

grant select on public.restaurants, public.chips, public.app_users, public.servers,
  public.scans, public.reviews, public.tips, public.subscriptions, public.chip_batches
to authenticated;
grant update on public.restaurants to authenticated;
grant insert, update, delete on public.servers to authenticated;
