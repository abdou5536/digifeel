alter table public.restaurants
  add column if not exists currency text not null default 'DZD' check (currency in ('EUR', 'DZD'));

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
