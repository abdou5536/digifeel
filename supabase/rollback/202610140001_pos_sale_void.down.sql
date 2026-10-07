revoke execute on function public.void_pos_sale(uuid, text) from public, anon, authenticated;
drop function if exists public.void_pos_sale(uuid, text);

drop index if exists public.pos_sales_restaurant_voided_idx;
alter table public.pos_sales
  drop column if exists voided_at,
  drop column if exists voided_by,
  drop column if exists void_reason;
