-- Retour arriere de 202610220001_license_enforcement.sql.
drop trigger if exists pos_sales_enforce_license on public.pos_sales;
drop trigger if exists payments_enforce_license on public.payments;
drop function if exists public.enforce_license();
drop function if exists public.license_valid_until(uuid);
