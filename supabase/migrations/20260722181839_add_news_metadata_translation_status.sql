alter table public.news_items
  add column if not exists metadata_translation_status text not null default 'pending',
  add column if not exists metadata_translation_error text,
  add column if not exists metadata_translation_attempted_at timestamptz;

alter table public.news_items
  drop constraint if exists news_items_metadata_translation_status_check,
  drop constraint if exists news_items_metadata_translation_complete_check;

alter table public.news_items
  add constraint news_items_metadata_translation_status_check check (
    metadata_translation_status in ('pending', 'translating', 'complete', 'failed')
  );

update public.news_items
set metadata_translation_status = case
  when nullif(btrim(title_cn), '') is not null
    and (summary is null or nullif(btrim(summary_cn), '') is not null)
    then 'complete'
  else 'pending'
end;

alter table public.news_items
  add constraint news_items_metadata_translation_complete_check check (
    metadata_translation_status <> 'complete'
    or (
      nullif(btrim(title_cn), '') is not null
      and (summary is null or nullif(btrim(summary_cn), '') is not null)
    )
  );

create index if not exists news_items_public_cn_idx
  on public.news_items (published_at desc, content_type asc, external_id desc)
  where metadata_translation_status = 'complete';

create index if not exists news_items_metadata_translation_queue_idx
  on public.news_items (metadata_translation_status, published_at desc)
  where metadata_translation_status in ('pending', 'failed');

revoke all on table public.news_items from anon, authenticated;
grant select, insert, update, delete on table public.news_items to service_role;
