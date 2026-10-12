-- Caisse : numerotation continue des tickets, journal horodate chaine par hash (infalsifiable),
-- ecritures inverses pour les annulations et cloture de caisse journaliere (Z).
-- Retour arriere : supabase/rollback/202610170001_pos_fiscal_journal.down.sql

create table if not exists public.pos_restaurant_counters (
  restaurant_id uuid primary key references public.restaurants(id) on delete cascade,
  last_ticket bigint not null default 0,
  last_seq bigint not null default 0,
  last_hash text not null default ''
);
alter table public.pos_restaurant_counters enable row level security;
revoke all on public.pos_restaurant_counters from anon, authenticated;

create table if not exists public.pos_journal (
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  seq bigint not null,
  entry_type text not null check (entry_type in ('sale', 'reversal', 'z_close')),
  sale_id uuid,
  ticket_number bigint,
  amount_dzd bigint not null default 0,
  payment_method text check (payment_method in ('cash', 'card', 'baridimob')),
  actor_user_id uuid,
  payload jsonb,
  created_at timestamptz not null,
  prev_hash text not null,
  entry_hash text not null,
  primary key (restaurant_id, seq)
);
create index if not exists pos_journal_sale_idx on public.pos_journal(sale_id);
alter table public.pos_journal enable row level security;

create table if not exists public.pos_z_reports (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  number integer not null,
  from_seq bigint not null,
  through_seq bigint not null,
  sales_count integer not null,
  reversals_count integer not null,
  totals_by_method jsonb not null,
  net_total_dzd bigint not null,
  closed_by uuid,
  closed_at timestamptz not null default now(),
  unique (restaurant_id, number)
);
alter table public.pos_z_reports enable row level security;

create policy "Restaurant team reads POS journal"
  on public.pos_journal for select to authenticated
  using (public.can_access_restaurant(restaurant_id));
create policy "Restaurant team reads Z reports"
  on public.pos_z_reports for select to authenticated
  using (public.can_access_restaurant(restaurant_id));

grant select on public.pos_journal, public.pos_z_reports to authenticated;
revoke insert, update, delete on public.pos_journal, public.pos_z_reports from anon, authenticated;

alter table public.pos_sales add column if not exists ticket_number bigint;

-- Ajoute une ligne au journal en la chainant a la precedente (appel interne uniquement).
create or replace function public.pos_journal_append(
  p_restaurant_id uuid,
  p_type text,
  p_sale_id uuid,
  p_ticket bigint,
  p_amount bigint,
  p_method text,
  p_actor uuid,
  p_at timestamptz,
  p_payload jsonb default null
)
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_seq bigint;
  v_prev text;
  v_hash text;
begin
  insert into public.pos_restaurant_counters (restaurant_id) values (p_restaurant_id)
  on conflict (restaurant_id) do nothing;

  select last_seq + 1, last_hash into v_seq, v_prev
  from public.pos_restaurant_counters
  where restaurant_id = p_restaurant_id
  for update;

  v_hash := encode(extensions.digest(
    concat_ws('|', p_restaurant_id, v_seq, p_type, coalesce(p_sale_id::text, ''),
      coalesce(p_ticket::text, ''), p_amount, coalesce(p_method, ''),
      coalesce(p_actor::text, ''), coalesce(p_payload::text, ''),
      to_char(p_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US'), v_prev),
    'sha256'), 'hex');

  insert into public.pos_journal
    (restaurant_id, seq, entry_type, sale_id, ticket_number, amount_dzd, payment_method,
     actor_user_id, payload, created_at, prev_hash, entry_hash)
  values
    (p_restaurant_id, v_seq, p_type, p_sale_id, p_ticket, p_amount, p_method,
     p_actor, p_payload, p_at, v_prev, v_hash);

  update public.pos_restaurant_counters
  set last_seq = v_seq, last_hash = v_hash
  where restaurant_id = p_restaurant_id;

  return v_seq;
end;
$$;
revoke execute on function public.pos_journal_append(uuid, text, uuid, bigint, bigint, text, uuid, timestamptz, jsonb) from public, anon, authenticated;

create or replace function public.pos_next_ticket(p_restaurant_id uuid)
returns bigint
language sql
security definer
set search_path = ''
as $$
  insert into public.pos_restaurant_counters (restaurant_id, last_ticket)
  values (p_restaurant_id, 1)
  on conflict (restaurant_id) do update set last_ticket = public.pos_restaurant_counters.last_ticket + 1
  returning last_ticket;
$$;
revoke execute on function public.pos_next_ticket(uuid) from public, anon, authenticated;

-- Reprise de l'existant : numerotation et journal des ventes deja enregistrees.
do $$
declare
  r record;
  v_ticket bigint;
begin
  for r in select * from public.pos_sales where ticket_number is null order by restaurant_id, sold_at, created_at, id
  loop
    v_ticket := public.pos_next_ticket(r.restaurant_id);
    update public.pos_sales set ticket_number = v_ticket where id = r.id;
    perform public.pos_journal_append(r.restaurant_id, 'sale', r.id, v_ticket, r.total_dzd,
      r.payment_method, r.cashier_user_id, r.sold_at);
    if r.voided_at is not null then
      perform public.pos_journal_append(r.restaurant_id, 'reversal', r.id, v_ticket, -r.total_dzd,
        r.payment_method, r.voided_by, r.voided_at);
    end if;
  end loop;
end;
$$;

alter table public.pos_sales alter column ticket_number set not null;
create unique index if not exists pos_sales_restaurant_ticket_uidx
  on public.pos_sales(restaurant_id, ticket_number);

create or replace function public.pos_sales_before_insert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  new.ticket_number := public.pos_next_ticket(new.restaurant_id);
  return new;
end;
$$;

create or replace function public.pos_sales_after_insert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.pos_journal_append(new.restaurant_id, 'sale', new.id, new.ticket_number,
    new.total_dzd, new.payment_method, new.cashier_user_id, clock_timestamp());
  return new;
end;
$$;

create trigger pos_sales_assign_ticket before insert on public.pos_sales
  for each row execute function public.pos_sales_before_insert();
create trigger pos_sales_write_journal after insert on public.pos_sales
  for each row execute function public.pos_sales_after_insert();

-- Immutabilite : une vente ne peut ni etre modifiee ni supprimee. Seule l'annotation d'annulation
-- est permise (une fois), l'ecriture inverse etant ajoutee au journal. La suppression d'un
-- restaurant entier (droit a l'effacement) reste possible.
create or replace function public.pos_guard_immutable()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'DELETE' then
    if not exists (select 1 from public.restaurants where id = old.restaurant_id) then
      return old;
    end if;
    raise exception 'POS records cannot be deleted' using errcode = '42501';
  end if;

  if tg_table_name = 'pos_sales'
     and (to_jsonb(new) - 'voided_at' - 'voided_by' - 'void_reason')
       = (to_jsonb(old) - 'voided_at' - 'voided_by' - 'void_reason')
     and (
       (old.voided_at is null and new.voided_at is not null)
       or (old.voided_at is not null and new.voided_at = old.voided_at
           and new.void_reason is not distinct from old.void_reason and new.voided_by is null)
     ) then
    return new;
  end if;
  raise exception 'POS records are append-only' using errcode = '42501';
end;
$$;

create trigger pos_sales_immutable before update or delete on public.pos_sales
  for each row execute function public.pos_guard_immutable();
create trigger pos_sale_items_immutable before update or delete on public.pos_sale_items
  for each row execute function public.pos_guard_immutable();
create trigger pos_journal_immutable before update or delete on public.pos_journal
  for each row execute function public.pos_guard_immutable();
create trigger pos_z_reports_immutable before update or delete on public.pos_z_reports
  for each row execute function public.pos_guard_immutable();

-- Annulation = ecriture inverse dans le journal (la vente d'origine n'est jamais effacee).
create or replace function public.void_pos_sale(
  p_sale_id uuid,
  p_reason text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_role text;
  v_restaurant_id uuid;
  v_sale public.pos_sales%rowtype;
begin
  if v_user_id is null then
    raise exception 'Authentication required' using errcode = '28000';
  end if;
  if length(coalesce(p_reason, '')) > 300 then
    raise exception 'Void reason is too long' using errcode = '22023';
  end if;

  select role, restaurant_id into v_role, v_restaurant_id
  from public.app_users
  where id = v_user_id;

  if v_role <> 'restaurant_admin' or v_restaurant_id is null then
    raise exception 'Only a restaurant manager can void a sale' using errcode = '42501';
  end if;

  select * into v_sale from public.pos_sales where id = p_sale_id for update;
  if not found or v_sale.restaurant_id <> v_restaurant_id then
    raise exception 'Sale not found' using errcode = 'P0002';
  end if;
  if v_sale.voided_at is not null then
    raise exception 'Sale is already voided' using errcode = '23505';
  end if;
  if exists (
    select 1 from public.pos_z_reports z
    where z.restaurant_id = v_restaurant_id
      and z.through_seq >= (
        select j.seq from public.pos_journal j
        where j.restaurant_id = v_restaurant_id and j.sale_id = p_sale_id and j.entry_type = 'sale'
      )
  ) then
    raise exception 'Sale belongs to a closed day' using errcode = '23514';
  end if;

  update public.pos_sales
  set voided_at = now(), voided_by = v_user_id, void_reason = nullif(trim(coalesce(p_reason, '')), '')
  where id = p_sale_id;

  perform public.pos_journal_append(v_restaurant_id, 'reversal', p_sale_id, v_sale.ticket_number,
    -v_sale.total_dzd, v_sale.payment_method, v_user_id, clock_timestamp(),
    jsonb_build_object('reason', nullif(trim(coalesce(p_reason, '')), '')));
end;
$$;

revoke execute on function public.void_pos_sale(uuid, text) from public, anon;
grant execute on function public.void_pos_sale(uuid, text) to authenticated;

-- Cloture de caisse (Z) : totaux nets par moyen de paiement depuis la derniere cloture.
create or replace function public.close_pos_day()
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_role text;
  v_restaurant_id uuid;
  v_from bigint;
  v_through bigint;
  v_sales integer;
  v_reversals integer;
  v_totals jsonb;
  v_net bigint;
  v_number integer;
  v_id uuid;
begin
  if v_user_id is null then
    raise exception 'Authentication required' using errcode = '28000';
  end if;
  select role, restaurant_id into v_role, v_restaurant_id
  from public.app_users where id = v_user_id;
  if v_role <> 'restaurant_admin' or v_restaurant_id is null then
    raise exception 'Only a restaurant manager can close the register' using errcode = '42501';
  end if;

  insert into public.pos_restaurant_counters (restaurant_id) values (v_restaurant_id)
  on conflict (restaurant_id) do nothing;
  perform 1 from public.pos_restaurant_counters where restaurant_id = v_restaurant_id for update;

  select coalesce(max(through_seq), 0), coalesce(max(number), 0) + 1
  into v_from, v_number
  from public.pos_z_reports where restaurant_id = v_restaurant_id;

  select coalesce(max(seq), 0),
         count(*) filter (where entry_type = 'sale'),
         count(*) filter (where entry_type = 'reversal'),
         coalesce(sum(amount_dzd), 0)
  into v_through, v_sales, v_reversals, v_net
  from public.pos_journal
  where restaurant_id = v_restaurant_id and seq > v_from and entry_type in ('sale', 'reversal');

  if v_sales + v_reversals = 0 then
    raise exception 'Nothing to close' using errcode = 'P0002';
  end if;

  select coalesce(jsonb_object_agg(payment_method, total), '{}'::jsonb) into v_totals
  from (
    select payment_method, sum(amount_dzd) as total
    from public.pos_journal
    where restaurant_id = v_restaurant_id and seq > v_from and entry_type in ('sale', 'reversal')
    group by payment_method
  ) t;

  insert into public.pos_z_reports
    (restaurant_id, number, from_seq, through_seq, sales_count, reversals_count,
     totals_by_method, net_total_dzd, closed_by)
  values
    (v_restaurant_id, v_number, v_from + 1, v_through, v_sales, v_reversals, v_totals, v_net, v_user_id)
  returning id into v_id;

  perform public.pos_journal_append(v_restaurant_id, 'z_close', null, null, v_net, null, v_user_id,
    clock_timestamp(), jsonb_build_object('z_number', v_number, 'through_seq', v_through, 'totals', v_totals));

  return v_id;
end;
$$;
revoke execute on function public.close_pos_day() from public, anon;
grant execute on function public.close_pos_day() to authenticated;

-- Controle d'integrite : renvoie le premier numero de sequence dont la chaine est rompue (null = intact).
create or replace function public.verify_pos_journal()
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_restaurant_id uuid;
  v_prev text := '';
  v_expected_seq bigint := 1;
  r public.pos_journal%rowtype;
begin
  select restaurant_id into v_restaurant_id from public.app_users
  where id = v_user_id and role in ('restaurant_admin', 'super_admin');
  if v_restaurant_id is null then
    raise exception 'Access denied' using errcode = '42501';
  end if;

  for r in select * from public.pos_journal where restaurant_id = v_restaurant_id order by seq
  loop
    if r.seq <> v_expected_seq or r.prev_hash <> v_prev or r.entry_hash <> encode(extensions.digest(
      concat_ws('|', r.restaurant_id, r.seq, r.entry_type, coalesce(r.sale_id::text, ''),
        coalesce(r.ticket_number::text, ''), r.amount_dzd, coalesce(r.payment_method, ''),
        coalesce(r.actor_user_id::text, ''), coalesce(r.payload::text, ''),
        to_char(r.created_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US'), r.prev_hash),
      'sha256'), 'hex') then
      return r.seq;
    end if;
    v_prev := r.entry_hash;
    v_expected_seq := v_expected_seq + 1;
  end loop;
  return null;
end;
$$;
revoke execute on function public.verify_pos_journal() from public, anon;
grant execute on function public.verify_pos_journal() to authenticated;
