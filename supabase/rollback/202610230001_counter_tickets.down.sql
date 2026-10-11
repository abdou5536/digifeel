drop function if exists public.claim_counter_tickets();
drop function if exists public.send_bill_to_counter(uuid);
drop index if exists public.bill_items_counter_idx;
alter table public.bill_items drop column if exists printed_at, drop column if exists sent_at;
