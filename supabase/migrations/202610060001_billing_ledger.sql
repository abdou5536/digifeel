-- Additions, paiements (grand livre), journal d'activité. Retour arrière : supabase/rollback/202610060001_billing_ledger.down.sql
-- Principe : les clients (navigateur) n'écrivent JAMAIS directement ; tout passe par des fonctions
-- security definer qui recalculent les montants côté base. Aucune commission n'est calculée ici.

create table if not exists public.bills (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  table_label text not null check (length(trim(table_label)) between 1 and 40),
  status text not null default 'open' check (status in ('open', 'paid', 'void')),
  discount_dzd bigint not null default 0 check (discount_dzd >= 0),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  closed_at timestamptz,
  unique (id, restaurant_id)
);

create table if not exists public.bill_items (
  id uuid primary key default gen_random_uuid(),
  bill_id uuid not null,
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  product_id uuid not null,
  product_name text not null,
  quantity integer not null check (quantity between 1 and 100),
  unit_price_dzd integer not null check (unit_price_dzd >= 0),
  line_total_dzd bigint generated always as (quantity::bigint * unit_price_dzd::bigint) stored,
  created_at timestamptz not null default now(),
  foreign key (bill_id, restaurant_id) references public.bills(id, restaurant_id) on delete cascade,
  foreign key (product_id, restaurant_id) references public.pos_products(id, restaurant_id) on delete restrict
);

create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  bill_id uuid not null,
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  amount_dzd bigint not null check (amount_dzd > 0),
  tip_dzd bigint not null default 0 check (tip_dzd >= 0),
  method text not null check (method in ('cash', 'card', 'baridimob', 'stripe')),
  status text not null default 'pending'
    check (status in ('pending', 'succeeded', 'failed', 'cancelled', 'refunded')),
  idempotency_key text not null check (length(idempotency_key) between 8 and 120),
  provider_ref text unique,
  validated_by uuid references auth.users(id) on delete set null,
  validated_at timestamptz,
  refunded_by uuid references auth.users(id) on delete set null,
  refund_reason text check (length(refund_reason) <= 300),
  created_at timestamptz not null default now(),
  foreign key (bill_id, restaurant_id) references public.bills(id, restaurant_id) on delete cascade,
  unique (restaurant_id, idempotency_key)
);

create table if not exists public.payment_events (
  event_id text primary key,
  payment_id uuid references public.payments(id) on delete set null,
  outcome text not null,
  received_at timestamptz not null default now()
);

create table if not exists public.audit_log (
  id bigint generated always as identity primary key,
  restaurant_id uuid references public.restaurants(id) on delete set null,
  actor_id uuid,
  action text not null,
  entity text not null,
  entity_id text,
  amount_dzd bigint,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists bills_restaurant_status_idx on public.bills(restaurant_id, status, created_at desc);
create index if not exists bill_items_bill_idx on public.bill_items(bill_id);
create index if not exists payments_bill_idx on public.payments(bill_id);
create index if not exists payments_restaurant_created_idx on public.payments(restaurant_id, created_at desc);
create index if not exists audit_log_restaurant_created_idx on public.audit_log(restaurant_id, created_at desc);

alter table public.bills enable row level security;
alter table public.bill_items enable row level security;
alter table public.payments enable row level security;
alter table public.payment_events enable row level security;
alter table public.audit_log enable row level security;

revoke all on public.bills, public.bill_items, public.payments, public.payment_events, public.audit_log from anon, authenticated;
grant select on public.bills, public.bill_items, public.payments to authenticated;
grant select on public.audit_log to authenticated;

create policy "Admins and servers read bills" on public.bills for select to authenticated
  using (public.is_super_admin() or (public.current_app_role() in ('restaurant_admin', 'server')
    and restaurant_id = public.current_restaurant_id()));
create policy "Admins and servers read bill items" on public.bill_items for select to authenticated
  using (public.is_super_admin() or (public.current_app_role() in ('restaurant_admin', 'server')
    and restaurant_id = public.current_restaurant_id()));
create policy "Admins and servers read payments" on public.payments for select to authenticated
  using (public.is_super_admin() or (public.current_app_role() in ('restaurant_admin', 'server')
    and restaurant_id = public.current_restaurant_id()));
-- Le journal n'est lisible que par l'administrateur du restaurant (pas par serveur/cuisine).
create policy "Admins read audit log" on public.audit_log for select to authenticated
  using (public.is_super_admin() or (public.current_app_role() = 'restaurant_admin'
    and restaurant_id = public.current_restaurant_id()));

create or replace function public.audit_log_immutable()
returns trigger language plpgsql set search_path = '' as $$
begin
  -- Seule exception : le détachement du restaurant supprimé (ON DELETE SET NULL), le contenu reste intact.
  if tg_op = 'UPDATE' and new.restaurant_id is null and old.restaurant_id is not null
     and (new.id, new.actor_id, new.action, new.entity, new.entity_id, new.amount_dzd, new.details, new.created_at)
       is not distinct from (old.id, old.actor_id, old.action, old.entity, old.entity_id, old.amount_dzd, old.details, old.created_at) then
    return new;
  end if;
  raise exception 'audit_log is append-only' using errcode = '42501';
end;
$$;
drop trigger if exists audit_log_no_update on public.audit_log;
create trigger audit_log_no_update before update or delete on public.audit_log
  for each row execute procedure public.audit_log_immutable();

create or replace function public.write_audit(
  p_restaurant uuid, p_action text, p_entity text, p_entity_id text, p_amount bigint, p_details jsonb
) returns void language sql security definer set search_path = '' as $$
  insert into public.audit_log (restaurant_id, actor_id, action, entity, entity_id, amount_dzd, details)
  values (p_restaurant, (select auth.uid()), p_action, p_entity, p_entity_id, p_amount, coalesce(p_details, '{}'::jsonb));
$$;
revoke execute on function public.write_audit(uuid, text, text, text, bigint, jsonb) from public, anon, authenticated;

-- Journal automatique : changement de prix et de lien Google.
create or replace function public.audit_product_changes()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.price_dzd is distinct from old.price_dzd then
    perform public.write_audit(new.restaurant_id, 'price_changed', 'pos_product', new.id::text, new.price_dzd,
      jsonb_build_object('old', old.price_dzd, 'new', new.price_dzd, 'name', new.name));
  end if;
  return new;
end;
$$;
create or replace function public.audit_restaurant_changes()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.google_review_url is distinct from old.google_review_url then
    perform public.write_audit(new.id, 'google_link_changed', 'restaurant', new.id::text, null,
      jsonb_build_object('old', old.google_review_url, 'new', new.google_review_url));
  end if;
  return new;
end;
$$;
drop trigger if exists pos_products_audit on public.pos_products;
create trigger pos_products_audit after update on public.pos_products
  for each row execute procedure public.audit_product_changes();
drop trigger if exists restaurants_audit on public.restaurants;
create trigger restaurants_audit after update on public.restaurants
  for each row execute procedure public.audit_restaurant_changes();
create or replace function public.bill_net_total(p_bill uuid)
returns bigint language sql stable security definer set search_path = '' as $$
  select greatest(coalesce((select sum(line_total_dzd) from public.bill_items where bill_id = p_bill), 0)
    - (select discount_dzd from public.bills where id = p_bill), 0)
$$;
revoke execute on function public.bill_net_total(uuid) from public, anon, authenticated;

create or replace function public.bill_paid_total(p_bill uuid)
returns bigint language sql stable security definer set search_path = '' as $$
  select coalesce(sum(amount_dzd), 0) from public.payments where bill_id = p_bill and status = 'succeeded'
$$;
revoke execute on function public.bill_paid_total(uuid) from public, anon, authenticated;

create or replace function public.require_team(p_roles text[])
returns uuid language plpgsql stable security definer set search_path = '' as $$
declare v_restaurant uuid := public.current_restaurant_id();
begin
  if (select auth.uid()) is null then raise exception 'Authentication required' using errcode = '28000'; end if;
  if public.current_app_role() is null or not (public.current_app_role() = any (p_roles)) then
    raise exception 'Not allowed' using errcode = '42501';
  end if;
  if v_restaurant is null then raise exception 'No restaurant' using errcode = '42501'; end if;
  return v_restaurant;
end;
$$;
revoke execute on function public.require_team(text[]) from public, anon, authenticated;

create or replace function public.open_bill(p_table text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_restaurant uuid := public.require_team(array['restaurant_admin', 'server']); v_id uuid;
begin
  insert into public.bills (restaurant_id, table_label, created_by)
  values (v_restaurant, p_table, (select auth.uid())) returning id into v_id;
  return v_id;
end;
$$;

create or replace function public.add_bill_item(p_bill uuid, p_product uuid, p_quantity integer)
returns void language plpgsql security definer set search_path = '' as $$
declare v_restaurant uuid := public.require_team(array['restaurant_admin', 'server']); v_product public.pos_products;
begin
  perform 1 from public.bills where id = p_bill and restaurant_id = v_restaurant and status = 'open' for update;
  if not found then raise exception 'Bill not found or closed' using errcode = '42501'; end if;
  select * into v_product from public.pos_products where id = p_product and restaurant_id = v_restaurant and active;
  if not found then raise exception 'Product not found' using errcode = '22023'; end if;
  insert into public.bill_items (bill_id, restaurant_id, product_id, product_name, quantity, unit_price_dzd)
  values (p_bill, v_restaurant, v_product.id, v_product.name, p_quantity, v_product.price_dzd);
end;
$$;

create or replace function public.set_bill_discount(p_bill uuid, p_discount bigint)
returns void language plpgsql security definer set search_path = '' as $$
declare v_restaurant uuid := public.require_team(array['restaurant_admin']); v_sub bigint;
begin
  perform 1 from public.bills where id = p_bill and restaurant_id = v_restaurant and status = 'open' for update;
  if not found then raise exception 'Bill not found or closed' using errcode = '42501'; end if;
  select coalesce(sum(line_total_dzd), 0) into v_sub from public.bill_items where bill_id = p_bill;
  if p_discount < 0 or p_discount > v_sub then raise exception 'Invalid discount' using errcode = '22023'; end if;
  update public.bills set discount_dzd = p_discount where id = p_bill;
  perform public.write_audit(v_restaurant, 'discount_set', 'bill', p_bill::text, p_discount, '{}'::jsonb);
end;
$$;

-- Montant demandé jamais cru : plafonné au reste à payer calculé en base.
create or replace function public.record_payment(
  p_bill uuid, p_amount bigint, p_tip bigint, p_method text, p_key text
) returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_restaurant uuid := public.require_team(array['restaurant_admin', 'server']);
  v_bill public.bills; v_existing public.payments; v_remaining bigint; v_id uuid; v_status text;
begin
  select * into v_existing from public.payments where restaurant_id = v_restaurant and idempotency_key = p_key;
  if found then
    if v_existing.bill_id <> p_bill or v_existing.amount_dzd <> p_amount then
      raise exception 'Idempotency key reused with different data' using errcode = '22023';
    end if;
    return v_existing.id;
  end if;
  select * into v_bill from public.bills where id = p_bill and restaurant_id = v_restaurant for update;
  if not found or v_bill.status <> 'open' then raise exception 'Bill not found or closed' using errcode = '42501'; end if;
  if p_method not in ('cash', 'card', 'baridimob', 'stripe') then raise exception 'Invalid method' using errcode = '22023'; end if;
  v_remaining := public.bill_net_total(p_bill) - public.bill_paid_total(p_bill);
  if p_amount is null or p_amount <= 0 or p_amount > v_remaining then
    raise exception 'Invalid amount (remaining %)', v_remaining using errcode = '22023';
  end if;
  if p_tip is null or p_tip < 0 or p_tip > public.bill_net_total(p_bill) then
    raise exception 'Invalid tip' using errcode = '22023';
  end if;
  -- Espèces / Baridi Pay : validés par la personne en salle. Carte/Stripe : confirmés par webhook.
  v_status := case when p_method in ('cash', 'baridimob') then 'succeeded' else 'pending' end;
  insert into public.payments (bill_id, restaurant_id, amount_dzd, tip_dzd, method, status, idempotency_key, validated_by, validated_at)
  values (p_bill, v_restaurant, p_amount, p_tip, p_method, v_status, p_key,
    case when v_status = 'succeeded' then (select auth.uid()) end,
    case when v_status = 'succeeded' then now() end)
  returning id into v_id;
  perform public.write_audit(v_restaurant, 'payment_' || v_status, 'payment', v_id::text, p_amount,
    jsonb_build_object('method', p_method, 'tip', p_tip, 'bill', p_bill));
  if public.bill_paid_total(p_bill) >= public.bill_net_total(p_bill) then
    update public.bills set status = 'paid', closed_at = now() where id = p_bill;
  end if;
  return v_id;
end;
$$;

create or replace function public.cancel_pending_payment(p_payment uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare v_restaurant uuid := public.require_team(array['restaurant_admin', 'server']);
begin
  update public.payments set status = 'cancelled' where id = p_payment and restaurant_id = v_restaurant and status = 'pending';
  if not found then raise exception 'No pending payment' using errcode = '22023'; end if;
  perform public.write_audit(v_restaurant, 'payment_cancelled', 'payment', p_payment::text, null, '{}'::jsonb);
end;
$$;

create or replace function public.refund_payment(p_payment uuid, p_reason text)
returns void language plpgsql security definer set search_path = '' as $$
declare v_restaurant uuid := public.require_team(array['restaurant_admin']); v_pay public.payments;
begin
  select * into v_pay from public.payments where id = p_payment and restaurant_id = v_restaurant and status = 'succeeded' for update;
  if not found then raise exception 'Payment not refundable' using errcode = '22023'; end if;
  update public.payments set status = 'refunded', refunded_by = (select auth.uid()), refund_reason = left(p_reason, 300) where id = p_payment;
  update public.bills set status = 'open', closed_at = null where id = v_pay.bill_id and status = 'paid';
  perform public.write_audit(v_restaurant, 'payment_refunded', 'payment', p_payment::text, v_pay.amount_dzd,
    jsonb_build_object('reason', left(p_reason, 300)));
end;
$$;

create or replace function public.void_bill(p_bill uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare v_restaurant uuid := public.require_team(array['restaurant_admin']);
begin
  perform 1 from public.bills where id = p_bill and restaurant_id = v_restaurant and status = 'open' for update;
  if not found then raise exception 'Bill not found or closed' using errcode = '42501'; end if;
  if public.bill_paid_total(p_bill) > 0 then raise exception 'Bill has payments' using errcode = '22023'; end if;
  update public.bills set status = 'void', closed_at = now() where id = p_bill;
  update public.payments set status = 'cancelled' where bill_id = p_bill and status = 'pending';
  perform public.write_audit(v_restaurant, 'bill_voided', 'bill', p_bill::text, null, '{}'::jsonb);
end;
$$;

-- Appelée uniquement par l'Edge Function du webhook Stripe (service_role), après vérification de signature.
create or replace function public.settle_provider_payment(p_event_id text, p_payment uuid, p_outcome text)
returns text language plpgsql security definer set search_path = '' as $$
declare v_pay public.payments;
begin
  if p_outcome not in ('succeeded', 'failed') then raise exception 'Invalid outcome' using errcode = '22023'; end if;
  insert into public.payment_events (event_id, payment_id, outcome) values (p_event_id, p_payment, p_outcome)
  on conflict (event_id) do nothing;
  if not found then return 'duplicate'; end if;
  select * into v_pay from public.payments where id = p_payment and status = 'pending' for update;
  if not found then return 'ignored'; end if;
  update public.payments set status = p_outcome, validated_at = now() where id = p_payment;
  insert into public.audit_log (restaurant_id, actor_id, action, entity, entity_id, amount_dzd, details)
  values (v_pay.restaurant_id, null, 'payment_' || p_outcome, 'payment', p_payment::text, v_pay.amount_dzd,
    jsonb_build_object('source', 'webhook', 'event', p_event_id));
  if p_outcome = 'succeeded' and public.bill_paid_total(v_pay.bill_id) >= public.bill_net_total(v_pay.bill_id) then
    update public.bills set status = 'paid', closed_at = now() where id = v_pay.bill_id;
  end if;
  return p_outcome;
end;
$$;

revoke execute on function
  public.open_bill(text), public.add_bill_item(uuid, uuid, integer), public.set_bill_discount(uuid, bigint),
  public.record_payment(uuid, bigint, bigint, text, text), public.cancel_pending_payment(uuid),
  public.refund_payment(uuid, text), public.void_bill(uuid), public.settle_provider_payment(text, uuid, text)
from public, anon, authenticated;
grant execute on function
  public.open_bill(text), public.add_bill_item(uuid, uuid, integer), public.set_bill_discount(uuid, bigint),
  public.record_payment(uuid, bigint, bigint, text, text), public.cancel_pending_payment(uuid),
  public.refund_payment(uuid, text), public.void_bill(uuid)
to authenticated;
grant execute on function public.settle_provider_payment(text, uuid, text) to service_role;
