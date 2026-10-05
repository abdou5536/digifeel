create or replace function public.current_app_role()
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select role from public.app_users where id = (select auth.uid())
$$;
