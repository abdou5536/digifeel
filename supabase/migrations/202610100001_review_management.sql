-- Le statut de traitement des avis est métier et doit survivre aux sessions/navigateurs.
alter table public.reviews
  add column handled_at timestamptz,
  add column handled_by uuid references auth.users(id) on delete set null;

create or replace function public.set_review_handled(p_review uuid, p_handled boolean)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_role text := public.current_app_role();
  v_restaurant uuid := public.current_restaurant_id();
  v_server uuid := public.current_server_id();
  v_review public.reviews;
begin
  if p_review is null or p_handled is null then
    raise exception 'Review status is invalid' using errcode = '22023';
  end if;
  if v_role not in ('restaurant_admin', 'server') then
    raise exception 'Review management is not allowed' using errcode = '42501';
  end if;

  select * into v_review from public.reviews where id = p_review for update;
  if not found or v_review.restaurant_id is distinct from v_restaurant
     or (v_role = 'server' and v_review.server_id is distinct from v_server) then
    raise exception 'Review not found' using errcode = '42501';
  end if;

  update public.reviews
  set handled_at = case when p_handled then now() else null end,
      handled_by = case when p_handled then auth.uid() else null end
  where id = p_review;

  perform public.write_audit(v_review.restaurant_id,
    case when p_handled then 'review_handled' else 'review_reopened' end,
    'review', p_review::text, null, '{}'::jsonb);
end;
$$;

revoke execute on function public.set_review_handled(uuid, boolean) from public, anon;
grant execute on function public.set_review_handled(uuid, boolean) to authenticated;
