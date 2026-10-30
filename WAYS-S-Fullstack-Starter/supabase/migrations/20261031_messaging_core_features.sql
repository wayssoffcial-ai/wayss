alter table public.messages
  add column if not exists edited_at timestamptz,
  add column if not exists reply_to uuid references public.messages(id) on delete set null,
  add column if not exists forwarded_from uuid references public.messages(id) on delete set null,
  add column if not exists is_pinned boolean not null default false,
  add column if not exists reactions jsonb not null default '{}'::jsonb,
  add column if not exists expires_at timestamptz,
  add column if not exists is_disappearing boolean not null default false;
create table if not exists public.chat_preferences (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  peer_id uuid not null references auth.users(id) on delete cascade,
  is_starred boolean not null default false,
  is_muted boolean not null default false,
  is_archived boolean not null default false,
  is_hidden boolean not null default false,
  mark_unread boolean not null default false,
  theme text not null default 'default',
  accent_color text not null default '#F32950',
  wallpaper text,
  quick_reaction text not null default '❤️',
  nickname text,
  read_receipts boolean not null default true,
  disappearing_seconds integer,
  updated_at timestamptz not null default now(),
  unique(user_id, peer_id), check(user_id <> peer_id),
  check(disappearing_seconds is null or disappearing_seconds in (86400,604800,2592000))
);
alter table public.chat_preferences enable row level security;
drop policy if exists "Users manage own chat preferences" on public.chat_preferences;
create policy "Users manage own chat preferences" on public.chat_preferences for all to authenticated
 using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
grant select,insert,update,delete on public.chat_preferences to authenticated;
create index if not exists messages_reply_to_idx on public.messages(reply_to);
create index if not exists messages_expires_at_idx on public.messages(expires_at) where expires_at is not null;