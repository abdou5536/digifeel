drop function if exists public.cancel_guest_stripe_payment(text, uuid);

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
    where token_hash = encode(extensions.digest(coalesce(p_token, ''), 'sha256'), 'hex')
      and closed_at is null and expires_at > now();
  if not found then raise exception 'Invalid session' using errcode = '42501'; end if;
  select * into v_bill from public.bills where id = v_s.bill_id and status = 'open';
  if not found then raise exception 'Invalid session' using errcode = '42501'; end if;
  return jsonb_build_object(
    'table', v_bill.table_label,
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
  if p_method is null or p_method not in ('cash', 'baridimob')
     or p_amount is null or p_amount <= 0 or p_tip is null or p_tip < 0
     or length(coalesce(p_key, '')) not between 8 and 120 then
    raise exception 'Invalid payment request' using errcode = '22023';
  end if;
  select * into v_bill from public.bills
  where id = v_session.bill_id and restaurant_id = v_session.restaurant_id and status = 'open' for update;
  if not found then raise exception 'Bill not found or closed' using errcode = '42501'; end if;
  select * into v_payment from public.payments
  where restaurant_id = v_session.restaurant_id and idempotency_key = p_key;
  if found then
    if v_payment.bill_id <> v_bill.id or v_payment.amount_dzd <> p_amount
       or v_payment.tip_dzd <> p_tip or v_payment.method <> p_method then
      raise exception 'Idempotency key reused with different data' using errcode = '22023';
    end if;
    return v_payment.id;
  end if;
  select coalesce(sum(amount_dzd), 0) into v_pending from public.payments
  where bill_id = v_bill.id and status = 'pending';
  v_remaining := public.bill_net_total(v_bill.id) - public.bill_paid_total(v_bill.id) - v_pending;
  if p_amount > v_remaining or p_tip > public.bill_net_total(v_bill.id) then
    raise exception 'Invalid amount' using errcode = '22023';
  end if;
  insert into public.payments (bill_id, restaurant_id, amount_dzd, tip_dzd, method, status, idempotency_key)
  values (v_bill.id, v_bill.restaurant_id, p_amount, p_tip, p_method, 'pending', p_key)
  returning id into v_payment_id;
  perform public.write_audit(v_bill.restaurant_id, 'guest_payment_requested', 'payment',
    v_payment_id::text, p_amount, jsonb_build_object('method', p_method, 'tip', p_tip, 'bill', v_bill.id));
  return v_payment_id;
end;
$$;

alter table public.restaurants
  drop column if exists baridimob_phone,
  drop column if exists baridimob_rip;
