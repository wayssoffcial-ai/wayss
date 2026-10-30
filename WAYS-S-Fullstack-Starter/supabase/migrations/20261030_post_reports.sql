create table if not exists public.post_reports(id uuid primary key default gen_random_uuid(),reporter_id uuid not null references public.profiles(id) on delete cascade,post_id uuid not null references public.posts(id) on delete cascade,reason text not null,status text not null default 'open' check(status in ('open','reviewing','resolved','dismissed')),created_at timestamptz not null default now(),unique(reporter_id,post_id));
alter table public.post_reports enable row level security;
drop policy if exists "users create post reports" on public.post_reports;
create policy "users create post reports" on public.post_reports for insert to authenticated with check(auth.uid()=reporter_id);
drop policy if exists "reporters read own post reports" on public.post_reports;
create policy "reporters read own post reports" on public.post_reports for select to authenticated using(auth.uid()=reporter_id);
create or replace function public.admin_review_post_report(report_id uuid,next_status text) returns void language plpgsql security definer set search_path=public as $$ begin if not public.is_wayss_admin() then raise exception 'Admin permission required'; end if; if next_status not in ('reviewing','resolved','dismissed') then raise exception 'Invalid report status'; end if; update public.post_reports set status=next_status where id=report_id; end; $$;
revoke all on function public.admin_review_post_report(uuid,text) from public,anon;
grant execute on function public.admin_review_post_report(uuid,text) to authenticated;
