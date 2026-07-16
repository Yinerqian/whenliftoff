create table if not exists public.news_items (
  content_type text not null,
  external_id bigint not null,
  title text not null,
  title_cn text,
  summary text,
  summary_cn text,
  authors jsonb not null default '[]'::jsonb,
  original_url text not null,
  image_url text,
  news_site text not null,
  published_at timestamptz not null,
  api_updated_at timestamptz not null,
  featured boolean not null default false,
  related_launch_ids uuid[] not null default '{}'::uuid[],
  related_event_ids bigint[] not null default '{}'::bigint[],
  source_blocks jsonb not null default '[]'::jsonb,
  body_cn_blocks jsonb not null default '[]'::jsonb,
  metadata_hash text,
  content_hash text,
  translated_block_count integer not null default 0,
  translation_status text not null default 'pending',
  processing_error text,
  last_attempted_at timestamptz,
  created_at timestamptz not null default now(),
  synced_at timestamptz not null default now(),
  constraint news_items_pkey primary key (content_type, external_id),
  constraint news_items_content_type_check check (content_type in ('article', 'blog', 'report')),
  constraint news_items_translation_status_check check (
    translation_status in ('pending', 'extracting', 'translating', 'complete', 'summary_only', 'failed')
  ),
  constraint news_items_translated_count_check check (translated_block_count >= 0)
);

create index if not exists news_items_published_idx
  on public.news_items (published_at desc, content_type asc, external_id desc);

create index if not exists news_items_processing_idx
  on public.news_items (translation_status, published_at desc)
  where translation_status in ('pending', 'extracting', 'translating', 'failed');

alter table public.news_items enable row level security;

revoke all on table public.news_items from anon, authenticated;
grant select, insert, update, delete on table public.news_items to service_role;

