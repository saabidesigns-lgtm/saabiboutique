-- Saabi Designes — Let Managers edit the Home Screen (hero banners, etc.)
--
-- HOW TO USE
-- Run this once in your Supabase project → SQL Editor → New query → Run.
--
-- Previously only super_admin could write to home_content / the "banners"
-- storage bucket. This widens that to manager-or-above, matching the
-- Admin Panel's "Manager: Products + Home Screen" permission.

drop policy if exists "home_content_admin_write" on public.home_content;
create policy "home_content_admin_write" on public.home_content
  for all using (public.is_manager_or_above()) with check (public.is_manager_or_above());

drop policy if exists "banners_admin_insert" on storage.objects;
create policy "banners_admin_insert" on storage.objects
  for insert with check (bucket_id = 'banners' and public.is_manager_or_above());
drop policy if exists "banners_admin_update" on storage.objects;
create policy "banners_admin_update" on storage.objects
  for update using (bucket_id = 'banners' and public.is_manager_or_above());
drop policy if exists "banners_admin_delete" on storage.objects;
create policy "banners_admin_delete" on storage.objects
  for delete using (bucket_id = 'banners' and public.is_manager_or_above());
