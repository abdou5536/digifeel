-- Scan d'une puce/QR depuis l'application : le restaurateur scanne, la table est enregistrée
-- (ou renommée si la puce est déjà à lui). Aucun code d'activation à saisir.

alter table public.chips add column if not exists label text check (length(label) <= 40);

create or replace function public.scan_chip_table(p_chip text, p_name text)
returns table(chip_id text, table_number integer, label text, created boolean)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_restaurant uuid := public.require_team(array['restaurant_admin']);
  v_chip public.chips%rowtype;
  v_name text := trim(coalesce(p_name, ''));
  v_old text;
  v_next integer;
  v_code text := '';
  v_bytes bytea := extensions.gen_random_bytes(16);
  v_alphabet constant text := 'abcdefghijklmnopqrstuvwxyz234567';
  i integer;
begin
  if length(v_name) not between 1 and 40 then
    raise exception 'Table name is invalid' using errcode = '22023';
  end if;
  if p_chip !~ '^[0-9a-f]{8}-[0-9a-f-]{27}$' then
    raise exception 'Chip id is invalid' using errcode = '22023';
  end if;

  select * into v_chip from public.chips c where c.id = p_chip for update;
  if not found then raise exception 'Chip not found' using errcode = 'P0002'; end if;

  if v_chip.restaurant_id = v_restaurant then
    v_old := coalesce(v_chip.label, v_chip.table_number::text);
    update public.dining_tables d set label = v_name
    where d.restaurant_id = v_restaurant and d.label = v_old;
    update public.chips c set label = v_name where c.id = p_chip;
    chip_id := p_chip; table_number := v_chip.table_number; label := v_name; created := false;
    return next;
    return;
  end if;

  if v_chip.restaurant_id is not null or v_chip.status <> 'inactive' then
    raise exception 'Chip already used' using errcode = '42501';
  end if;

  select coalesce(max(c.table_number), 0) + 1 into v_next from public.chips c where c.restaurant_id = v_restaurant;
  if v_next > 999 then raise exception 'Too many tables' using errcode = '22023'; end if;

  for i in 0..15 loop
    v_code := v_code || substr(v_alphabet, (get_byte(v_bytes, i) % 32) + 1, 1);
  end loop;
  insert into public.dining_tables (restaurant_id, label, code) values (v_restaurant, v_name, v_code);

  update public.chips c
  set restaurant_id = v_restaurant, status = 'active', activated_at = now(),
      table_number = v_next, label = v_name,
      activation_code_hash = encode(extensions.digest(extensions.gen_random_bytes(32), 'sha256'), 'hex')
  where c.id = p_chip;

  perform public.write_audit(v_restaurant, 'table_scanned', 'chip', p_chip, null, jsonb_build_object('label', v_name));
  chip_id := p_chip; table_number := v_next; label := v_name; created := true;
  return next;
end;
$$;
revoke execute on function public.scan_chip_table(text, text) from public, anon;
grant execute on function public.scan_chip_table(text, text) to authenticated;
