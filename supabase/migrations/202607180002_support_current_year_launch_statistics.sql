alter table public.launch_statistics
  drop constraint if exists launch_statistics_singleton;

alter table public.launch_statistics
  add constraint launch_statistics_supported_period
  check (id in ('rolling-12-complete-months', 'current-calendar-year'));
