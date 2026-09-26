-- Guest checkout was failing with "new row violates row-level security
-- policy for table orders" — the INSERT policy live on the project didn't
-- match schema.sql (likely stale/missing). This re-applies the intended
-- policy: a signed-in customer may only insert an order for themselves,
-- and a guest (no session) may only insert an order with user_id = null.
drop policy if exists "orders_insert_own_or_guest" on public.orders;

create policy "orders_insert_own_or_guest" on public.orders
  for insert with check (
    (auth.uid() is not null and user_id = auth.uid())
    or (auth.uid() is null and user_id is null)
  );
