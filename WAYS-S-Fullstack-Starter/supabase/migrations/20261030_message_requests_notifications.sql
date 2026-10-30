create table if not exists public.message_requests(
 id uuid primary key default gen_random_uuid(),
 sender_id uuid not null references public.profiles(id) on delete cascade,
 receiver_id uuid not null references public.profiles(id) on delete cascade,
 status text not null default 'pending' check(status in ('pending','accepted','declined')),
 initial_message text not null check(char_length(initial_message) between 1 and 1000),
 created_at timestamptz not null default now(),
 unique(sender_id,receiver_id),
 check(sender_id<>receiver_id)
);
alter table public.message_requests enable row level security;
drop policy if exists "participants read message requests" on public.message_requests;
create policy "participants read message requests" on public.message_requests for select to authenticated using(auth.uid()=sender_id or auth.uid()=receiver_id);
drop policy if exists "sender creates message requests" on public.message_requests;
create policy "sender creates message requests" on public.message_requests for insert to authenticated with check(auth.uid()=sender_id and status='pending');
drop policy if exists "receiver reviews message requests" on public.message_requests;
create policy "receiver reviews message requests" on public.message_requests for update to authenticated using(auth.uid()=receiver_id and status='pending') with check(auth.uid()=receiver_id and status in ('accepted','declined'));
create or replace function public.wayss_notify_follow() returns trigger language plpgsql security definer set search_path=public as $$ begin insert into public.notifications(user_id,actor_id,type,entity_id) values(new.following_id,new.follower_id,'follow',new.id); return new; end; $$;
drop trigger if exists wayss_follow_notification on public.follows;
create trigger wayss_follow_notification after insert on public.follows for each row execute procedure public.wayss_notify_follow();
create or replace function public.wayss_notify_like() returns trigger language plpgsql security definer set search_path=public as $$ declare owner_id uuid; begin select user_id into owner_id from public.posts where id=new.post_id; if owner_id is not null and owner_id<>new.user_id then insert into public.notifications(user_id,actor_id,type,entity_id) values(owner_id,new.user_id,'like',new.post_id); end if; return new; end; $$;
drop trigger if exists wayss_like_notification on public.likes;
create trigger wayss_like_notification after insert on public.likes for each row execute procedure public.wayss_notify_like();
create or replace function public.wayss_notify_message_request() returns trigger language plpgsql security definer set search_path=public as $$ begin insert into public.notifications(user_id,actor_id,type,entity_id) values(new.receiver_id,new.sender_id,'message',new.id); return new; end; $$;
drop trigger if exists wayss_message_request_notification on public.message_requests;
create trigger wayss_message_request_notification after insert on public.message_requests for each row execute procedure public.wayss_notify_message_request();
drop policy if exists "participants read messages" on public.messages;
create policy "participants read messages" on public.messages for select to authenticated using((auth.uid()=sender_id or auth.uid()=receiver_id) and exists(select 1 from public.message_requests r where (r.sender_id=sender_id and r.receiver_id=receiver_id or r.sender_id=receiver_id and r.receiver_id=sender_id) and r.status='accepted'));
drop policy if exists "sender creates messages" on public.messages;
create policy "sender creates messages" on public.messages for insert to authenticated with check(auth.uid()=sender_id and exists(select 1 from public.message_requests r where ((r.sender_id=sender_id and r.receiver_id=receiver_id) or (r.sender_id=receiver_id and r.receiver_id=sender_id)) and r.status='accepted'));
