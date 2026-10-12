-- Retour arriere du journal de caisse. ATTENTION : supprime le journal, les Z et les numeros de ticket.
drop trigger if exists pos_sales_immutable on public.pos_sales;
drop trigger if exists pos_sale_items_immutable on public.pos_sale_items;
drop trigger if exists pos_sales_assign_ticket on public.pos_sales;
drop trigger if exists pos_sales_write_journal on public.pos_sales;

drop function if exists public.verify_pos_journal();
drop function if exists public.close_pos_day();
drop function if exists public.pos_sales_before_insert();
drop function if exists public.pos_sales_after_insert();
drop function if exists public.pos_next_ticket(uuid);
drop function if exists public.pos_journal_append(uuid, text, uuid, bigint, bigint, text, uuid, timestamptz, jsonb);

drop table if exists public.pos_z_reports;
drop table if exists public.pos_journal;
drop table if exists public.pos_restaurant_counters;
drop function if exists public.pos_guard_immutable();

drop index if exists public.pos_sales_restaurant_ticket_uidx;
alter table public.pos_sales drop column if exists ticket_number;

-- Version precedente de void_pos_sale (202610140001)
create or replace function public.void_pos_sale(p_sale_id uuid, p_reason text default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_role text;
  v_restaurant_id uuid;
  v_sale_restaurant uuid;
  v_already_voided timestamptz;
  v_sold_at timestamptz;
begin
  if v_user_id is null then
    raise exception 'Authentication required' using errcode = '28000';
  end if;
  select role, restaurant_id into v_role, v_restaurant_id from public.app_users where id = v_user_id;
  if v_role <> 'restaurant_admin' or v_restaurant_id is null then
    raise exception 'Only a restaurant manager can void a sale' using errcode = '42501';
  end if;
  select restaurant_id, voided_at, sold_at into v_sale_restaurant, v_already_voided, v_sold_at
  from public.pos_sales where id = p_sale_id for update;
  if not found or v_sale_restaurant <> v_restaurant_id then
    raise exception 'Sale not found' using errcode = 'P0002';
  end if;
  if v_already_voided is not null then
    raise exception 'Sale is already voided' using errcode = '23505';
  end if;
  if (v_sold_at at time zone 'Africa/Algiers')::date <> (now() at time zone 'Africa/Algiers')::date then
    raise exception 'Sale can only be voided on the day it was recorded' using errcode = '23514';
  end if;
  update public.pos_sales
  set voided_at = now(), voided_by = v_user_id, void_reason = nullif(trim(coalesce(p_reason, '')), '')
  where id = p_sale_id;
end;
$$;
