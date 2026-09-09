-- Saabi Designes — Role-based admin access
--
-- HOW TO USE
-- Run this once in your Supabase project → SQL Editor → New query → Run.
-- It adds three admin roles on top of the existing is_admin flag:
--   super_admin — full access, including this role management itself
--   manager     — products, orders, customers (no site settings)
--   staff       — view-only orders & customers
--
-- Any account that already has is_admin = true is automatically promoted
-- to super_admin so nobody loses access when this runs.
--
-- After this, use the Admin Panel's "Admins" tab (super_admin only) to
-- grant/change/revoke roles for any account that has already signed up —
-- no more manual SQL needed going forward.

alter table public.profiles
  add column if not exists role text not null default 'staff';

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'profiles_role_check'
  ) then
    alter table public.profiles
      add constraint profiles_role_check check (role in ('super_admin','manager','staff'));
  end if;
end $$;

update public.profiles set role = 'super_admin' where is_admin = true;

-- ── Role helper functions ──────────────────────────────────────────────

create or replace function public.admin_role()
returns text
language sql
security definer
set search_path = public
as $$
  select coalesce((select role from public.profiles where id = auth.uid() and is_admin = true), 'none');
$$;

create or replace function public.is_manager_or_above()
returns boolean
language sql
security definer
set search_path = public
as $$
  select public.admin_role() in ('super_admin', 'manager');
$$;

create or replace function public.is_super_admin()
returns boolean
language sql
security definer
set search_path = public
as $$
  select public.admin_role() = 'super_admin';
$$;

-- ── Prevent privilege escalation: only super admins may change is_admin/role,
--    regardless of which policy allowed the underlying row update ─────────

-- auth.uid() is null when there's no logged-in app user in the request
-- context — that's the case for direct SQL (SQL Editor, migrations, the
-- service role), which is already fully trusted. Only block the change
-- when there IS a logged-in app user and they aren't a super admin.
create or replace function public.prevent_privilege_escalation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if (new.is_admin is distinct from old.is_admin or new.role is distinct from old.role) then
    if auth.uid() is not null and not public.is_super_admin() then
      raise exception 'Only super admins can change admin role or status';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists prevent_privilege_escalation_trigger on public.profiles;
create trigger prevent_privilege_escalation_trigger
  before update on public.profiles
  for each row execute procedure public.prevent_privilege_escalation();

-- ── Safe RPC the app uses to grant/change/revoke admin roles ─────────────

create or replace function public.set_admin_role(target_user_id uuid, new_role text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_super_admin() then
    raise exception 'Only super admins can change admin roles';
  end if;

  if new_role = 'none' then
    update public.profiles set is_admin = false, role = 'staff' where id = target_user_id;
  elsif new_role in ('super_admin', 'manager', 'staff') then
    update public.profiles set is_admin = true, role = new_role where id = target_user_id;
  else
    raise exception 'Invalid role: %', new_role;
  end if;
end;
$$;

grant execute on function public.set_admin_role(uuid, text) to authenticated;

-- ── Tighten write policies to be role-aware ───────────────────────────────

drop policy if exists "categories_admin_write" on public.categories;
create policy "categories_admin_write" on public.categories
  for all using (public.is_manager_or_above()) with check (public.is_manager_or_above());

drop policy if exists "subcategories_admin_write" on public.subcategories;
create policy "subcategories_admin_write" on public.subcategories
  for all using (public.is_manager_or_above()) with check (public.is_manager_or_above());

drop policy if exists "products_admin_write" on public.products;
create policy "products_admin_write" on public.products
  for all using (public.is_manager_or_above()) with check (public.is_manager_or_above());

drop policy if exists "home_content_admin_write" on public.home_content;
create policy "home_content_admin_write" on public.home_content
  for all using (public.is_super_admin()) with check (public.is_super_admin());

drop policy if exists "page_content_admin_write" on public.page_content;
create policy "page_content_admin_write" on public.page_content
  for all using (public.is_super_admin()) with check (public.is_super_admin());

drop policy if exists "discount_codes_admin_write" on public.discount_codes;
create policy "discount_codes_admin_write" on public.discount_codes
  for all using (public.is_super_admin()) with check (public.is_super_admin());

drop policy if exists "orders_admin_update" on public.orders;
create policy "orders_admin_update" on public.orders
  for update using (public.is_manager_or_above()) with check (public.is_manager_or_above());

drop policy if exists "profiles_update_own_or_admin" on public.profiles;
create policy "profiles_update_own_or_manager" on public.profiles
  for update using (auth.uid() = id or public.is_manager_or_above());

drop policy if exists "product_images_admin_insert" on storage.objects;
create policy "product_images_admin_insert" on storage.objects
  for insert with check (bucket_id = 'product-images' and public.is_manager_or_above());
drop policy if exists "product_images_admin_update" on storage.objects;
create policy "product_images_admin_update" on storage.objects
  for update using (bucket_id = 'product-images' and public.is_manager_or_above());
drop policy if exists "product_images_admin_delete" on storage.objects;
create policy "product_images_admin_delete" on storage.objects
  for delete using (bucket_id = 'product-images' and public.is_manager_or_above());

drop policy if exists "banners_admin_insert" on storage.objects;
create policy "banners_admin_insert" on storage.objects
  for insert with check (bucket_id = 'banners' and public.is_super_admin());
drop policy if exists "banners_admin_update" on storage.objects;
create policy "banners_admin_update" on storage.objects
  for update using (bucket_id = 'banners' and public.is_super_admin());
drop policy if exists "banners_admin_delete" on storage.objects;
create policy "banners_admin_delete" on storage.objects
  for delete using (bucket_id = 'banners' and public.is_super_admin());
