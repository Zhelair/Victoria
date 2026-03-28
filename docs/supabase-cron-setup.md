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

`VAPID_SUBJECT` can be either:

- a website URL, for example `https://victoria-eight.vercel.app`
- or an email, for example `mailto:you@example.com`

For Victoria right now, using your deployed app URL is totally fine.

## 2. Run the schema SQL in Supabase

Open Supabase SQL Editor and run:

- [`01-reminders-schema.sql`](./01-reminders-schema.sql)

That creates:

- `reminder_devices`
- `reminders`
- `reminder_push_subscriptions`

## 3. Run the cron SQL in Supabase

Open [`02-reminders-cron.sql`](./02-reminders-cron.sql), replace:

- `https://your-vercel-domain.vercel.app`
- `YOUR_CRON_SECRET_FROM_VERCEL`

Then run the whole file in Supabase SQL Editor.

That file does all of this for you:

- enables `pg_cron`
- enables `pg_net`
- stores the app URL in Supabase Vault
- stores your `CRON_SECRET` in Supabase Vault
- creates the every-minute reminder cron job

If you later move to a custom domain, update the stored app URL and recreate the cron job.

## 4. Verify the cron job

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

## 5. Manual test

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
- If you only use Victoria in a normal web tab, reminders are most reliable while the browser is open.
- For real closed-app reminders, the best path is the installed PWA with notifications allowed.
