# Supabase Cron Setup For Victoria Reminders

Victoria can stay on Vercel Hobby for app hosting. Use Supabase Cron to trigger the existing reminder dispatch endpoint every minute.

## 1. Add env vars in Vercel

Set these in Vercel Project Settings -> Environment Variables:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `NEXT_PUBLIC_VAPID_PUBLIC_KEY`
- `VAPID_PRIVATE_KEY`
- `VAPID_SUBJECT`
- `CRON_SECRET`

Only `NEXT_PUBLIC_VAPID_PUBLIC_KEY` is intentionally exposed to the browser. The rest stay server-side.

## 2. Run the schema SQL in Supabase

Open Supabase SQL Editor and run:

- [`docs/supabase-reminders.sql`](/C:/Users/niksa/OneDrive/Documents/GitHub/NEW%20PROJECTS/Victoria/docs/supabase-reminders.sql)

That creates:

- `reminder_devices`
- `reminders`
- `reminder_push_subscriptions`

## 3. Store cron secrets in Supabase Vault

Run this in Supabase SQL Editor, replacing the example values:

```sql
select vault.create_secret('https://your-vercel-domain.vercel.app', 'victoria_app_url');
select vault.create_secret('YOUR_CRON_SECRET_FROM_VERCEL', 'victoria_cron_secret');
```

If you later move to a custom domain, update the stored app URL.

## 4. Enable the needed extensions

Supabase Cron uses `pg_cron`. HTTP calls use `pg_net`.

Run:

```sql
create extension if not exists pg_cron;
create extension if not exists pg_net;
```

## 5. Create the every-minute cron job

Run:

```sql
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
```

This calls the existing dispatch route once per minute.

## 6. Verify the cron job

You can inspect jobs with:

```sql
select jobid, jobname, schedule, active
from cron.job
order by jobid desc;
```

And recent runs with:

```sql
select jobid, status, return_message, start_time, end_time
from cron.job_run_details
order by start_time desc
limit 20;
```

## 7. Manual test

After deploying:

1. Install the PWA on Android.
2. Enable notifications in Victoria.
3. Create a reminder for 2-3 minutes ahead.
4. Close the app.
5. Check Supabase Cron run details.
6. Confirm the push notification appears.

## Notes

- This path avoids Vercel Pro cron costs.
- Closed-app reminders still require push permission plus browser/platform support.
- The dispatch route already protects itself with `CRON_SECRET`.
