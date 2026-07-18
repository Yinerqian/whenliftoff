alter table public.launches
  add column if not exists details jsonb;

alter table public.sync_runs
  add column if not exists sync_mode text not null default 'full',
  add column if not exists metadata jsonb not null default '{}'::jsonb;

alter table public.sync_runs
  drop constraint if exists sync_runs_sync_mode_check;

alter table public.sync_runs
  add constraint sync_runs_sync_mode_check
  check (sync_mode in ('full', 'hot'));

update public.sync_runs
set
  status = 'failed',
  completed_at = coalesce(completed_at, now()),
  error_message = coalesce(error_message, 'Expired before realtime sync locking was enabled')
where status = 'running';

create unique index if not exists sync_runs_one_running_per_source_idx
  on public.sync_runs (source)
  where status = 'running';

create index if not exists launches_hot_sync_window_idx
  on public.launches (launch_time_utc, synced_at)
  where launch_time_utc is not null;
