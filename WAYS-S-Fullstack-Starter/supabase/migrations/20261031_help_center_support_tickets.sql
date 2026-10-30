create table if not exists public.support_settings (
  id integer primary key default 1 check (id = 1),
  support_email text not null default 'vikashjagarwal08@gmail.com',
  updated_at timestamptz not null default now()
);
insert into public.support_settings(id,support_email) values (1,'vikashjagarwal08@gmail.com') on conflict (id) do nothing;
alter table public.support_settings enable row level security;
drop policy if exists "WAYS S admins manage support settings" on public.support_settings;
create policy "WAYS S admins manage support settings" on public.support_settings for all to authenticated using (public.is_wayss_admin()) with check (public.is_wayss_admin());
grant select,insert,update on public.support_settings to authenticated;

create table if not exists public.support_tickets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  description text not null check (char_length(description) between 8 and 5000),
  screenshot_path text,
  status text not null default 'open' check (status in ('open','reviewing','resolved')),
  created_at timestamptz not null default now()
);
alter table public.support_tickets enable row level security;
drop policy if exists "Users create own support tickets" on public.support_tickets;
create policy "Users create own support tickets" on public.support_tickets for insert to authenticated with check ((select auth.uid()) = user_id and (screenshot_path is null or screenshot_path like ((select auth.uid())::text || '/%')));
drop policy if exists "Users view own support tickets" on public.support_tickets;
create policy "Users view own support tickets" on public.support_tickets for select to authenticated using ((select auth.uid()) = user_id or public.is_wayss_admin());
drop policy if exists "Admins update support tickets" on public.support_tickets;
create policy "Admins update support tickets" on public.support_tickets for update to authenticated using (public.is_wayss_admin()) with check (public.is_wayss_admin());
grant select,insert,update on public.support_tickets to authenticated;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values ('support-attachments','support-attachments',false,8388608,array['image/png','image/jpeg','image/webp'])
on conflict (id) do update set public=false,file_size_limit=8388608,allowed_mime_types=array['image/png','image/jpeg','image/webp'];
drop policy if exists "Users upload own support screenshots" on storage.objects;
create policy "Users upload own support screenshots" on storage.objects for insert to authenticated with check (bucket_id='support-attachments' and (storage.foldername(name))[1]=(select auth.uid())::text);
drop policy if exists "Users read own support screenshots" on storage.objects;
create policy "Users read own support screenshots" on storage.objects for select to authenticated using (bucket_id='support-attachments' and ((storage.foldername(name))[1]=(select auth.uid())::text or public.is_wayss_admin()));
