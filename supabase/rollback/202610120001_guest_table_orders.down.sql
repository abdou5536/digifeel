revoke execute on function public.guest_get_menu(text),
  public.guest_get_table_orders(text),
  public.submit_guest_table_order(text, jsonb, text, text) from public, anon, authenticated;
drop function if exists public.guest_get_table_orders(text);
drop function if exists public.guest_get_menu(text);
drop function if exists public.submit_guest_table_order(text, jsonb, text, text);

drop index if exists public.table_orders_guest_idempotency_idx;
alter table public.table_orders
  drop constraint if exists table_orders_guest_request_check,
  drop column if exists bill_id,
  drop column if exists guest_session_id,
  drop column if exists idempotency_key,
  drop column if exists request_hash;
