-- Droits des personnes : export complet et suppression des données d'un restaurant.
-- Retour arrière : supabase/rollback/202610070001_data_rights.down.sql

create or replace function public.export_restaurant_data()
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_rest uuid := public.current_restaurant_id(); v_result jsonb;
begin
  if public.current_app_role() <> 'restaurant_admin' or v_rest is null then
    raise exception 'Not allowed' using errcode = '42501';
  end if;
  select jsonb_build_object(
    'exported_at', now(),
    'restaurant', (select to_jsonb(r) from public.restaurants r where r.id = v_rest),
    'servers', coalesce((select jsonb_agg(to_jsonb(s)) from public.servers s where s.restaurant_id = v_rest), '[]'),
    'reviews', coalesce((select jsonb_agg(to_jsonb(x) - 'device_hash') from public.reviews x where x.restaurant_id = v_rest), '[]'),
    'products', coalesce((select jsonb_agg(to_jsonb(p)) from public.pos_products p where p.restaurant_id = v_rest), '[]'),
    'bills', coalesce((select jsonb_agg(to_jsonb(b)) from public.bills b where b.restaurant_id = v_rest), '[]'),
    'payments', coalesce((select jsonb_agg(to_jsonb(p)) from public.payments p where p.restaurant_id = v_rest), '[]')
  ) into v_result;
  perform public.write_audit(v_rest, 'data_exported', 'restaurant', v_rest::text, null, '{}'::jsonb);
  return v_result;
end;
$$;

-- Suppression : réservée au super_admin, journalisée AVANT effacement (la trace survit, sans lien restaurant).
create or replace function public.erase_restaurant(p_restaurant uuid, p_confirm text)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_super_admin() then raise exception 'Not allowed' using errcode = '42501'; end if;
  if p_confirm <> 'ERASE ' || p_restaurant::text then raise exception 'Confirmation mismatch' using errcode = '22023'; end if;
  perform public.write_audit(p_restaurant, 'restaurant_erased', 'restaurant', p_restaurant::text, null, '{}'::jsonb);
  delete from public.restaurants where id = p_restaurant;
end;
$$;

revoke execute on function public.export_restaurant_data(), public.erase_restaurant(uuid, text) from public, anon, authenticated;
grant execute on function public.export_restaurant_data(), public.erase_restaurant(uuid, text) to authenticated;