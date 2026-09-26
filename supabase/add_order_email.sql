-- Adds an optional email column to orders, used for the Razorpay order
-- confirmation email and shown in Admin → Orders.
alter table public.orders add column if not exists email text default '';
