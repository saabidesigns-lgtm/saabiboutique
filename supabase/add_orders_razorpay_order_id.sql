-- Guards against duplicate orders: the client's verify call and the
-- Razorpay webhook can both fire for the same payment within milliseconds
-- of each other. A read-then-write check in application code can't reliably
-- prevent both from inserting — a unique constraint at the database level
-- can, since only one insert will win and the other gets a clean conflict
-- error to recover from.
alter table public.orders add column if not exists razorpay_order_id text unique;
