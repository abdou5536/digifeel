-- Retour arrière de 202610050001_kitchen_role.sql
-- ATTENTION : supprime les commandes. Exporter table_orders / table_order_items avant (voir RESTAURATION.md).
-- Les comptes `kitchen` sont convertis en `server` sans restaurant pour ne perdre aucun utilisateur.

drop table if exists public.table_order_items;
drop table if exists public.table_orders;
drop function if exists public.guard_table_order_update();

update public.app_users set role = 'server', server_id = null, restaurant_id = null where role = 'kitchen';

alter table public.app_users drop constraint if exists app_users_role_check;
alter table public.app_users
  add constraint app_users_role_check
  check (role in ('super_admin', 'restaurant_admin', 'server', 'reseller'));

drop policy if exists "Users see their own account or their restaurant team" on public.app_users;
create policy "Users see their own account or their restaurant team"
  on public.app_users for select to authenticated
  using (
    id = (select auth.uid())
    or public.is_super_admin()
    or (restaurant_id is not null and restaurant_id = public.current_restaurant_id())
  );
