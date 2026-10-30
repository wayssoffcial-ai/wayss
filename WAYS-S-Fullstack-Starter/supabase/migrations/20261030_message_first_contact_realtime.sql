-- First-contact message requests and realtime request inbox.
alter table public.message_requests add column if not exists initial_message text;
update public.message_requests set initial_message='Message request' where initial_message is null;
alter table public.message_requests alter column initial_message set not null;
do $$ begin
  alter publication supabase_realtime add table public.message_requests;
exception when duplicate_object then null;
end $$;

-- Replace the earlier permissive policies; policies on a table are ORed together.
drop policy if exists "participants read messages" on public.messages;
create policy "participants read messages" on public.messages
for select to authenticated
using (
 ((auth.uid()=messages.sender_id and not messages.deleted_for_sender) or (auth.uid()=messages.receiver_id and not messages.deleted_for_receiver))
 and not exists(select 1 from public.profile_blocks b where
   (b.blocker_id=messages.sender_id and b.blocked_id=messages.receiver_id) or
   (b.blocker_id=messages.receiver_id and b.blocked_id=messages.sender_id))
 and exists(select 1 from public.message_requests r where
   ((r.sender_id=messages.sender_id and r.receiver_id=messages.receiver_id) or
    (r.sender_id=messages.receiver_id and r.receiver_id=messages.sender_id))
   and r.status='accepted')
);
drop policy if exists "sender creates messages" on public.messages;
create policy "sender creates messages" on public.messages
for insert to authenticated
with check (
 auth.uid()=messages.sender_id
 and not exists(select 1 from public.profile_blocks b where
   (b.blocker_id=messages.sender_id and b.blocked_id=messages.receiver_id) or
   (b.blocker_id=messages.receiver_id and b.blocked_id=messages.sender_id))
 and exists(select 1 from public.message_requests r where
   ((r.sender_id=messages.sender_id and r.receiver_id=messages.receiver_id) or
    (r.sender_id=messages.receiver_id and r.receiver_id=messages.sender_id))
   and r.status='accepted')
);

-- Calls are available only to people whose message request was accepted.
drop policy if exists "call participants access calls" on public.voice_video_calls;
create policy "call participants access calls" on public.voice_video_calls
for select to authenticated
using (
 (auth.uid()=caller_id or auth.uid()=callee_id)
 and exists(select 1 from public.message_requests r where
  ((r.sender_id=voice_video_calls.caller_id and r.receiver_id=voice_video_calls.callee_id) or
   (r.sender_id=voice_video_calls.callee_id and r.receiver_id=voice_video_calls.caller_id))
  and r.status='accepted')
);
drop policy if exists "caller starts calls" on public.voice_video_calls;
create policy "caller starts calls" on public.voice_video_calls
for insert to authenticated
with check (
 auth.uid()=caller_id
 and not exists(select 1 from public.profile_blocks b where
  (b.blocker_id=voice_video_calls.caller_id and b.blocked_id=voice_video_calls.callee_id) or
  (b.blocker_id=voice_video_calls.callee_id and b.blocked_id=voice_video_calls.caller_id))
 and exists(select 1 from public.message_requests r where
  ((r.sender_id=voice_video_calls.caller_id and r.receiver_id=voice_video_calls.callee_id) or
   (r.sender_id=voice_video_calls.callee_id and r.receiver_id=voice_video_calls.caller_id))
  and r.status='accepted')
);
drop policy if exists "callee or caller updates calls" on public.voice_video_calls;
create policy "callee or caller updates calls" on public.voice_video_calls
for update to authenticated
using (
 (auth.uid()=caller_id or auth.uid()=callee_id)
 and exists(select 1 from public.message_requests r where
  ((r.sender_id=voice_video_calls.caller_id and r.receiver_id=voice_video_calls.callee_id) or
   (r.sender_id=voice_video_calls.callee_id and r.receiver_id=voice_video_calls.caller_id))
  and r.status='accepted')
)
with check (auth.uid()=caller_id or auth.uid()=callee_id);
