create table if not exists public.post_views(
 id uuid primary key default gen_random_uuid(),
 post_id uuid not null references public.posts(id) on delete cascade,
 user_id uuid not null references public.profiles(id) on delete cascade,
 viewed_at timestamptz not null default now(),
 unique(post_id,user_id)
);
alter table public.post_views enable row level security;
drop policy if exists "post owners read views" on public.post_views;
create policy "post owners read views" on public.post_views for select to authenticated using(exists(select 1 from public.posts p where p.id=post_id and p.user_id=auth.uid()));
drop policy if exists "users record own post views" on public.post_views;
create policy "users record own post views" on public.post_views for insert to authenticated with check(auth.uid()=user_id and exists(select 1 from public.posts p where p.id=post_id and p.user_id<>auth.uid()));
drop policy if exists "users update own post views" on public.post_views;
create policy "users update own post views" on public.post_views for update to authenticated using(auth.uid()=user_id) with check(auth.uid()=user_id);
grant select,insert,update on public.post_views to authenticated;
do $$ begin alter publication supabase_realtime add table public.post_views; exception when duplicate_object then null; end $$;
