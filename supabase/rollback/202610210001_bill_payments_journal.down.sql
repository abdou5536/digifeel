-- Retour arriere de 202610210001_bill_payments_journal.sql.
-- Les ecritures de journal deja creees restent (le journal est append-only) ; seul le branchement est retire.
-- refund_payment doit etre redefinie sans le controle du Z (version de 202610060001_billing_ledger.sql).
drop trigger if exists payments_write_journal on public.payments;
drop function if exists public.pos_payments_journal();
drop index if exists public.payments_restaurant_ticket_uidx;

create or replace function public.refund_payment(p_payment uuid, p_reason text)
returns void language plpgsql security definer set search_path = '' as $$
declare v_restaurant uuid := public.require_team(array['restaurant_admin']); v_pay public.payments;
begin
  select * into v_pay from public.payments where id = p_payment and restaurant_id = v_restaurant and status = 'succeeded' for update;
  if not found then raise exception 'Payment not refundable' using errcode = '22023'; end if;
  update public.payments set status = 'refunded', refunded_by = (select auth.uid()), refund_reason = left(p_reason, 300) where id = p_payment;
  update public.bills set status = 'open', closed_at = null where id = v_pay.bill_id and status = 'paid';
  perform public.write_audit(v_restaurant, 'payment_refunded', 'payment', p_payment::text, v_pay.amount_dzd,
    jsonb_build_object('reason', left(p_reason, 300)));
end;
$$;

alter table public.payments drop column if exists ticket_number;
