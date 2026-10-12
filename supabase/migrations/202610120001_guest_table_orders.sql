-- Commandes invitées liées à la session QR et à l'addition ouverte.
alter table public.table_orders
  add column bill_id uuid references public.bills(id) on delete cascade,
  add column guest_session_id uuid references public.guest_sessions(id) on delete cascade,
  add column idempotency_key text,
  add column request_hash text;

alter table public.table_orders
  add constraint table_orders_guest_request_check
  check (
    (guest_session_id is null and idempotency_key is null and request_hash is null)
    or (
      guest_session_id is not null
      and bill_id is not null
      and idempotency_key is not null
      and request_hash is not null
      and length(idempotency_key) between 8 and 120
      and request_hash ~ '^[a-f0-9]{64}$'
    )
  );

create unique index table_orders_guest_idempotency_idx
  on public.table_orders(guest_session_id, idempotency_key)
  where guest_session_id is not null;

create or replace function public.guest_get_menu(p_token text)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_session public.guest_sessions;
  v_bill public.bills;
begin
  select * into v_session
  from public.guest_sessions
  where token_hash = encode(extensions.digest(coalesce(p_token, ''), 'sha256'), 'hex')
    and closed_at is null
    and expires_at > now();
  if not found then raise exception 'Invalid session' using errcode = '42501'; end if;

  select * into v_bill from public.bills
  where id = v_session.bill_id and restaurant_id = v_session.restaurant_id and status = 'open';
  if not found then raise exception 'Invalid session' using errcode = '42501'; end if;

  return jsonb_build_object(
    'products', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', p.id,
        'name', p.name,
        'category', p.category,
        'price_dzd', p.price_dzd
      ) order by p.category, p.name)
      from public.pos_products p
      where p.restaurant_id = v_session.restaurant_id and p.active
    ), '[]'::jsonb),
    'orders', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', o.id,
        'status', o.status,
        'created_at', o.created_at,
        'items', coalesce((
          select jsonb_agg(jsonb_build_object(
            'product_name', oi.product_name,
            'quantity', oi.quantity
          ) order by oi.created_at)
          from public.table_order_items oi where oi.order_id = o.id
        ), '[]'::jsonb)
      ) order by o.created_at desc)
      from public.table_orders o
      where o.bill_id = v_bill.id
    ), '[]'::jsonb)
  );
end;
$$;

create or replace function public.guest_get_table_orders(p_token text)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select public.guest_get_menu(p_token) -> 'orders';
$$;

create or replace function public.submit_guest_table_order(
  p_token text,
  p_items jsonb,
  p_note text,
  p_idempotency_key text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_session public.guest_sessions;
  v_bill public.bills;
  v_order_id uuid;
  v_table_label text;
  v_count integer;
  v_distinct_count integer;
  v_canonical_items jsonb;
  v_request_hash text;
  v_existing_hash text;
begin
  if length(coalesce(p_idempotency_key, '')) not between 8 and 120
     or length(coalesce(p_note, '')) > 300 then
    raise exception 'Invalid order' using errcode = '22023';
  end if;
  if p_items is null or jsonb_typeof(p_items) <> 'array' then
    raise exception 'Invalid order items' using errcode = '22023';
  end if;
  if jsonb_array_length(p_items) not between 1 and 20 then
    raise exception 'Invalid order items' using errcode = '22023';
  end if;

  if exists (
    select 1
    from jsonb_array_elements(p_items) line
    where jsonb_typeof(line) <> 'object'
      or coalesce(line ->> 'productId', '') !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
      or coalesce(line ->> 'quantity', '') !~ '^([1-9]|1[0-9]|20)$'
  ) then
    raise exception 'Invalid order items' using errcode = '22023';
  end if;

  select jsonb_agg(jsonb_build_object(
    'productId', lower(line ->> 'productId'),
    'quantity', (line ->> 'quantity')::integer
  ) order by lower(line ->> 'productId'))
  into v_canonical_items
  from jsonb_array_elements(p_items) line;

  select count(*), count(distinct line ->> 'productId')
  into v_count, v_distinct_count
  from jsonb_array_elements(v_canonical_items) line;
  if v_count <> v_distinct_count then
    raise exception 'Duplicate products are not allowed' using errcode = '22023';
  end if;

  v_request_hash := encode(extensions.digest(
    v_canonical_items::text || '|' || coalesce(p_note, ''),
    'sha256'
  ), 'hex');

  select * into v_session
  from public.guest_sessions
  where token_hash = encode(extensions.digest(coalesce(p_token, ''), 'sha256'), 'hex')
    and closed_at is null
    and expires_at > now()
  for update;
  if not found then raise exception 'Invalid session' using errcode = '42501'; end if;

  select * into v_bill from public.bills
  where id = v_session.bill_id and restaurant_id = v_session.restaurant_id and status = 'open'
  for update;
  if not found then raise exception 'Invalid session' using errcode = '42501'; end if;

  select o.id, o.request_hash into v_order_id, v_existing_hash
  from public.table_orders o
  where o.guest_session_id = v_session.id and o.idempotency_key = p_idempotency_key;
  if found then
    if v_existing_hash <> v_request_hash then
      raise exception 'Idempotency key reused with different order' using errcode = '22023';
    end if;
    return v_order_id;
  end if;

  if (
    select count(distinct (line ->> 'productId')::uuid)
    from jsonb_array_elements(v_canonical_items) line
    join public.pos_products p
      on p.id = (line ->> 'productId')::uuid
     and p.restaurant_id = v_session.restaurant_id
     and p.active
  ) <> v_count then
    raise exception 'Product unavailable' using errcode = '22023';
  end if;

  select t.label into v_table_label
  from public.dining_tables t
  where t.id = v_bill.table_id and t.restaurant_id = v_session.restaurant_id;
  if not found then raise exception 'Table unavailable' using errcode = '22023'; end if;

  insert into public.table_orders (
    restaurant_id, table_label, status, note, bill_id, guest_session_id,
    idempotency_key, request_hash
  )
  values (
    v_session.restaurant_id, v_table_label, 'new', nullif(trim(coalesce(p_note, '')), ''),
    v_bill.id, v_session.id, p_idempotency_key, v_request_hash
  )
  returning id into v_order_id;

  insert into public.table_order_items (order_id, restaurant_id, product_name, quantity)
  select v_order_id, p.restaurant_id, p.name, (line ->> 'quantity')::integer
  from jsonb_array_elements(v_canonical_items) line
  join public.pos_products p
    on p.id = (line ->> 'productId')::uuid
   and p.restaurant_id = v_session.restaurant_id
   and p.active;

  insert into public.bill_items (bill_id, restaurant_id, product_id, product_name, quantity, unit_price_dzd)
  select v_bill.id, p.restaurant_id, p.id, p.name, (line ->> 'quantity')::integer, p.price_dzd
  from jsonb_array_elements(v_canonical_items) line
  join public.pos_products p
    on p.id = (line ->> 'productId')::uuid
   and p.restaurant_id = v_session.restaurant_id
   and p.active;

  perform public.write_audit(
    v_session.restaurant_id,
    'guest_order_created',
    'table_order',
    v_order_id::text,
    null,
    jsonb_build_object('bill_id', v_bill.id, 'table_label', v_table_label)
  );

  return v_order_id;
end;
$$;

revoke execute on function public.guest_get_menu(text),
  public.guest_get_table_orders(text),
  public.submit_guest_table_order(text, jsonb, text, text) from public;
grant execute on function public.guest_get_menu(text),
  public.guest_get_table_orders(text),
  public.submit_guest_table_order(text, jsonb, text, text) to anon, authenticated;
