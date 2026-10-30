drop policy if exists "admins can read admin roster" on public.admin_users;
drop policy if exists "admins can read own admin record" on public.admin_users;
create policy "admins can read own admin record" on public.admin_users for select to authenticated using(user_id=auth.uid());
drop policy if exists "admins read profile reports" on public.profile_reports;
create policy "admins read profile reports" on public.profile_reports for select to authenticated using(reporter_id=auth.uid() or public.is_wayss_admin());
drop policy if exists "admins read post reports" on public.post_reports;
create policy "admins read post reports" on public.post_reports for select to authenticated using(reporter_id=auth.uid() or public.is_wayss_admin());
drop policy if exists "profiles visible unless blocked by profile owner" on public.profiles;
create policy "profiles visible unless blocked by profile owner" on public.profiles for select to authenticated using(id=auth.uid() or public.is_wayss_admin() or not exists(select 1 from public.profile_blocks b where b.blocker_id=profiles.id and b.blocked_id=auth.uid()));
