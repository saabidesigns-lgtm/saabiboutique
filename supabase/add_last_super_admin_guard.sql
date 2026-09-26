-- Prevents removing the last super admin. Without this, a super admin could
-- demote or revoke themselves (or, in a two-super-admin race, each other)
-- down to zero super admins — after which nobody could promote anyone back,
-- since set_admin_role() itself requires the caller to already be a super
-- admin. Run this once in Supabase → SQL Editor.
create or replace function public.set_admin_role(target_user_id uuid, new_role text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  target_current_role text;
  remaining_super_admins int;
begin
  if not public.is_super_admin() then
    raise exception 'Only super admins can change admin roles';
  end if;

  select role into target_current_role from public.profiles where id = target_user_id;

  if target_current_role = 'super_admin' and new_role is distinct from 'super_admin' then
    select count(*) into remaining_super_admins
      from public.profiles
      where role = 'super_admin' and is_admin = true and id <> target_user_id;
    if remaining_super_admins = 0 then
      raise exception 'Cannot remove the last super admin — promote another account to super admin first';
    end if;
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
