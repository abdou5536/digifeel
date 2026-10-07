-- Caisse : permet d'annuler (retour/erreur de caisse) une vente déjà enregistrée.
-- Une vente annulée reste visible (traçabilité) mais n'est plus comptée dans le chiffre d'affaires
-- ni dans les exports PDF/Excel. Retour arrière : supabase/rollback/202610140001_pos_sale_void.down.sql

alter table public.pos_sales add column if not exists voided_at timestamptz;
alter table public.pos_sales add column if not exists voided_by uuid references auth.users(id) on delete set null;
alter table public.pos_sales add column if not exists void_reason text check (length(void_reason) <= 300);

create index if not exists pos_sales_restaurant_voided_idx
  on public.pos_sales(restaurant_id, voided_at);

-- Seul un responsable (restaurant_admin) peut annuler une vente de son propre restaurant,
-- et uniquement si elle n'est pas déjà annulée.
create or replace function public.void_pos_sale(
  p_sale_id uuid,
  p_reason text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_role text;
  v_restaurant_id uuid;
  v_sale_restaurant uuid;
  v_already_voided timestamptz;
begin
  if v_user_id is null then
    raise exception 'Authentication required' using errcode = '28000';
  end if;
  if length(coalesce(p_reason, '')) > 300 then
    raise exception 'Void reason is too long' using errcode = '22023';
  end if;

  select role, restaurant_id into v_role, v_restaurant_id
  from public.app_users
  where id = v_user_id;

  if v_role <> 'restaurant_admin' or v_restaurant_id is null then
    raise exception 'Only a restaurant manager can void a sale' using errcode = '42501';
  end if;

  select restaurant_id, voided_at into v_sale_restaurant, v_already_voided
  from public.pos_sales
  where id = p_sale_id
  for update;

  if not found or v_sale_restaurant <> v_restaurant_id then
    raise exception 'Sale not found' using errcode = 'P0002';
  end if;
  if v_already_voided is not null then
    raise exception 'Sale is already voided' using errcode = '23505';
  end if;

  update public.pos_sales
  set voided_at = now(), voided_by = v_user_id, void_reason = nullif(trim(coalesce(p_reason, '')), '')
  where id = p_sale_id;
end;
$$;

revoke execute on function public.void_pos_sale(uuid, text) from public, anon;
grant execute on function public.void_pos_sale(uuid, text) to authenticated;
