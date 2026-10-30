alter table public.chat_preferences add column if not exists inbox_category text not null default 'primary' check (inbox_category in ('primary','general'));
create index if not exists chat_preferences_inbox_category_idx on public.chat_preferences(user_id,inbox_category);
