-- Adds a "sold out" flag to products, settable from Admin → Products.
alter table public.products add column if not exists sold_out boolean not null default false;
