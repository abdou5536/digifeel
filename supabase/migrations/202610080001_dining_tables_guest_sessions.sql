-- Tables de salle, codes QR de table, et sessions client liées à UNE addition.
-- Une session expire dès que l'addition n'est plus ouverte (paiement, annulation) et ne revit jamais (remboursement).

create table if not exists public.dining_tables (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  label text not null check (length(trim(label)) between 1 and 40),
  code text not null unique check (code ~ '^[a-z2-7]{16}$'),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (restaurant_id, label)
);

alter table public.bills add column if not exists table_id uuid references public.dining_tables(id) on delete set null;
create index if not exists bills_table_open_idx on public.bills(table_id) where status = 'open';

create table if not exists public.guest_sessions (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  bill_id uuid not null references public.bills(id) on delete cascade,
  token_hash text not null unique check (token_hash ~ '^[a-f0-9]{64}$'),
  expires_at timestamptz not null,
  closed_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists guest_sessions_bill_idx on public.guest_sessions(bill_id);

alter table public.dining_tables enable row level security;
alter table public.guest_sessions enable row level security;
revoke all on public.dining_tables, public.guest_sessions from anon, authenticated;
grant select on public.dining_tables to authenticated;
-- guest_sessions : aucune lecture directe (le jeton ne circule que par les fonctions ci-dessous).

create policy "Team reads own tables" on public.dining_tables for select to authenticated
  using (public.is_super_admin() or (public.current_app_role() in ('restaurant_admin', 'server', 'kitchen')
    and restaurant_id = public.current_restaurant_id()));

create or replace function public.create_dining_table(p_label text)
returns text language plpgsql security definer set search_path = '' as $$
declare
  v_restaurant uuid := public.require_team(array['restaurant_admin']);
  v_alphabet text := 'abcdefghijklmnopqrstuvwxyz234567'; v_code text := ''; v_bytes bytea := extensions.gen_random_bytes(16); i int;
begin
  for i in 0..15 loop v_code := v_code || substr(v_alphabet, (get_byte(v_bytes, i) % 32) + 1, 1); end loop;
  insert into public.dining_tables (restaurant_id, label, code) values (v_restaurant, trim(p_label), v_code);
  perform public.write_audit(v_restaurant, 'table_created', 'dining_table', v_code, null, jsonb_build_object('label', p_label));
  return v_code;
end;
$$;

create or replace function public.set_dining_table_active(p_table uuid, p_active boolean)
returns void language plpgsql security definer set search_path = '' as $$
declare v_restaurant uuid := public.require_team(array['restaurant_admin']);
begin
  update public.dining_tables set active = p_active where id = p_table and restaurant_id = v_restaurant;
  if not found then raise exception 'Table not found' using errcode = '42501'; end if;
end;
$$;

-- Le personnel ouvre l'addition d'une table ; le client ne peut pas en créer.
create or replace function public.open_table_bill(p_table uuid)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_restaurant uuid := public.require_team(array['restaurant_admin', 'server']); v_table public.dining_tables; v_id uuid;
begin
  select * into v_table from public.dining_tables where id = p_table and restaurant_id = v_restaurant and active;
  if not found then raise exception 'Table not found' using errcode = '42501'; end if;
  select id into v_id from public.bills where table_id = p_table and status = 'open';
  if found then return v_id; end if;
  insert into public.bills (restaurant_id, table_label, table_id, created_by)
  values (v_restaurant, v_table.label, v_table.id, (select auth.uid())) returning id into v_id;
  return v_id;
end;
$$;

-- Scan du QR de table : retourne un jeton aléatoire (stocké haché), lié à l'addition ouverte.
create or replace function public.open_guest_session(p_code text)
returns text language plpgsql security definer set search_path = '' as $$
declare v_table public.dining_tables; v_bill public.bills; v_token text;
begin
  select * into v_table from public.dining_tables where code = lower(coalesce(p_code, '')) and active;
  if not found then raise exception 'Unknown table' using errcode = '22023'; end if;
  select * into v_bill from public.bills where table_id = v_table.id and status = 'open';
  if not found then raise exception 'No open bill' using errcode = '22023'; end if;
  v_token := encode(extensions.gen_random_bytes(32), 'hex');
  insert into public.guest_sessions (restaurant_id, bill_id, token_hash, expires_at)
  values (v_bill.restaurant_id, v_bill.id, encode(extensions.digest(v_token, 'sha256'), 'hex'), now() + interval '4 hours');
  return v_token;
end;
$$;

create or replace function public.guest_get_bill(p_token text)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare v_s public.guest_sessions; v_bill public.bills;
begin
  select * into v_s from public.guest_sessions
    where token_hash = encode(extensions.digest(coalesce(p_token, ''), 'sha256'), 'hex') and closed_at is null and expires_at > now();
  if not found then raise exception 'Invalid session' using errcode = '42501'; end if;
  select * into v_bill from public.bills where id = v_s.bill_id and status = 'open';
  if not found then raise exception 'Invalid session' using errcode = '42501'; end if;
  return jsonb_build_object(
    'table', v_bill.table_label,
    'discount_dzd', v_bill.discount_dzd,
    'total_dzd', public.bill_net_total(v_bill.id),
    'paid_dzd', public.bill_paid_total(v_bill.id),
    'items', coalesce((select jsonb_agg(jsonb_build_object('name', product_name, 'quantity', quantity,
      'unit_price_dzd', unit_price_dzd, 'line_total_dzd', line_total_dzd) order by created_at)
      from public.bill_items where bill_id = v_bill.id), '[]'::jsonb));
end;
$$;

create or replace function public.close_guest_sessions()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if old.status = 'open' and new.status <> 'open' then
    update public.guest_sessions set closed_at = now() where bill_id = new.id and closed_at is null;
  end if;
  return new;
end;
$$;
drop trigger if exists bills_close_guest_sessions on public.bills;
create trigger bills_close_guest_sessions after update of status on public.bills
  for each row execute procedure public.close_guest_sessions();

revoke execute on function public.create_dining_table(text), public.set_dining_table_active(uuid, boolean),
  public.open_table_bill(uuid), public.close_guest_sessions() from public, anon;
grant execute on function public.create_dining_table(text), public.set_dining_table_active(uuid, boolean),
  public.open_table_bill(uuid) to authenticated;
revoke execute on function public.open_guest_session(text), public.guest_get_bill(text) from public;
grant execute on function public.open_guest_session(text), public.guest_get_bill(text) to anon, authenticated;