create extension if not exists pg_cron;
create extension if not exists pg_net;

select vault.create_secret('https://your-vercel-domain.vercel.app', 'victoria_app_url');
select vault.create_secret('YOUR_CRON_SECRET_FROM_VERCEL', 'victoria_cron_secret');

select
  cron.schedule(
    'victoria-reminder-dispatch',
    '* * * * *',
    $$
    select
      net.http_get(
        url := (select decrypted_secret from vault.decrypted_secrets where name = 'victoria_app_url')
          || '/api/reminders/dispatch',
        headers := jsonb_build_object(
          'Authorization',
          'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'victoria_cron_secret')
        )
      );
    $$
  );
