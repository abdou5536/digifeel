drop function if exists public.set_review_handled(uuid, boolean);
alter table public.reviews
  drop column if exists handled_by,
  drop column if exists handled_at;
