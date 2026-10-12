create or replace function public.confirm_pos_card_payment(p_bill uuid, p_payment uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_restaurant uuid := public.require_team(array['restaurant_admin', 'server']);
  v_pay public.payments;
  v_remaining bigint;
  v_pending bigint;
begin
  perform 1
  from public.bills
  where id = p_bill
    and restaurant_id = v_restaurant
    and status <> 'void'
  for update;
  if not found then raise exception 'Bill not found or void' using errcode = '42501'; end if;

  v_remaining := public.bill_net_total(p_bill) - public.bill_paid_total(p_bill);
  select coalesce(sum(amount_dzd), 0) into v_pending
  from public.payments
  where bill_id = p_bill and status = 'pending';
  v_remaining := v_remaining - v_pending;

  select * into v_pay
  from public.payments
  where id = p_payment
    and bill_id = p_bill
    and restaurant_id = v_restaurant
    and method = 'card'
    and status = 'pending'
  for update;
  if not found then raise exception 'No pending POS card payment' using errcode = '22023'; end if;
  v_remaining := v_remaining + v_pay.amount_dzd;
  if v_pay.amount_dzd > v_remaining then raise exception 'Pending card payment exceeds the remaining bill balance' using errcode = '22023'; end if;

  update public.payments
  set status = 'succeeded', validated_by = (select auth.uid()), validated_at = now()
  where id = v_pay.id;

  perform public.write_audit(v_restaurant, 'pos_card_payment_confirmed', 'payment', v_pay.id::text,
    v_pay.amount_dzd, jsonb_build_object('bill', p_bill, 'method', 'card', 'tip', v_pay.tip_dzd));

  if public.bill_paid_total(p_bill) >= public.bill_net_total(p_bill) then
    update public.bills
    set status = 'paid', closed_at = now()
    where id = p_bill and restaurant_id = v_restaurant and status = 'open';
  end if;
end;
$$;

create or replace function public.cancel_pos_card_payment(p_bill uuid, p_payment uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_restaurant uuid := public.require_team(array['restaurant_admin', 'server']);
  v_pay public.payments;
begin
  perform 1
  from public.bills
  where id = p_bill and restaurant_id = v_restaurant and status <> 'void'
  for update;
  if not found then raise exception 'Bill not found or void' using errcode = '42501'; end if;

  select * into v_pay
  from public.payments
  where id = p_payment and bill_id = p_bill and restaurant_id = v_restaurant
    and method = 'card' and status = 'pending'
  for update;
  if not found then raise exception 'No pending POS card payment' using errcode = '22023'; end if;

  update public.payments set status = 'cancelled' where id = v_pay.id;
  perform public.write_audit(v_restaurant, 'pos_card_payment_cancelled', 'payment', v_pay.id::text,
    v_pay.amount_dzd, jsonb_build_object('bill', p_bill, 'method', 'card', 'tip', v_pay.tip_dzd));
end;
$$;

revoke execute on function public.confirm_pos_card_payment(uuid, uuid) from public, anon, authenticated;
revoke execute on function public.cancel_pos_card_payment(uuid, uuid) from public, anon, authenticated;
grant execute on function public.confirm_pos_card_payment(uuid, uuid),
  public.cancel_pos_card_payment(uuid, uuid) to authenticated;

create or replace function public.record_payment(
  p_bill uuid, p_amount bigint, p_tip bigint, p_method text, p_key text
) returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_restaurant uuid := public.require_team(array['restaurant_admin', 'server']);
  v_bill public.bills;
  v_existing public.payments;
  v_remaining bigint;
  v_pending bigint;
  v_id uuid;
  v_status text;
begin
  select * into v_existing
  from public.payments
  where restaurant_id = v_restaurant and idempotency_key = p_key;
  if found then
    if v_existing.bill_id <> p_bill or v_existing.amount_dzd <> p_amount then
      raise exception 'Idempotency key reused with different data' using errcode = '22023';
    end if;
    return v_existing.id;
  end if;

  select * into v_bill
  from public.bills
  where id = p_bill and restaurant_id = v_restaurant
  for update;
  if not found or v_bill.status <> 'open' then raise exception 'Bill not found or closed' using errcode = '42501'; end if;
  if p_method not in ('cash', 'card', 'baridimob', 'stripe') then raise exception 'Invalid method' using errcode = '22023'; end if;

  select coalesce(sum(amount_dzd), 0) into v_pending
  from public.payments
  where bill_id = p_bill and status = 'pending';
  v_remaining := public.bill_net_total(p_bill) - public.bill_paid_total(p_bill) - v_pending;
  if p_amount is null or p_amount <= 0 or p_amount > v_remaining then
    raise exception 'Invalid amount (remaining %)', v_remaining using errcode = '22023';
  end if;
  if p_tip is null or p_tip < 0 or p_tip > public.bill_net_total(p_bill) then
    raise exception 'Invalid tip' using errcode = '22023';
  end if;

  v_status := case when p_method in ('cash', 'baridimob') then 'succeeded' else 'pending' end;
  insert into public.payments (
    bill_id, restaurant_id, amount_dzd, tip_dzd, method, status, idempotency_key, validated_by, validated_at
  ) values (
    p_bill, v_restaurant, p_amount, p_tip, p_method, v_status, p_key,
    case when v_status = 'succeeded' then (select auth.uid()) end,
    case when v_status = 'succeeded' then now() end
  )
  returning id into v_id;

  perform public.write_audit(v_restaurant, 'payment_' || v_status, 'payment', v_id::text, p_amount,
    jsonb_build_object('method', p_method, 'tip', p_tip, 'bill', p_bill));

  if public.bill_paid_total(p_bill) >= public.bill_net_total(p_bill) then
    update public.bills set status = 'paid', closed_at = now() where id = p_bill;
  end if;
  return v_id;
end;
$$;

revoke execute on function public.record_payment(uuid, bigint, bigint, text, text) from public, anon, authenticated;
grant execute on function public.record_payment(uuid, bigint, bigint, text, text) to authenticated;