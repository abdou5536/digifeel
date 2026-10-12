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

create or replace function public.guest_get_bill(p_token text)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare v_s public.guest_sessions; v_bill public.bills; v_restaurant public.restaurants;
begin
  select * into v_s from public.guest_sessions
    where token_hash = encode(extensions.digest(coalesce(p_token, ''), 'sha256'), 'hex')
      and closed_at is null and expires_at > now();
  if not found then raise exception 'Invalid session' using errcode = '42501'; end if;

  select * into v_bill from public.bills where id = v_s.bill_id and status in ('open', 'paid');
  if not found then raise exception 'Invalid session' using errcode = '42501'; end if;
  select * into v_restaurant from public.restaurants where id = v_bill.restaurant_id;

  return jsonb_build_object(
    'table', v_bill.table_label,
    'restaurant_name', v_restaurant.name,
    'currency', v_restaurant.currency,
    'baridimob_rip', v_restaurant.baridimob_rip,
    'baridimob_phone', v_restaurant.baridimob_phone,
    'discount_dzd', v_bill.discount_dzd,
    'total_dzd', public.bill_net_total(v_bill.id),
    'paid_dzd', public.bill_paid_total(v_bill.id),
    'pending_dzd', coalesce((select sum(amount_dzd) from public.payments
      where bill_id = v_bill.id and status = 'pending'), 0),
    'items', coalesce((select jsonb_agg(jsonb_build_object('name', product_name, 'quantity', quantity,
      'unit_price_dzd', unit_price_dzd, 'line_total_dzd', line_total_dzd) order by created_at)
      from public.bill_items where bill_id = v_bill.id), '[]'::jsonb));
end;
$$;