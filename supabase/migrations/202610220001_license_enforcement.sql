-- Licences : un restaurant dont l'abonnement est expire ne peut plus encaisser.
-- Le premier mois offert est la periode d'essai (30 jours) creee avec le restaurant.
-- Une vente faite hors ligne avant l'expiration reste synchronisable pendant 7 jours.
-- Retour arriere : supabase/rollback/202610220001_license_enforcement.down.sql

create or replace function public.license_valid_until(p_restaurant uuid)
returns timestamptz
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce((
    select case s.status
      when 'active' then 'infinity'::timestamptz
      when 'trialing' then s.trial_ends_at
      when 'past_due' then coalesce(s.current_period_ends_at, now()) + interval '7 days'
      else coalesce(s.current_period_ends_at, '-infinity'::timestamptz)
    end
    from public.subscriptions s where s.restaurant_id = p_restaurant
  ), 'infinity'::timestamptz);
$$;

revoke execute on function public.license_valid_until(uuid) from public, anon, authenticated;

create or replace function public.enforce_license()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_until timestamptz := public.license_valid_until(new.restaurant_id);
  v_at timestamptz := now();
begin
  if tg_table_name = 'pos_sales' then
    if new.sync_source = 'offline' then
      v_at := greatest(new.sold_at, now() - interval '7 days');
    end if;
  end if;
  if v_at > v_until then
    raise exception 'License expired' using errcode = 'DF402';
  end if;
  return new;
end;
$$;

create trigger pos_sales_enforce_license before insert on public.pos_sales
  for each row execute function public.enforce_license();
create trigger payments_enforce_license before insert on public.payments
  for each row execute function public.enforce_license();
