
alter table public.restaurants
  add column if not exists baridimob_rip text check (length(baridimob_rip) <= 34),
  add column if not exists baridimob_phone text check (length(baridimob_phone) <= 32);

create or replace function public.open_guest_session(p_code text)
returns text language plpgsql security definer set search_path = '' as $$
declare v_table public.dining_tables; v_bill public.bills; v_token text;
begin
  select * into v_table from public.dining_tables where code = lower(coalesce(p_code, '')) and active;
  if not found then raise exception 'Unknown table' using errcode = '22023'; end if;
  select * into v_bill from public.bills where table_id = v_table.id and status = 'open';
  if not found then
    select * into v_bill from public.bills
    where table_id = v_table.id and status = 'paid' and closed_at > now() - interval '4 hours'
      and exists (
        select 1 from public.payments
        where bill_id = public.bills.id and method in ('baridimob', 'stripe') and status = 'succeeded'
      )
    order by closed_at desc limit 1;
  end if;
  if not found then raise exception 'No open bill' using errcode = '22023'; end if;
  v_token := encode(extensions.gen_random_bytes(32), 'hex');
  insert into public.guest_sessions (restaurant_id, bill_id, token_hash, expires_at)
  values (v_bill.restaurant_id, v_bill.id, encode(extensions.digest(v_token, 'sha256'), 'hex'), now() + interval '4 hours');
  return v_token;
end;
$$;

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

create or replace function public.request_guest_payment(
  p_token text, p_amount bigint, p_tip bigint, p_method text, p_key text
) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  v_session public.guest_sessions;
  v_bill public.bills;
  v_payment public.payments;
  v_pending bigint;
  v_remaining bigint;
  v_payment_id uuid;
begin
  select * into v_session
  from public.guest_sessions
  where token_hash = encode(extensions.digest(coalesce(p_token, ''), 'sha256'), 'hex')
    and closed_at is null and expires_at > now();
  if not found then raise exception 'Invalid guest session' using errcode = '42501'; end if;

  if p_method is null or p_method not in ('cash', 'baridimob', 'stripe')
     or p_amount is null or p_amount <= 0
     or p_tip is null or p_tip < 0
     or length(coalesce(p_key, '')) not between 8 and 120 then
    raise exception 'Invalid payment request' using errcode = '22023';
  end if;

  select * into v_bill
  from public.bills
  where id = v_session.bill_id and restaurant_id = v_session.restaurant_id
    and status in ('open', 'paid')
  for update;
  if not found then raise exception 'Bill not found or closed' using errcode = '42501'; end if;

  select * into v_payment
  from public.payments
  where restaurant_id = v_session.restaurant_id and idempotency_key = p_key;
  if found then
    if v_payment.bill_id <> v_bill.id or v_payment.amount_dzd <> p_amount
       or v_payment.tip_dzd <> p_tip or v_payment.method <> p_method then
      raise exception 'Idempotency key reused with different data' using errcode = '22023';
    end if;
    return v_payment.id;
  end if;
  if v_bill.status <> 'open' then
    raise exception 'Bill not found or closed' using errcode = '42501';
  end if;
  if p_method = 'baridimob' and not exists (
    select 1 from public.restaurants
    where id = v_bill.restaurant_id
      and (coalesce(baridimob_rip, '') <> '' or coalesce(baridimob_phone, '') <> '')
  ) then
    raise exception 'BaridiMob is not configured for this restaurant' using errcode = '22023';
  end if;

  select coalesce(sum(amount_dzd), 0) into v_pending
  from public.payments
  where bill_id = v_bill.id and status = 'pending';
  v_remaining := public.bill_net_total(v_bill.id) - public.bill_paid_total(v_bill.id) - v_pending;
  if p_amount > v_remaining or p_tip > public.bill_net_total(v_bill.id) then
    raise exception 'Invalid amount' using errcode = '22023';
  end if;

  insert into public.payments (
    bill_id, restaurant_id, amount_dzd, tip_dzd, method, status, idempotency_key
  ) values (
    v_bill.id, v_bill.restaurant_id, p_amount, p_tip, p_method, 'pending', p_key
  ) returning id into v_payment_id;

  perform public.write_audit(
    v_bill.restaurant_id, 'guest_payment_requested', 'payment', v_payment_id::text,
    p_amount, jsonb_build_object('method', p_method, 'tip', p_tip, 'bill', v_bill.id)
  );
  return v_payment_id;
end;
$$;

create or replace function public.cancel_guest_stripe_payment(p_token text, p_payment uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare v_session public.guest_sessions; v_payment public.payments;
begin
  select * into v_session
  from public.guest_sessions
  where token_hash = encode(extensions.digest(coalesce(p_token, ''), 'sha256'), 'hex')
    and closed_at is null and expires_at > now();
  if not found then raise exception 'Invalid guest session' using errcode = '42501'; end if;

  select * into v_payment
  from public.payments
  where id = p_payment and bill_id = v_session.bill_id
    and restaurant_id = v_session.restaurant_id and method = 'stripe' and status = 'pending'
  for update;
  if not found then raise exception 'No pending Stripe payment' using errcode = '22023'; end if;

  update public.payments set status = 'cancelled' where id = v_payment.id;
  perform public.write_audit(v_session.restaurant_id, 'guest_payment_cancelled', 'payment',
    v_payment.id::text, v_payment.amount_dzd, jsonb_build_object('method', 'stripe', 'bill', v_payment.bill_id));
end;
$$;

revoke execute on function public.cancel_guest_stripe_payment(text, uuid) from public;
grant execute on function public.cancel_guest_stripe_payment(text, uuid) to anon, authenticated;