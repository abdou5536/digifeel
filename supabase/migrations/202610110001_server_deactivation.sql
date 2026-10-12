-- Désactiver un serveur doit aussi lui retirer l'accès aux API protégées par current_app_role().
create or replace function public.current_app_role()
returns text language sql stable security definer set search_path = '' as $$
  select app_user.role
  from public.app_users as app_user
  where app_user.id = (select auth.uid())
    and (
      app_user.role <> 'server'
      or exists (
        select 1
        from public.servers as server
        where server.id = app_user.server_id
          and server.restaurant_id = app_user.restaurant_id
          and server.active
      )
    )
$$;
