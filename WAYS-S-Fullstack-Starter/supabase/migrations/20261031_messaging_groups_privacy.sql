-- WAYS S group messaging, scheduled messages, chat reports and privacy controls
create table if not exists public.chat_groups (
 id uuid primary key default gen_random_uuid(),
 name text not null check(length(trim(name)) between 1 and 80),
 description text not null default '',
 avatar_url text,
 created_by uuid not null references auth.users(id) on delete cascade,
 invite_code text not null unique default encode(gen_random_bytes(12),'hex'),
 created_at timestamptz not null default now()
);
create table if not exists public.chat_group_members (
 group_id uuid not null references public.chat_groups(id) on delete cascade,
 user_id uuid not null references auth.users(id) on delete cascade,
 role text not null default 'member' check(role in ('admin','member')),
 joined_at timestamptz not null default now(),
 muted boolean not null default false,
 primary key(group_id,user_id)
);
create table if not exists public.group_messages (
 id uuid primary key default gen_random_uuid(),
 group_id uuid not null references public.chat_groups(id) on delete cascade,
 sender_id uuid not null references auth.users(id) on delete cascade,
 body text not null default '',
 message_type text not null default 'text',
 media_url text,
 reply_to uuid references public.group_messages(id) on delete set null,
 reactions jsonb not null default '{}'::jsonb,
 is_pinned boolean not null default false,
 created_at timestamptz not null default now()
);
create table if not exists public.scheduled_messages (
 id uuid primary key default gen_random_uuid(),
 sender_id uuid not null references auth.users(id) on delete cascade,
 receiver_id uuid not null references auth.users(id) on delete cascade,
 body text not null check(length(trim(body))>0),
 scheduled_at timestamptz not null,
 status text not null default 'scheduled' check(status in ('scheduled','sent','cancelled','failed')),
 created_at timestamptz not null default now(),
 check(scheduled_at > now())
);
create table if not exists public.chat_reports (
 id uuid primary key default gen_random_uuid(),
 reporter_id uuid not null references auth.users(id) on delete cascade,
 reported_user_id uuid references auth.users(id) on delete set null,
 group_id uuid references public.chat_groups(id) on delete set null,
 reason text not null,
 details text not null default '',
 created_at timestamptz not null default now(),
 check(reported_user_id is not null or group_id is not null)
);
create table if not exists public.message_privacy_settings (
 user_id uuid primary key references auth.users(id) on delete cascade,
 read_receipts boolean not null default true,
 activity_status boolean not null default true,
 allow_message_requests text not null default 'everyone' check(allow_message_requests in ('everyone','followers','nobody')),
 allow_group_invites text not null default 'everyone' check(allow_group_invites in ('everyone','followers','nobody')),
 story_replies boolean not null default true,
 notification_sound boolean not null default true,
 updated_at timestamptz not null default now()
);
alter table public.chat_groups enable row level security;
alter table public.chat_group_members enable row level security;
alter table public.group_messages enable row level security;
alter table public.scheduled_messages enable row level security;
alter table public.chat_reports enable row level security;
alter table public.message_privacy_settings enable row level security;
create schema if not exists private;
create or replace function private.is_chat_group_member(p_group_id uuid)
returns boolean language sql stable security definer set search_path=''
as $$ select exists(select 1 from public.chat_group_members m where m.group_id=p_group_id and m.user_id=auth.uid()) $$;
create or replace function private.is_chat_group_admin(p_group_id uuid)
returns boolean language sql stable security definer set search_path=''
as $$ select exists(select 1 from public.chat_group_members m where m.group_id=p_group_id and m.user_id=auth.uid() and m.role='admin') $$;
revoke all on function private.is_chat_group_member(uuid) from public;
revoke all on function private.is_chat_group_admin(uuid) from public;
grant usage on schema private to authenticated;
grant execute on function private.is_chat_group_member(uuid),private.is_chat_group_admin(uuid) to authenticated;
drop policy if exists "Members view own groups" on public.chat_groups;
create policy "Members view own groups" on public.chat_groups for select to authenticated using(private.is_chat_group_member(id));
drop policy if exists "Authenticated create groups" on public.chat_groups;
create policy "Authenticated create groups" on public.chat_groups for insert to authenticated with check(created_by=(select auth.uid()));
drop policy if exists "Group admins update groups" on public.chat_groups;
create policy "Group admins update groups" on public.chat_groups for update to authenticated using(private.is_chat_group_admin(id)) with check(private.is_chat_group_admin(id));
drop policy if exists "Members read group membership" on public.chat_group_members;
create policy "Members read group membership" on public.chat_group_members for select to authenticated using(private.is_chat_group_member(group_id));
drop policy if exists "Creator adds initial group members" on public.chat_group_members;
create policy "Creator adds initial group members" on public.chat_group_members for insert to authenticated with check((user_id=(select auth.uid()) and exists(select 1 from public.chat_groups g where g.id=group_id and g.created_by=(select auth.uid()))) or private.is_chat_group_admin(group_id));
drop policy if exists "Group admins manage members" on public.chat_group_members;
create policy "Group admins manage members" on public.chat_group_members for delete to authenticated using(user_id=(select auth.uid()) or private.is_chat_group_admin(group_id));
drop policy if exists "Group members send messages" on public.group_messages;
create policy "Group members send messages" on public.group_messages for insert to authenticated with check(sender_id=(select auth.uid()) and private.is_chat_group_member(group_messages.group_id));
drop policy if exists "Group members read messages" on public.group_messages;
create policy "Group members read messages" on public.group_messages for select to authenticated using(private.is_chat_group_member(group_id));
drop policy if exists "Group senders and admins update messages" on public.group_messages;
create policy "Group senders and admins update messages" on public.group_messages for update to authenticated using(sender_id=(select auth.uid()) or private.is_chat_group_admin(group_id)) with check(sender_id=(select auth.uid()) or private.is_chat_group_admin(group_id));
drop policy if exists "Users manage own scheduled messages" on public.scheduled_messages;
create policy "Users manage own scheduled messages" on public.scheduled_messages for all to authenticated using(sender_id=(select auth.uid())) with check(sender_id=(select auth.uid()));
drop policy if exists "Users submit chat reports" on public.chat_reports;
create policy "Users submit chat reports" on public.chat_reports for insert to authenticated with check(reporter_id=(select auth.uid()));
drop policy if exists "Users view own chat reports" on public.chat_reports;
create policy "Users view own chat reports" on public.chat_reports for select to authenticated using(reporter_id=(select auth.uid()));
drop policy if exists "Users manage own message privacy" on public.message_privacy_settings;
create policy "Users manage own message privacy" on public.message_privacy_settings for all to authenticated using(user_id=(select auth.uid())) with check(user_id=(select auth.uid()));
grant select,insert,update,delete on public.chat_groups,public.chat_group_members,public.group_messages,public.scheduled_messages,public.chat_reports,public.message_privacy_settings to authenticated;
create index if not exists group_messages_group_created_idx on public.group_messages(group_id,created_at);
create index if not exists scheduled_messages_due_idx on public.scheduled_messages(scheduled_at) where status='scheduled';
create or replace function public.join_chat_group_by_invite(p_invite_code text)
returns uuid language plpgsql security definer set search_path=''
as $$
declare v_group_id uuid;
begin
 if auth.uid() is null then raise exception 'Authentication required'; end if;
 select id into v_group_id from public.chat_groups where invite_code=p_invite_code;
 if v_group_id is null then raise exception 'Invalid invite'; end if;
 insert into public.chat_group_members(group_id,user_id,role) values(v_group_id,auth.uid(),'member') on conflict do nothing;
 return v_group_id;
end;
$$;
revoke all on function public.join_chat_group_by_invite(text) from public,anon;
grant execute on function public.join_chat_group_by_invite(text) to authenticated;
