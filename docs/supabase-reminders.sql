create extension if not exists pgcrypto;

create table if not exists reminder_devices (
  device_id text primary key,
  secret_hash text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists reminders (
  id uuid primary key default gen_random_uuid(),
  device_id text not null references reminder_devices(device_id) on delete cascade,
  encrypted_title text not null,
  title_iv text not null,
  encrypted_note text,
  note_iv text,
  scheduled_for timestamptz not null,
  next_trigger_at timestamptz not null,
  repeat_rule text not null default 'once',
  category text not null default 'personal',
  notification_sound text not null default 'default',
  voice_preferred boolean not null default false,
  time_zone text not null default 'UTC',
  active boolean not null default true,
  action_token text not null,
  last_triggered_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists reminders_device_idx on reminders(device_id);
create index if not exists reminders_next_trigger_idx on reminders(next_trigger_at) where active = true;

create table if not exists reminder_push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  device_id text not null references reminder_devices(device_id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  user_agent text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists reminder_push_device_idx on reminder_push_subscriptions(device_id);
