-- Retour arrière de 202610060001_billing_ledger.sql
-- ATTENTION : supprime additions, paiements et journal. Exporter d'abord (scripts/backup.mjs).
drop trigger if exists pos_products_audit on public.pos_products;
drop trigger if exists restaurants_audit on public.restaurants;
drop function if exists public.audit_product_changes();
drop function if exists public.audit_restaurant_changes();
drop function if exists public.settle_provider_payment(text, uuid, text);
drop function if exists public.void_bill(uuid);
drop function if exists public.refund_payment(uuid, text);
drop function if exists public.cancel_pending_payment(uuid);
drop function if exists public.record_payment(uuid, bigint, bigint, text, text);
drop function if exists public.set_bill_discount(uuid, bigint);
drop function if exists public.add_bill_item(uuid, uuid, integer);
drop function if exists public.open_bill(text);
drop function if exists public.require_team(text[]);
drop function if exists public.bill_paid_total(uuid);
drop function if exists public.bill_net_total(uuid);
drop function if exists public.write_audit(uuid, text, text, text, bigint, jsonb);
drop table if exists public.payment_events;
drop table if exists public.payments;
drop table if exists public.bill_items;
drop table if exists public.bills;
drop table if exists public.audit_log;
drop function if exists public.audit_log_immutable();
