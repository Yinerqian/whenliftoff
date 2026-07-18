create table if not exists public.launch_statistics (
  id text primary key,
  period_start timestamptz not null,
  period_end timestamptz not null,
  generated_at timestamptz not null,
  total_launches integer not null check (total_launches >= 0),
  successful_launches integer not null check (successful_launches >= 0),
  failed_launches integer not null check (failed_launches >= 0),
  success_rate numeric(5, 2) not null check (success_rate >= 0 and success_rate <= 100),
  active_providers integer not null check (active_providers >= 0),
  active_countries integer not null check (active_countries >= 0),
  active_pads integer not null check (active_pads >= 0),
  monthly jsonb not null default '[]'::jsonb,
  providers jsonb not null default '[]'::jsonb,
  countries jsonb not null default '[]'::jsonb,
  rockets jsonb not null default '[]'::jsonb,
  constraint launch_statistics_singleton check (id = 'rolling-12-complete-months')
);

alter table public.launch_statistics enable row level security;

revoke all on table public.launch_statistics from anon, authenticated;
grant select, insert, update, delete on table public.launch_statistics to service_role;
