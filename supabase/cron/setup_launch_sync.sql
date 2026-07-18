-- Run after the schema migration and the application deployment have completed.
-- The two named Vault secrets must exist before this script is executed.

create extension if not exists pg_cron with schema pg_catalog;
create extension if not exists pg_net with schema extensions;

select cron.unschedule(jobid)
from cron.job
where jobname in ('whenliftoff-launch-hot', 'whenliftoff-launch-full');

select cron.schedule(
  'whenliftoff-launch-hot',
  '*/9 * * * *',
  $job$
    select net.http_get(
      url := rtrim((select decrypted_secret from vault.decrypted_secrets where name = 'whenliftoff_base_url'), '/') || '/api/cron/sync-launches',
      params := jsonb_build_object('mode', 'hot'),
      headers := jsonb_build_object(
        'Authorization',
        'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'whenliftoff_cron_secret')
      ),
      timeout_milliseconds := 55000
    ) as request_id;
  $job$
);

select cron.schedule(
  'whenliftoff-launch-full',
  '5 0 * * *',
  $job$
    select net.http_get(
      url := rtrim((select decrypted_secret from vault.decrypted_secrets where name = 'whenliftoff_base_url'), '/') || '/api/cron/sync-launches',
      params := jsonb_build_object('mode', 'full'),
      headers := jsonb_build_object(
        'Authorization',
        'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'whenliftoff_cron_secret')
      ),
      timeout_milliseconds := 55000
    ) as request_id;
  $job$
);
