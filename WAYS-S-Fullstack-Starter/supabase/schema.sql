-- WAYS S Supabase schema. Run in Supabase SQL Editor.
create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique not null,
  display_name text not null default 'WAYS S member',
  bio text,
  identity_line text,
  avatar_url text,
  cover_url text,
  website text,
  is_private boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  caption text,
  media_url text,
  media_type text not null default 'image' check (media_type in ('image','video')),
  post_type text not null default 'post' check (post_type in ('post','image','flux')),
  created_at timestamptz not null default now()
);

create table if not exists public.follows (
  id uuid primary key default gen_random_uuid(),
  follower_id uuid not null references public.profiles(id) on delete cascade,
  following_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique(follower_id, following_id),
  check (follower_id <> following_id)
);

create table if not exists public.likes (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique(post_id,user_id)
);

create table if not exists public.comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  body text not null check (char_length(body) between 1 and 2000),
  created_at timestamptz not null default now()
);

create table if not exists public.profile_sections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 60),
  description text not null default '',
  color text not null default '#F32950',
  links jsonb not null default '[]'::jsonb,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null references public.profiles(id) on delete cascade,
  receiver_id uuid not null references public.profiles(id) on delete cascade,
  body text not null check (char_length(body) between 1 and 5000),
  created_at timestamptz not null default now(),
  check(sender_id <> receiver_id)
);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  actor_id uuid references public.profiles(id) on delete set null,
  type text not null check(type in ('follow','like','comment','message')),
  entity_id uuid,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

-- Auto-create a profile for every new auth user.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare uname text;
begin
  uname := lower(regexp_replace(coalesce(new.raw_user_meta_data->>'username', split_part(new.email,'@',1)), '[^a-z0-9_]', '', 'g'));
  if uname = '' then uname := 'user_' || substr(new.id::text,1,8); end if;
  insert into public.profiles(id, username, display_name)
  values(new.id, uname, coalesce(new.raw_user_meta_data->>'display_name', uname))
  on conflict (id) do nothing;
  return new;
end; $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
for each row execute procedure public.handle_new_user();

-- RLS
alter table public.profiles enable row level security;
alter table public.posts enable row level security;
alter table public.follows enable row level security;
alter table public.likes enable row level security;
alter table public.comments enable row level security;
alter table public.profile_sections enable row level security;
alter table public.messages enable row level security;
alter table public.notifications enable row level security;

create policy "profiles are visible to signed in users" on public.profiles for select to authenticated using (true);
create policy "users insert own profile" on public.profiles for insert to authenticated with check (auth.uid() = id);
create policy "users update own profile" on public.profiles for update to authenticated using (auth.uid() = id) with check (auth.uid() = id);

create policy "posts visible to signed in users" on public.posts for select to authenticated using (
  exists(select 1 from public.profiles p where p.id = user_id and (not p.is_private or p.id = auth.uid() or exists(select 1 from public.follows f where f.follower_id=auth.uid() and f.following_id=p.id)))
);
create policy "users create own posts" on public.posts for insert to authenticated with check (auth.uid() = user_id);
create policy "owners update posts" on public.posts for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "owners delete posts" on public.posts for delete to authenticated using (auth.uid() = user_id);

create policy "follows readable by signed in users" on public.follows for select to authenticated using (true);
create policy "create own follow" on public.follows for insert to authenticated with check (auth.uid() = follower_id);
create policy "delete own follow" on public.follows for delete to authenticated using (auth.uid() = follower_id);

create policy "likes visible to signed in users" on public.likes for select to authenticated using (true);
create policy "create own like" on public.likes for insert to authenticated with check (auth.uid() = user_id);
create policy "delete own like" on public.likes for delete to authenticated using (auth.uid() = user_id);

create policy "comments visible to signed in users" on public.comments for select to authenticated using (true);
create policy "create own comment" on public.comments for insert to authenticated with check (auth.uid() = user_id);
create policy "delete own comment" on public.comments for delete to authenticated using (auth.uid() = user_id);

create policy "sections visible to signed in users" on public.profile_sections for select to authenticated using (
  exists(select 1 from public.profiles p where p.id=user_id and (not p.is_private or p.id=auth.uid() or exists(select 1 from public.follows f where f.follower_id=auth.uid() and f.following_id=p.id)))
);
create policy "owners create sections" on public.profile_sections for insert to authenticated with check (auth.uid()=user_id);
create policy "owners update sections" on public.profile_sections for update to authenticated using (auth.uid()=user_id) with check (auth.uid()=user_id);
create policy "owners delete sections" on public.profile_sections for delete to authenticated using (auth.uid()=user_id);

create policy "participants read messages" on public.messages for select to authenticated using (auth.uid()=sender_id or auth.uid()=receiver_id);
create policy "sender creates messages" on public.messages for insert to authenticated with check (auth.uid()=sender_id);
create policy "participants update messages" on public.messages for update to authenticated using (auth.uid()=sender_id or auth.uid()=receiver_id);

create policy "users read own notifications" on public.notifications for select to authenticated using (auth.uid()=user_id);
create policy "system or actor creates notifications" on public.notifications for insert to authenticated with check (auth.uid()=actor_id);
create policy "users update own notifications" on public.notifications for update to authenticated using (auth.uid()=user_id);

-- Storage bucket for public profile/post media. For private production media, use private buckets + signed URLs.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('ways-media','ways-media',true,52428800,array['image/jpeg','image/png','image/webp','image/gif','video/mp4','video/webm','video/quicktime'])
on conflict(id) do nothing;

create policy "signed in users upload ways media" on storage.objects for insert to authenticated with check (bucket_id='ways-media' and (storage.foldername(name))[1] in ('profiles','posts'));
create policy "public read ways media" on storage.objects for select using (bucket_id='ways-media');
create policy "owners delete ways media" on storage.objects for delete to authenticated using (bucket_id='ways-media' and owner=auth.uid());

-- Enable realtime for chat messages.
alter publication supabase_realtime add table public.messages;
