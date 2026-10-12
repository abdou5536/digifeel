-- Actions publiques sur une addition de table : paiement manuel en attente et avis.
-- Le paiement n'est jamais déclaré réussi par le navigateur ; un membre d'équipe le confirme.

alter table public.reviews
  alter column chip_id drop not null,
  add column bill_id uuid references public.bills(id) on delete set null,
  add column guest_session_id uuid references public.guest_sessions(id) on delete set null;

create unique index reviews_guest_session_unique
  on public.reviews(guest_session_id)
  where guest_session_id is not null;

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
     or p_amount is null or p_amount <= 0
     or p_tip is null or p_tip < 0
     or length(coalesce(p_key, '')) not between 8 and 120 then
    raise exception 'Invalid payment request' using errcode = '22023';
  end if;

  select * into v_bill
  from public.bills
  where id = v_session.bill_id and restaurant_id = v_session.restaurant_id
    and status = 'open'
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

create or replace function public.confirm_guest_payment(p_payment uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_restaurant uuid := public.require_team(array['restaurant_admin', 'server']);
  v_pay public.payments;
begin
  select * into v_pay
  from public.payments
  where id = p_payment and restaurant_id = v_restaurant
    and method in ('cash', 'baridimob') and status = 'pending'
  for update;
  if not found then raise exception 'No pending manual payment' using errcode = '22023'; end if;

  update public.payments
  set status = 'succeeded', validated_by = auth.uid(), validated_at = now()
  where id = v_pay.id;
  perform public.write_audit(v_restaurant, 'guest_payment_confirmed', 'payment', v_pay.id::text,
    v_pay.amount_dzd, jsonb_build_object('method', v_pay.method, 'bill', v_pay.bill_id));

  if public.bill_paid_total(v_pay.bill_id) >= public.bill_net_total(v_pay.bill_id) then
    update public.bills set status = 'paid', closed_at = now()
    where id = v_pay.bill_id and restaurant_id = v_restaurant and status = 'open';
  end if;
end;
$$;

create or replace function public.submit_guest_review(
  p_token text, p_stars integer, p_comment text, p_device_hash text, p_server_id uuid default null
) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_session public.guest_sessions;
  v_bill public.bills;
  v_google_url text;
  v_review_id uuid;
begin
  if p_stars is null or p_stars not between 1 and 5 or length(coalesce(p_comment, '')) > 2000 then
    raise exception 'Invalid review' using errcode = '22023';
  end if;
  if p_device_hash is null or p_device_hash !~ '^[a-f0-9]{64}$'
     or not public.consume_rate_limit(p_device_hash, 'review', 6, 3600) then
    raise exception 'Too many review submissions. Please try again later.' using errcode = '54000';
  end if;

  select * into v_session
  from public.guest_sessions
  where token_hash = encode(extensions.digest(coalesce(p_token, ''), 'sha256'), 'hex')
    and expires_at > now();
  if not found then raise exception 'Invalid guest session' using errcode = '42501'; end if;

  select * into v_bill
  from public.bills
  where id = v_session.bill_id and restaurant_id = v_session.restaurant_id
    and status in ('open', 'paid');
  if not found then raise exception 'Bill not found' using errcode = '42501'; end if;

  if exists (select 1 from public.reviews where guest_session_id = v_session.id) then
    raise exception 'Review already submitted' using errcode = '23505';
  end if;

  if p_server_id is not null and not exists (
    select 1 from public.servers
    where id = p_server_id and restaurant_id = v_bill.restaurant_id and active
  ) then
    raise exception 'Selected server is unavailable' using errcode = '22023';
  end if;

  select google_review_url into v_google_url
  from public.restaurants where id = v_bill.restaurant_id;

  insert into public.reviews (
    restaurant_id, chip_id, bill_id, guest_session_id, server_id, stars, comment, device_hash
  ) values (
    v_bill.restaurant_id, null, v_bill.id, v_session.id, p_server_id,
    p_stars, trim(coalesce(p_comment, '')), p_device_hash
  ) returning id into v_review_id;

  return jsonb_build_object('review_id', v_review_id, 'google_review_url', v_google_url);
end;
$$;

revoke execute on function public.request_guest_payment(text, bigint, bigint, text, text),
  public.confirm_guest_payment(uuid), public.submit_guest_review(text, integer, text, text, uuid)
  from public;
grant execute on function public.request_guest_payment(text, bigint, bigint, text, text),
  public.submit_guest_review(text, integer, text, text, uuid) to anon, authenticated;
grant execute on function public.confirm_guest_payment(uuid) to authenticated;
