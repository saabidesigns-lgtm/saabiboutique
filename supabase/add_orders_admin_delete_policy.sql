-- Orders had no DELETE policy at all (only orders_admin_update for status
-- changes) — the Admin Orders panel is about to get a permanent delete
-- button, so managers and super admins need this.
create policy "orders_admin_delete" on public.orders
  for delete using (public.is_manager_or_above());
