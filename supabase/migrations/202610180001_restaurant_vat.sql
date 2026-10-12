-- Taux de TVA du restaurant en points de base (1000 = 10 %). 0 = pas de TVA affichée.
alter table public.restaurants
  add column if not exists vat_rate_bp integer not null default 0
  check (vat_rate_bp between 0 and 3000);

grant update (vat_rate_bp) on public.restaurants to authenticated;
