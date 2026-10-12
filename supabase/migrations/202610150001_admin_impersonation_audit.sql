-- Journalisation de l'entrée super-admin dans un restaurant (impersonation), via le journal d'audit existant.
create or replace function public.super_admin_log_impersonation(
  p_restaurant uuid, p_target_email text
) returns void language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_super_admin() then
    raise exception 'Réservé au super-administrateur.' using errcode = '42501';
  end if;
  perform public.write_audit(p_restaurant, 'admin_impersonation', 'restaurant', p_restaurant::text, null,
    jsonb_build_object('target_email', p_target_email));
end;
$$;
revoke execute on function public.super_admin_log_impersonation(uuid, text) from public, anon, authenticated;
grant execute on function public.super_admin_log_impersonation(uuid, text) to authenticated;
