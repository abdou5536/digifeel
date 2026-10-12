-- Commandes des serveurs (tablettes) envoyées au comptoir : le poste de caisse les récupère et les imprime.
-- Retour arrière : supabase/rollback/202610230001_counter_tickets.down.sql

alter table public.bill_items
  add column if not exists sent_at timestamptz,
  add column if not exists printed_at timestamptz;

-- Les lignes existantes sont considérées comme déjà traitées : rien ne s'imprime au déploiement.
update public.bill_items
set sent_at = created_at, printed_at = created_at
where sent_at is null;

create index if not exists bill_items_counter_idx
  on public.bill_items(restaurant_id, sent_at)
  where sent_at is not null and printed_at is null;

create or replace function public.send_bill_to_counter(p_bill uuid)
returns integer language plpgsql security definer set search_path = '' as $$
declare v_restaurant uuid := public.require_team(array['restaurant_admin', 'server']); v_count integer;
begin
  perform 1 from public.bills where id = p_bill and restaurant_id = v_restaurant and status = 'open' for update;
  if not found then raise exception 'Bill not found or closed' using errcode = '42501'; end if;
  update public.bill_items set sent_at = now()
  where bill_id = p_bill and restaurant_id = v_restaurant and sent_at is null;
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

-- Réservé au poste de caisse (admin). Marque les lignes comme imprimées pour qu'un seul poste les imprime.
create or replace function public.claim_counter_tickets()
returns table (bill_id uuid, table_label text, product_name text, quantity integer, sent_at timestamptz)
language plpgsql security definer set search_path = '' as $$
declare v_restaurant uuid := public.require_team(array['restaurant_admin']);
begin
  return query
  with claimed as (
    update public.bill_items i set printed_at = now()
    where i.restaurant_id = v_restaurant and i.sent_at is not null and i.printed_at is null
    returning i.bill_id, i.product_name, i.quantity, i.sent_at
  )
  select c.bill_id, b.table_label, c.product_name, c.quantity, c.sent_at
  from claimed c
  join public.bills b on b.id = c.bill_id
  order by c.sent_at, b.table_label;
end;
$$;

revoke execute on function public.send_bill_to_counter(uuid) from public, anon;
revoke execute on function public.claim_counter_tickets() from public, anon;
grant execute on function public.send_bill_to_counter(uuid) to authenticated;
grant execute on function public.claim_counter_tickets() to authenticated;
