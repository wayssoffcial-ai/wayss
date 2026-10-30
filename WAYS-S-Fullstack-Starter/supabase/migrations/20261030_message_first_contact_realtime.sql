-- First-contact message requests and realtime request inbox.
alter table public.message_requests add column if not exists initial_message text;
update public.message_requests set initial_message='Message request' where initial_message is null;
alter table public.message_requests alter column initial_message set not null;
do $$ begin
  alter publication supabase_realtime add table public.message_requests;
exception when duplicate_object then null;
end $$;

-- Keep chat rows inaccessible until one participant accepts the request.
drop policy if exists "participants read messages" on public.messages;
create policy "participants read messages" on public.messages
for select to authenticated
using (
  (auth.uid() = messages.sender_id or auth.uid() = messages.receiver_id)
  and exists (
    select 1 from public.message_requests r
    where ((r.sender_id = messages.sender_id and r.receiver_id = messages.receiver_id)
       or (r.sender_id = messages.receiver_id and r.receiver_id = messages.sender_id))
      and r.status = 'accepted'
  )
);
drop policy if exists "sender creates messages" on public.messages;
create policy "sender creates messages" on public.messages
for insert to authenticated
with check (
  auth.uid() = messages.sender_id
  and exists (
    select 1 from public.message_requests r
    where ((r.sender_id = messages.sender_id and r.receiver_id = messages.receiver_id)
       or (r.sender_id = messages.receiver_id and r.receiver_id = messages.sender_id))
      and r.status = 'accepted'
  )
);
