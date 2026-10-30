-- Story engagement: likes, comments, and private owner-only viewer lists.
create table if not exists public.story_likes(
 id uuid primary key default gen_random_uuid(),
 story_id uuid not null references public.stories(id) on delete cascade,
 user_id uuid not null references public.profiles(id) on delete cascade,
 created_at timestamptz not null default now(),
 unique(story_id,user_id)
);
create table if not exists public.story_comments(
 id uuid primary key default gen_random_uuid(),
 story_id uuid not null references public.stories(id) on delete cascade,
 user_id uuid not null references public.profiles(id) on delete cascade,
 body text not null check(char_length(body) between 1 and 500),
 created_at timestamptz not null default now()
);
create table if not exists public.story_views(
 id uuid primary key default gen_random_uuid(),
 story_id uuid not null references public.stories(id) on delete cascade,
 user_id uuid not null references public.profiles(id) on delete cascade,
 viewed_at timestamptz not null default now(),
 unique(story_id,user_id)
);
alter table public.story_likes enable row level security;
alter table public.story_comments enable row level security;
alter table public.story_views enable row level security;
drop policy if exists "story likes visible with story" on public.story_likes;
create policy "story likes visible with story" on public.story_likes for select to authenticated using(exists(select 1 from public.stories s where s.id=story_id and s.expires_at>now()));
drop policy if exists "users like visible stories" on public.story_likes;
create policy "users like visible stories" on public.story_likes for insert to authenticated with check(auth.uid()=user_id and exists(select 1 from public.stories s where s.id=story_id and s.expires_at>now()));
drop policy if exists "users remove own story likes" on public.story_likes;
create policy "users remove own story likes" on public.story_likes for delete to authenticated using(auth.uid()=user_id);
drop policy if exists "comments visible with story" on public.story_comments;
create policy "comments visible with story" on public.story_comments for select to authenticated using(exists(select 1 from public.stories s where s.id=story_id and s.expires_at>now()));
drop policy if exists "users comment on visible stories" on public.story_comments;
create policy "users comment on visible stories" on public.story_comments for insert to authenticated with check(auth.uid()=user_id and exists(select 1 from public.stories s where s.id=story_id and s.expires_at>now()));
drop policy if exists "users delete own story comments" on public.story_comments;
create policy "users delete own story comments" on public.story_comments for delete to authenticated using(auth.uid()=user_id);
drop policy if exists "story owners read viewers" on public.story_views;
create policy "story owners read viewers" on public.story_views for select to authenticated using(exists(select 1 from public.stories s where s.id=story_id and s.user_id=auth.uid()));
drop policy if exists "viewers record own story views" on public.story_views;
create policy "viewers record own story views" on public.story_views for insert to authenticated with check(auth.uid()=user_id and exists(select 1 from public.stories s where s.id=story_id and s.expires_at>now() and s.user_id<>auth.uid()));
drop policy if exists "viewers update own story views" on public.story_views;
create policy "viewers update own story views" on public.story_views for update to authenticated using(auth.uid()=user_id) with check(auth.uid()=user_id);

grant select,insert,delete on public.story_likes to authenticated;
grant select,insert,delete on public.story_comments to authenticated;
grant select,insert,update on public.story_views to authenticated;


do $$ begin alter publication supabase_realtime add table public.story_likes; exception when duplicate_object then null; end $$;
do $$ begin alter publication supabase_realtime add table public.story_comments; exception when duplicate_object then null; end $$;
do $$ begin alter publication supabase_realtime add table public.story_views; exception when duplicate_object then null; end $$;
