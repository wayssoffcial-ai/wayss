insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values('ways-chat','ways-chat',false,15728640,array['image/jpeg','image/png','image/webp','image/gif']) on conflict(id) do nothing;
drop policy if exists "chat participants upload private media" on storage.objects;
create policy "chat participants upload private media" on storage.objects for insert to authenticated with check(bucket_id='ways-chat' and (storage.foldername(name))[1]=auth.uid()::text);
drop policy if exists "chat participants read private media" on storage.objects;
create policy "chat participants read private media" on storage.objects for select to authenticated using(bucket_id='ways-chat' and ((storage.foldername(name))[1]=auth.uid()::text or (storage.foldername(name))[2]=auth.uid()::text));
drop policy if exists "chat senders delete private media" on storage.objects;
create policy "chat senders delete private media" on storage.objects for delete to authenticated using(bucket_id='ways-chat' and (storage.foldername(name))[1]=auth.uid()::text);
