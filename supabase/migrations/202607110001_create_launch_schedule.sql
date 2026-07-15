create schema if not exists extensions;
create extension if not exists pg_trgm with schema extensions;

create table if not exists public.launches (
  external_id uuid primary key,
  slug text not null,
  name text not null,
  name_cn text,
  mission_description text,
  mission_description_cn text,
  provider text,
  provider_cn text,
  rocket_name text,
  status text not null default 'TBD',
  status_cn text not null default '时间待定',
  launch_time_utc timestamptz,
  window_end_utc timestamptz,
  location text,
  location_cn text,
  country_code text,
  pad text,
  image_url text,
  webcast_url text,
  source_url text,
  api_updated_at timestamptz,
  translation_hash text,
  synced_at timestamptz not null default now()
);

create unique index if not exists launches_slug_key on public.launches (slug);
create index if not exists launches_time_idx on public.launches (launch_time_utc asc nulls last);
create index if not exists launches_status_idx on public.launches (status);
create index if not exists launches_provider_idx on public.launches (provider);
create index if not exists launches_country_idx on public.launches (country_code);
create index if not exists launches_name_trgm_idx on public.launches using gin (name gin_trgm_ops);
create index if not exists launches_name_cn_trgm_idx on public.launches using gin (name_cn gin_trgm_ops);
create index if not exists launches_rocket_trgm_idx on public.launches using gin (rocket_name gin_trgm_ops);
create index if not exists launches_location_trgm_idx on public.launches using gin (location gin_trgm_ops);

create table if not exists public.sync_runs (
  id uuid primary key default gen_random_uuid(),
  source text not null,
  status text not null check (status in ('running', 'success', 'failed')),
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  records_processed integer not null default 0,
  translations_processed integer not null default 0,
  error_message text
);

create index if not exists sync_runs_source_completed_idx on public.sync_runs (source, completed_at desc);

alter table public.launches enable row level security;
alter table public.sync_runs enable row level security;
