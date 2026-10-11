alter table public.subscriptions
  add column if not exists stripe_customer_id text unique,
  add column if not exists stripe_subscription_id text unique,
  add column if not exists stripe_checkout_session_id text;

create table if not exists public.restaurant_menus (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  created_by uuid not null references auth.users(id) on delete restrict,
  public_slug text not null unique,
  title text not null check (length(trim(title)) between 2 and 120),
  sections jsonb not null default '[]'::jsonb check (jsonb_typeof(sections) = 'array'),
  status text not null default 'generating' check (status in ('generating', 'published')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists restaurant_menus_restaurant_created_idx
  on public.restaurant_menus (restaurant_id, created_at desc);

alter table public.restaurant_menus enable row level security;
revoke all on public.restaurant_menus from anon, authenticated;
grant select on public.restaurant_menus to anon, authenticated;

create policy "Public can read published restaurant menus"
  on public.restaurant_menus for select to anon
  using (status = 'published');

create policy "Restaurant admins can read their menus"
  on public.restaurant_menus for select to authenticated
  using (
    status = 'published'
    or restaurant_id = (
      select app_user.restaurant_id
      from public.app_users as app_user
      where app_user.id = (select auth.uid())
        and app_user.role = 'restaurant_admin'
    )
  );

create or replace function public.reserve_ai_menu(p_title text)
returns table(menu_id uuid, public_slug text, remaining_free_uses integer)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_restaurant_id uuid;
  v_subscription public.subscriptions;
  v_usage integer;
  v_menu_id uuid;
  v_slug text;
  v_paid boolean;
begin
  if v_user_id is null then
    raise exception 'Authentication required' using errcode = '28000';
  end if;
  if length(trim(coalesce(p_title, ''))) not between 2 and 120 then
    raise exception 'Menu title is invalid' using errcode = '22023';
  end if;

  select app_user.restaurant_id into v_restaurant_id
  from public.app_users as app_user
  where app_user.id = v_user_id
    and app_user.role = 'restaurant_admin';
  if v_restaurant_id is null then
    raise exception 'Restaurant admin access required' using errcode = '42501';
  end if;

  select * into v_subscription
  from public.subscriptions
  where restaurant_id = v_restaurant_id
  for update;
  if not found then
    raise exception 'Subscription not found' using errcode = 'P0002';
  end if;

  v_paid := v_subscription.status = 'active';

  select count(*)::integer into v_usage
  from public.restaurant_menus
  where restaurant_id = v_restaurant_id
    and (
      status = 'published'
      or (status = 'generating' and created_at > now() - interval '15 minutes')
    );
  if not v_paid and v_usage >= 2 then
    raise exception 'Free AI menu allowance exhausted' using errcode = '42501';
  end if;

  v_menu_id := pg_catalog.gen_random_uuid();
  v_slug := encode(extensions.gen_random_bytes(12), 'hex');
  insert into public.restaurant_menus (
    id, restaurant_id, created_by, public_slug, title, status
  ) values (
    v_menu_id, v_restaurant_id, v_user_id, v_slug, trim(p_title), 'generating'
  );

  menu_id := v_menu_id;
  public_slug := v_slug;
  remaining_free_uses := case when v_paid then 0 else greatest(2 - v_usage - 1, 0) end;
  return next;
end;
$$;

revoke execute on function public.reserve_ai_menu(text) from public, anon;
grant execute on function public.reserve_ai_menu(text) to authenticated;
