-- Retour arrière : les avis associés à une addition ne sont pas compatibles avec l'ancien schéma
-- (chip_id obligatoire). Exporter ces lignes avant d'appliquer ce script.

drop function if exists public.request_guest_payment(text, bigint, bigint, text, text);
drop function if exists public.confirm_guest_payment(uuid);
drop function if exists public.submit_guest_review(text, integer, text, text, uuid);

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
    'items', coalesce((select jsonb_agg(jsonb_build_object('name', product_name, 'quantity', quantity,
      'unit_price_dzd', unit_price_dzd, 'line_total_dzd', line_total_dzd) order by created_at)
      from public.bill_items where bill_id = v_bill.id), '[]'::jsonb));
end;
$$;

delete from public.reviews where guest_session_id is not null;
drop index if exists public.reviews_guest_session_unique;
alter table public.reviews
  drop column if exists guest_session_id,
  drop column if exists bill_id,
  alter column chip_id set not null;
