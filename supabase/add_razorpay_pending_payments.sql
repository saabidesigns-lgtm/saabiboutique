-- Staging table for Razorpay checkouts. Created when checkout starts (before
-- payment), consumed by the verify/webhook Edge Functions once payment is
-- confirmed, which then insert the real row into public.orders using the
-- service role (bypassing RLS entirely — this table is never touched by the
-- client directly, only by trusted server-side Edge Functions).
create table public.pending_payments (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid references auth.users(id) on delete set null,
  customer_name     text not null,
  phone             text not null,
  email             text default '',
  address           text not null,
  city              text not null,
  zip               text default '',
  items             jsonb not null,
  subtotal          numeric not null,
  shipping          numeric not null,
  total             numeric not null,
  razorpay_order_id text not null unique,
  status            text not null default 'created' check (status in ('created', 'paid', 'failed')),
  order_id          bigint references public.orders(id) on delete set null,
  created_at        timestamptz not null default now()
);

alter table public.pending_payments enable row level security;
-- No policies: only the service role (used exclusively by Edge Functions)
-- can read or write this table. anon/authenticated get zero access.
