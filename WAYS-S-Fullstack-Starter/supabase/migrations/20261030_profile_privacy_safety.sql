-- WAYS S profile privacy and safety migration
-- Apply this migration once in Supabase SQL Editor.

-- Private profile rows are visible only to their owner or approved followers.
drop policy if exists "profiles are visible to signed in users" on public.profiles;
drop policy if exists "profiles visible by account privacy" on public.profiles;
create policy "profiles visible by account privacy" on public.profiles
for select to authenticated using (
  id = auth.uid()
  or not is_private
  or exists (
    select 1 from public.follows f
    where f.follower_id = auth.uid() and f.following_id = profiles.id
  )
);

create table if not exists public.follow_requests (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid not null references public.profiles(id) on delete cascade,
  requested_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending','accepted','declined')),
  created_at timestamptz not null default now(),
  unique(requester_id, requested_id),
  check(requester_id <> requested_id)
);
alter table public.follow_requests enable row level security;
drop policy if exists "participants read follow requests" on public.follow_requests;
create policy "participants read follow requests" on public.follow_requests
for select to authenticated using (auth.uid() = requester_id or auth.uid() = requested_id);
drop policy if exists "users create own follow requests" on public.follow_requests;
create policy "users create own follow requests" on public.follow_requests
for insert to authenticated with check (auth.uid() = requester_id);
drop policy if exists "profile owners respond to follow requests" on public.follow_requests;
create policy "profile owners respond to follow requests" on public.follow_requests
for update to authenticated using (auth.uid() = requested_id) with check (auth.uid() = requested_id);
drop policy if exists "requesters cancel follow requests" on public.follow_requests;
create policy "requesters cancel follow requests" on public.follow_requests
for delete to authenticated using (auth.uid() = requester_id);

create table if not exists public.profile_blocks (
  id uuid primary key default gen_random_uuid(),
  blocker_id uuid not null references public.profiles(id) on delete cascade,
  blocked_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique(blocker_id, blocked_id),
  check(blocker_id <> blocked_id)
);
alter table public.profile_blocks enable row level security;
drop policy if exists "participants read profile blocks" on public.profile_blocks;
create policy "participants read profile blocks" on public.profile_blocks
for select to authenticated using (auth.uid() = blocker_id or auth.uid() = blocked_id);
drop policy if exists "users create own profile blocks" on public.profile_blocks;
create policy "users create own profile blocks" on public.profile_blocks
for insert to authenticated with check (auth.uid() = blocker_id);
drop policy if exists "users remove own profile blocks" on public.profile_blocks;
create policy "users remove own profile blocks" on public.profile_blocks
for delete to authenticated using (auth.uid() = blocker_id);

create table if not exists public.profile_reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.profiles(id) on delete cascade,
  reported_id uuid not null references public.profiles(id) on delete cascade,
  reason text not null check (char_length(reason) between 1 and 2000),
  created_at timestamptz not null default now(),
  check(reporter_id <> reported_id)
);
alter table public.profile_reports enable row level security;
drop policy if exists "users submit profile reports" on public.profile_reports;
create policy "users submit profile reports" on public.profile_reports
for insert to authenticated with check (auth.uid() = reporter_id);
drop policy if exists "reporters read own profile reports" on public.profile_reports;
create policy "reporters read own profile reports" on public.profile_reports
for select to authenticated using (auth.uid() = reporter_id);
