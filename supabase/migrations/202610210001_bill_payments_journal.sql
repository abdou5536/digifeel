-- Paiements d'additions de table : meme numerotation continue et meme journal chaine que les ventes directes.
-- Un paiement n'entre au journal que lorsqu'il est encaisse (statut "succeeded") ; un remboursement
-- ajoute une ecriture inverse et reste interdit une fois la journee cloturee (Z).
-- Les pourboires ne sont pas du chiffre d'affaires : ils figurent dans le detail de l'ecriture, pas dans le total du Z.
-- Retour arriere : supabase/rollback/202610210001_bill_payments_journal.down.sql

alter table public.payments add column if not exists ticket_number bigint;

create or replace function public.pos_payments_journal()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_method text;
begin
  v_method := case when new.method = 'stripe' then 'card' else new.method end;

  if new.status = 'succeeded' and (tg_op = 'INSERT' or old.status <> 'succeeded') then
    new.ticket_number := public.pos_next_ticket(new.restaurant_id);
    perform public.pos_journal_append(new.restaurant_id, 'sale', new.id, new.ticket_number,
      new.amount_dzd, v_method, coalesce(new.validated_by, (select auth.uid())), clock_timestamp(),
      jsonb_build_object('source', 'bill_payment', 'bill', new.bill_id, 'tip', new.tip_dzd));
  elsif tg_op = 'UPDATE' and old.status = 'succeeded' and new.status = 'refunded' then
    perform public.pos_journal_append(new.restaurant_id, 'reversal', new.id, old.ticket_number,
      -new.amount_dzd, v_method, new.refunded_by, clock_timestamp(),
      jsonb_build_object('source', 'bill_payment', 'bill', new.bill_id, 'reason', new.refund_reason));
  elsif tg_op = 'UPDATE' and old.status = 'succeeded' and new.status <> 'succeeded' then
    raise exception 'A collected payment can only be refunded' using errcode = '42501';
  end if;
  return new;
end;
$$;

-- Reprise de l'existant, dans l'ordre chronologique.
do $$
declare
  r record;
  v_ticket bigint;
  v_method text;
begin
  for r in select * from public.payments where status in ('succeeded', 'refunded') and ticket_number is null
           order by restaurant_id, created_at, id
  loop
    v_method := case when r.method = 'stripe' then 'card' else r.method end;
    v_ticket := public.pos_next_ticket(r.restaurant_id);
    update public.payments set ticket_number = v_ticket where id = r.id;
    perform public.pos_journal_append(r.restaurant_id, 'sale', r.id, v_ticket, r.amount_dzd, v_method,
      r.validated_by, coalesce(r.validated_at, r.created_at),
      jsonb_build_object('source', 'bill_payment', 'bill', r.bill_id, 'tip', r.tip_dzd));
    if r.status = 'refunded' then
      perform public.pos_journal_append(r.restaurant_id, 'reversal', r.id, v_ticket, -r.amount_dzd, v_method,
        r.refunded_by, clock_timestamp(),
        jsonb_build_object('source', 'bill_payment', 'bill', r.bill_id, 'reason', r.refund_reason));
    end if;
  end loop;
end;
$$;

create unique index if not exists payments_restaurant_ticket_uidx
  on public.payments(restaurant_id, ticket_number) where ticket_number is not null;

create trigger payments_write_journal before insert or update of status on public.payments
  for each row execute function public.pos_payments_journal();

create or replace function public.refund_payment(p_payment uuid, p_reason text)
returns void language plpgsql security definer set search_path = '' as $$
declare v_restaurant uuid := public.require_team(array['restaurant_admin']); v_pay public.payments;
begin
  select * into v_pay from public.payments where id = p_payment and restaurant_id = v_restaurant and status = 'succeeded' for update;
  if not found then raise exception 'Payment not refundable' using errcode = '22023'; end if;
  if exists (
    select 1 from public.pos_z_reports z
    where z.restaurant_id = v_restaurant
      and z.through_seq >= (
        select j.seq from public.pos_journal j
        where j.restaurant_id = v_restaurant and j.sale_id = p_payment and j.entry_type = 'sale'
      )
  ) then
    raise exception 'Payment belongs to a closed day' using errcode = '23514';
  end if;
  update public.payments set status = 'refunded', refunded_by = (select auth.uid()), refund_reason = left(p_reason, 300) where id = p_payment;
  update public.bills set status = 'open', closed_at = null where id = v_pay.bill_id and status = 'paid';
  perform public.write_audit(v_restaurant, 'payment_refunded', 'payment', p_payment::text, v_pay.amount_dzd,
    jsonb_build_object('reason', left(p_reason, 300)));
end;
$$;
