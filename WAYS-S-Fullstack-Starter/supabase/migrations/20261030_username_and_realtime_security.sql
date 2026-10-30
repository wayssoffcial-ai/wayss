create or replace function public.is_username_available(candidate text) returns boolean language sql stable security definer set search_path=public as $$ select candidate ~ '^[a-z0-9_]{3,30}$' and not exists(select 1 from public.profiles p where lower(p.username)=lower(candidate)); $$;
revoke all on function public.is_username_available(text) from public;
grant execute on function public.is_username_available(text) to anon,authenticated;
create unique index if not exists profiles_username_lower_uidx on public.profiles(lower(username));
do $$ begin
 if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='voice_video_calls') then alter publication supabase_realtime add table public.voice_video_calls; end if;
 if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='call_signals') then alter publication supabase_realtime add table public.call_signals; end if;
end $$;
