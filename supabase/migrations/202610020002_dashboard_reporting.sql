create or replace function public.get_dashboard_summary(
  p_from timestamptz,
  p_to timestamptz
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_role text;
  v_restaurant_id uuid;
  v_server_id uuid;
  v_scans_count bigint := 0;
  v_review_count bigint := 0;
  v_average numeric;
  v_scans_by_day jsonb := '[]'::jsonb;
  v_reviews jsonb := '[]'::jsonb;
  v_servers jsonb := '[]'::jsonb;
begin
  if v_user_id is null then
    raise exception 'Authentication required' using errcode = '28000';
  end if;

  if p_from is null or p_to is null or p_from >= p_to
     or p_to - p_from > interval '366 days' then
    raise exception 'Dashboard period is invalid' using errcode = '22023';
  end if;

  select role, restaurant_id, server_id
  into v_role, v_restaurant_id, v_server_id
  from public.app_users
  where id = v_user_id;

  if v_role not in ('restaurant_admin', 'server') or v_restaurant_id is null then
    raise exception 'Dashboard access denied' using errcode = '42501';
  end if;
  if v_role = 'server' and v_server_id is null then
    raise exception 'Server profile is missing' using errcode = '42501';
  end if;
  if not public.has_active_dashboard_access(v_restaurant_id) then
    raise exception 'Dashboard subscription is inactive' using errcode = '42501';
  end if;

  if v_role = 'restaurant_admin' then
    select count(*) into v_scans_count
    from public.scans
    where restaurant_id = v_restaurant_id
      and created_at >= p_from
      and created_at < p_to;

    select coalesce(
      jsonb_agg(jsonb_build_object('date', activity.day::date, 'count', coalesce(daily.scan_count, 0)) order by activity.day),
      '[]'::jsonb
    )
    into v_scans_by_day
    from pg_catalog.generate_series(
      pg_catalog.date_trunc('day', p_from),
      pg_catalog.date_trunc('day', p_to - interval '1 microsecond'),
      interval '1 day'
    ) as activity(day)
    left join (
      select pg_catalog.date_trunc('day', created_at) as day, count(*) as scan_count
      from public.scans
      where restaurant_id = v_restaurant_id
        and created_at >= p_from
        and created_at < p_to
      group by pg_catalog.date_trunc('day', created_at)
    ) as daily on daily.day = activity.day;
  end if;

  select count(*), coalesce(round(avg(stars)::numeric, 2), 0)
  into v_review_count, v_average
  from public.reviews
  where restaurant_id = v_restaurant_id
    and created_at >= p_from
    and created_at < p_to
    and (v_role = 'restaurant_admin' or server_id = v_server_id);

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', recent.id,
        'stars', recent.stars,
        'comment', recent.comment,
        'created_at', recent.created_at,
        'server_id', recent.server_id,
        'server_name', recent.server_name
      ) order by recent.created_at desc
    ),
    '[]'::jsonb
  )
  into v_reviews
  from (
    select review.id, review.stars, review.comment, review.created_at, review.server_id, server.name as server_name
    from public.reviews as review
    left join public.servers as server on server.id = review.server_id
    where review.restaurant_id = v_restaurant_id
      and review.created_at >= p_from
      and review.created_at < p_to
      and (v_role = 'restaurant_admin' or review.server_id = v_server_id)
    order by review.created_at desc
    limit 200
  ) as recent;

  if v_role = 'restaurant_admin' then
    select coalesce(
      jsonb_agg(
        jsonb_build_object(
          'id', server.id,
          'name', server.name,
          'active', server.active,
          'review_count', coalesce(stats.review_count, 0),
          'average_rating', coalesce(stats.average_rating, 0)
        ) order by server.name
      ),
      '[]'::jsonb
    )
    into v_servers
    from public.servers as server
    left join (
      select server_id, count(*) as review_count, round(avg(stars)::numeric, 2) as average_rating
      from public.reviews
      where restaurant_id = v_restaurant_id
        and created_at >= p_from
        and created_at < p_to
        and server_id is not null
      group by server_id
    ) as stats on stats.server_id = server.id
    where server.restaurant_id = v_restaurant_id;
  else
    select coalesce(
      jsonb_agg(
        jsonb_build_object(
          'id', server.id,
          'name', server.name,
          'active', server.active,
          'review_count', v_review_count,
          'average_rating', v_average
        )
      ),
      '[]'::jsonb
    )
    into v_servers
    from public.servers as server
    where server.id = v_server_id
      and server.restaurant_id = v_restaurant_id;
  end if;

  return jsonb_build_object(
    'scans_count', v_scans_count,
    'scans_by_day', v_scans_by_day,
    'review_count', v_review_count,
    'average_rating', v_average,
    'reviews', v_reviews,
    'servers', v_servers
  );
end;
$$;

revoke execute on function public.get_dashboard_summary(timestamptz, timestamptz) from public, anon;
grant execute on function public.get_dashboard_summary(timestamptz, timestamptz) to authenticated;

create or replace function public.has_active_dashboard_access(target_restaurant uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    public.current_app_role() = 'super_admin'
    or (
      public.current_restaurant_id() = target_restaurant
      and exists (
        select 1
        from public.subscriptions
        where restaurant_id = target_restaurant
          and (
            status = 'active'
            or (status = 'trialing' and trial_ends_at > now())
          )
      )
    ),
    false
  )
$$;

revoke execute on function public.has_active_dashboard_access(uuid) from public, anon;
grant execute on function public.has_active_dashboard_access(uuid) to authenticated;

drop policy if exists "Restaurant admins read scans" on public.scans;
create policy "Restaurant admins with dashboard access read scans"
  on public.scans for select to authenticated
  using (
    public.can_access_restaurant(restaurant_id)
    and public.has_active_dashboard_access(restaurant_id)
  );

drop policy if exists "Restaurant admins and assigned servers read reviews" on public.reviews;
create policy "Restaurant team with dashboard access reads reviews"
  on public.reviews for select to authenticated
  using (
    (
      public.can_access_restaurant(restaurant_id)
      or (public.current_app_role() = 'server' and server_id = public.current_server_id())
    )
    and public.has_active_dashboard_access(restaurant_id)
  );

drop policy if exists "Restaurant admins and assigned servers read tips" on public.tips;
create policy "Restaurant team with dashboard access reads tips"
  on public.tips for select to authenticated
  using (
    (
      public.can_access_restaurant(restaurant_id)
      or (public.current_app_role() = 'server' and server_id = public.current_server_id())
    )
    and public.has_active_dashboard_access(restaurant_id)
  );
