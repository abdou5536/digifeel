alter table public.app_users
  drop constraint if exists app_users_role_check;
alter table public.app_users
  add constraint app_users_role_check
  check (role in ('super_admin', 'restaurant_admin', 'server', 'reseller'));

create table if not exists public.reseller_profiles (
  user_id uuid primary key references public.app_users(id) on delete cascade,
  city text not null default '' check (length(city) <= 100),
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  referral_code text unique,
  created_at timestamptz not null default now(),
  approved_at timestamptz,
  check ((status = 'approved') = (referral_code is not null))
);

alter table public.restaurants
  add column if not exists reseller_id uuid references public.reseller_profiles(user_id) on delete set null;

create table if not exists public.reseller_commission_settings (
  singleton boolean primary key default true check (singleton),
  rate_percent numeric(5,2) not null default 25 check (rate_percent between 20 and 30),
  duration_months integer not null default 12 check (duration_months between 1 and 60),
  cap_eur numeric(12,2) check (cap_eur is null or cap_eur >= 0),
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id)
);

insert into public.reseller_commission_settings (singleton)
values (true)
on conflict (singleton) do nothing;

create table if not exists public.reseller_payment_events (
  id uuid primary key default gen_random_uuid(),
  reseller_id uuid not null references public.reseller_profiles(user_id) on delete restrict,
  restaurant_id uuid not null references public.restaurants(id) on delete restrict,
  amount_eur numeric(12,2) not null check (amount_eur > 0 and amount_eur <= 1000000),
  kind text not null check (kind in ('installation', 'subscription', 'other')),
  payment_reference text not null unique check (length(payment_reference) between 1 and 120),
  status text not null default 'pending' check (status in ('pending', 'validated', 'rejected')),
  created_at timestamptz not null default now(),
  validated_at timestamptz,
  validated_by uuid references auth.users(id),
  check (status <> 'validated' or validated_at is not null)
);

create table if not exists public.reseller_commissions (
  id uuid primary key default gen_random_uuid(),
  reseller_id uuid not null references public.reseller_profiles(user_id) on delete restrict,
  restaurant_id uuid not null references public.restaurants(id) on delete restrict,
  payment_event_id uuid not null unique references public.reseller_payment_events(id) on delete restrict,
  period text not null check (period ~ '^\d{4}-\d{2}$'),
  amount_eur numeric(12,2) not null check (amount_eur > 0),
  status text not null default 'payable' check (status in ('payable', 'paid')),
  payout_id uuid,
  created_at timestamptz not null default now(),
  paid_at timestamptz
);

create table if not exists public.reseller_payouts (
  id uuid primary key default gen_random_uuid(),
  reseller_id uuid not null references public.reseller_profiles(user_id) on delete restrict,
  period text not null check (period ~ '^\d{4}-\d{2}$'),
  amount_eur numeric(12,2) not null check (amount_eur > 0),
  status text not null default 'pending' check (status in ('pending', 'paid')),
  created_at timestamptz not null default now(),
  paid_at timestamptz,
  paid_by uuid references auth.users(id),
  unique (reseller_id, period)
);

alter table public.reseller_commissions
  add constraint reseller_commissions_payout_fk
  foreign key (payout_id) references public.reseller_payouts(id) on delete restrict;

create table if not exists public.reseller_prospects (
  id uuid primary key default gen_random_uuid(),
  reseller_id uuid not null references public.reseller_profiles(user_id) on delete cascade,
  restaurant_name text not null check (length(trim(restaurant_name)) between 2 and 120),
  city text not null default '' check (length(city) <= 100),
  contact text not null check (length(trim(contact)) between 3 and 160),
  follow_up_at date not null,
  status text not null default 'prospect' check (status in ('prospect', 'demo', 'installed', 'active', 'terminated')),
  created_at timestamptz not null default now()
);

create index if not exists restaurants_reseller_idx on public.restaurants(reseller_id);
create index if not exists reseller_commissions_owner_period_idx on public.reseller_commissions(reseller_id, period desc);
create index if not exists reseller_payments_status_idx on public.reseller_payment_events(status, created_at desc);
create index if not exists reseller_prospects_owner_followup_idx on public.reseller_prospects(reseller_id, follow_up_at);

create or replace function public.apply_for_reseller(p_city text default '')
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null then
    raise exception 'Authentication required' using errcode = '28000';
  end if;
  if length(coalesce(p_city, '')) > 100 then
    raise exception 'City is too long' using errcode = '22023';
  end if;
  update public.app_users
  set role = 'reseller'
  where id = v_user_id and restaurant_id is null and role in ('restaurant_admin', 'reseller');
  if not found then
    raise exception 'This account cannot apply for reseller access' using errcode = '42501';
  end if;
  insert into public.reseller_profiles (user_id, city, status)
  values (v_user_id, trim(coalesce(p_city, '')), 'pending')
  on conflict (user_id) do update
    set city = excluded.city
    where public.reseller_profiles.status = 'pending';
end;
$$;

create or replace function public.review_reseller_application(p_user_id uuid, p_approve boolean)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_code text;
begin
  if not public.is_super_admin() then
    raise exception 'Super-admin permission required' using errcode = '42501';
  end if;
  if p_approve then
    v_code := 'DGF-' || upper(encode(extensions.gen_random_bytes(8), 'hex'));
    update public.reseller_profiles
    set status = 'approved', referral_code = v_code, approved_at = now()
    where user_id = p_user_id and status = 'pending';
    if not found then
      raise exception 'Pending reseller application not found' using errcode = 'P0002';
    end if;
    return v_code;
  end if;
  update public.reseller_profiles
  set status = 'rejected', referral_code = null, approved_at = null
  where user_id = p_user_id and status = 'pending';
  if not found then
    raise exception 'Pending reseller application not found' using errcode = 'P0002';
  end if;
  return null;
end;
$$;

create or replace function public.attach_reseller_referral(p_restaurant_id uuid, p_code text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_reseller_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Authentication required' using errcode = '28000';
  end if;
  select user_id into v_reseller_id
  from public.reseller_profiles
  where referral_code = upper(trim(p_code)) and status = 'approved';
  if v_reseller_id is null then
    raise exception 'Unknown or inactive reseller code' using errcode = '22023';
  end if;
  if v_reseller_id = auth.uid() then
    raise exception 'Self-referral is not allowed' using errcode = '22023';
  end if;
  update public.restaurants r
  set reseller_id = v_reseller_id
  where r.id = p_restaurant_id
    and r.reseller_id is null
    and exists (
      select 1 from public.app_users u
      where u.id = (select auth.uid())
        and u.role = 'restaurant_admin'
        and u.restaurant_id = r.id
    );
  if not found then
    raise exception 'Restaurant access denied or referral already attached' using errcode = '42501';
  end if;
end;
$$;

create or replace function public.create_reseller_commission_after_validation()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_restaurant_created timestamptz;
  v_rate numeric(5,2);
  v_duration integer;
  v_cap numeric(12,2);
  v_age_months integer;
  v_already_earned numeric(12,2);
  v_amount numeric(12,2);
begin
  if new.status <> 'validated' or (tg_op = 'UPDATE' and old.status = 'validated') then
    return new;
  end if;
  if not exists (
    select 1 from public.restaurants r
    where r.id = new.restaurant_id and r.reseller_id = new.reseller_id
  ) then
    raise exception 'Payment reseller does not own this restaurant attribution' using errcode = '23514';
  end if;
  select created_at into v_restaurant_created
  from public.restaurants where id = new.restaurant_id
  for update;
  select rate_percent, duration_months, cap_eur into v_rate, v_duration, v_cap
  from public.reseller_commission_settings where singleton = true;
  if new.created_at < v_restaurant_created
     or new.created_at >= v_restaurant_created + (v_duration || ' months')::interval then
    return new;
  end if;
  select coalesce(sum(amount_eur), 0) into v_already_earned
  from public.reseller_commissions where restaurant_id = new.restaurant_id;
  v_amount := round(new.amount_eur * v_rate / 100, 2);
  if v_cap is not null then
    v_amount := least(v_amount, greatest(0, v_cap - v_already_earned));
  end if;
  if v_amount > 0 then
    insert into public.reseller_commissions (
      reseller_id, restaurant_id, payment_event_id, period, amount_eur
    ) values (
      new.reseller_id, new.restaurant_id, new.id, to_char(new.created_at at time zone 'UTC', 'YYYY-MM'), v_amount
    );
  end if;
  return new;
end;
$$;

create trigger reseller_payment_validated
  after insert or update of status on public.reseller_payment_events
  for each row execute function public.create_reseller_commission_after_validation();

create or replace function public.authorize_reseller_payout(p_reseller_id uuid, p_period text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_payout_id uuid;
  v_total numeric(12,2);
begin
  if not public.is_super_admin() then
    raise exception 'Super-admin permission required' using errcode = '42501';
  end if;
  if p_period !~ '^\d{4}-\d{2}$' then
    raise exception 'Invalid payout period' using errcode = '22023';
  end if;
  select coalesce(sum(amount_eur), 0) into v_total
  from public.reseller_commissions
  where reseller_id = p_reseller_id and period = p_period and status = 'payable' and payout_id is null;
  if v_total <= 0 then
    raise exception 'No payable commission for this period' using errcode = 'P0002';
  end if;
  insert into public.reseller_payouts (reseller_id, period, amount_eur)
  values (p_reseller_id, p_period, v_total)
  returning id into v_payout_id;
  update public.reseller_commissions
  set payout_id = v_payout_id
  where reseller_id = p_reseller_id and period = p_period and status = 'payable' and payout_id is null;
  return v_payout_id;
end;
$$;

create or replace function public.confirm_reseller_payout(p_payout_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_super_admin() then
    raise exception 'Super-admin permission required' using errcode = '42501';
  end if;
  update public.reseller_payouts
  set status = 'paid', paid_at = now(), paid_by = auth.uid()
  where id = p_payout_id and status = 'pending';
  if not found then
    raise exception 'Pending payout not found' using errcode = 'P0002';
  end if;
  update public.reseller_commissions
  set status = 'paid', paid_at = now()
  where payout_id = p_payout_id and status = 'payable';
end;
$$;

alter table public.reseller_profiles enable row level security;
alter table public.reseller_commission_settings enable row level security;
alter table public.reseller_payment_events enable row level security;
alter table public.reseller_commissions enable row level security;
alter table public.reseller_payouts enable row level security;
alter table public.reseller_prospects enable row level security;

create policy "Users read own reseller profile"
  on public.reseller_profiles for select to authenticated
  using (user_id = (select auth.uid()) or public.is_super_admin());
create policy "Super-admin manages reseller profiles"
  on public.reseller_profiles for all to authenticated
  using (public.is_super_admin()) with check (public.is_super_admin());

create policy "Resellers read commission settings"
  on public.reseller_commission_settings for select to authenticated
  using (public.current_app_role() = 'reseller' or public.is_super_admin());
create policy "Super-admin manages commission settings"
  on public.reseller_commission_settings for all to authenticated
  using (public.is_super_admin()) with check (public.is_super_admin());

create policy "Resellers read own platform payments"
  on public.reseller_payment_events for select to authenticated
  using (reseller_id = (select auth.uid()) or public.is_super_admin());
create policy "Super-admin manages platform payments"
  on public.reseller_payment_events for all to authenticated
  using (public.is_super_admin()) with check (public.is_super_admin());

create policy "Resellers read own commissions"
  on public.reseller_commissions for select to authenticated
  using (reseller_id = (select auth.uid()) or public.is_super_admin());
create policy "Super-admin manages commissions"
  on public.reseller_commissions for all to authenticated
  using (public.is_super_admin()) with check (public.is_super_admin());

create policy "Resellers read own payouts"
  on public.reseller_payouts for select to authenticated
  using (reseller_id = (select auth.uid()) or public.is_super_admin());
create policy "Super-admin manages payouts"
  on public.reseller_payouts for all to authenticated
  using (public.is_super_admin()) with check (public.is_super_admin());

create policy "Resellers manage own prospects"
  on public.reseller_prospects for all to authenticated
  using (reseller_id = (select auth.uid()) or public.is_super_admin())
  with check (reseller_id = (select auth.uid()) or public.is_super_admin());

create policy "Resellers read own attributed restaurants"
  on public.restaurants for select to authenticated
  using (reseller_id = (select auth.uid()) or public.is_super_admin());

grant select on public.reseller_profiles, public.reseller_commission_settings,
  public.reseller_payment_events, public.reseller_commissions, public.reseller_payouts,
  public.reseller_prospects to authenticated;
grant insert, update, delete on public.reseller_prospects to authenticated;
grant insert, update on public.reseller_profiles, public.reseller_commission_settings,
  public.reseller_payment_events, public.reseller_commissions, public.reseller_payouts to authenticated;

revoke execute on function public.apply_for_reseller(text) from public, anon;
grant execute on function public.apply_for_reseller(text) to authenticated;
revoke execute on function public.review_reseller_application(uuid, boolean) from public, anon;
grant execute on function public.review_reseller_application(uuid, boolean) to authenticated;
revoke execute on function public.attach_reseller_referral(uuid, text) from public, anon;
grant execute on function public.attach_reseller_referral(uuid, text) to authenticated;
revoke execute on function public.authorize_reseller_payout(uuid, text) from public, anon;
grant execute on function public.authorize_reseller_payout(uuid, text) to authenticated;
revoke execute on function public.confirm_reseller_payout(uuid) from public, anon;
grant execute on function public.confirm_reseller_payout(uuid) to authenticated;
