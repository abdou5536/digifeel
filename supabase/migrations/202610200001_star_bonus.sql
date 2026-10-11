create table if not exists public.star_ratings (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  kind text not null check (kind in ('baseline', 'snapshot')),
  rating numeric(2, 1) not null check (rating between 0 and 5),
  review_count integer check (review_count is null or review_count >= 0),
  observed_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);
create index if not exists star_ratings_restaurant_idx on public.star_ratings(restaurant_id, kind, observed_at desc);
alter table public.star_ratings enable row level security;

create table if not exists public.star_billed_tiers (
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  tier_id text not null,
  period text not null check (period ~ '^\d{4}-(0[1-9]|1[0-2])$'),
  amount_cents integer not null check (amount_cents > 0),
  billed_at timestamptz not null default now(),
  primary key (restaurant_id, tier_id)
);
alter table public.star_billed_tiers enable row level security;

create policy "Restaurant team reads star ratings"
  on public.star_ratings for select to authenticated
  using (public.can_access_restaurant(restaurant_id));
create policy "Restaurant team reads billed tiers"
  on public.star_billed_tiers for select to authenticated
  using (public.can_access_restaurant(restaurant_id));

grant select on public.star_ratings, public.star_billed_tiers to authenticated;
revoke insert, update, delete on public.star_ratings, public.star_billed_tiers from anon, authenticated;
revoke all on public.star_ratings, public.star_billed_tiers from anon;
