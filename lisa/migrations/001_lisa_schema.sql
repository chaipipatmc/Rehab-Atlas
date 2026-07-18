-- Lisa (LINE calendar assistant) schema
-- Run this in the Supabase SQL editor (same project as Rehab-Atlas is fine —
-- all tables are prefixed lisa_ and are service-role only).

create table if not exists lisa_settings (
  key text primary key,
  value text,
  updated_at timestamptz not null default now()
);

create table if not exists lisa_contacts (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  nickname text,
  email text not null unique,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists lisa_locations (
  id uuid primary key default gen_random_uuid(),
  alias text not null unique,
  full_name text not null,
  created_at timestamptz not null default now()
);

create table if not exists lisa_messages (
  id bigint generated always as identity primary key,
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  created_at timestamptz not null default now()
);

create index if not exists lisa_messages_created_at_idx on lisa_messages (created_at desc);

create table if not exists lisa_pending_actions (
  id uuid primary key default gen_random_uuid(),
  action_type text not null,
  payload jsonb not null,
  status text not null default 'pending' check (status in ('pending', 'done', 'cancelled')),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null
);

create table if not exists lisa_reminded_events (
  event_id text not null,
  start_time timestamptz not null,
  reminded_at timestamptz not null default now(),
  primary key (event_id, start_time)
);

-- Service-role only: enable RLS with no policies (anon/authenticated get nothing).
alter table lisa_settings enable row level security;
alter table lisa_contacts enable row level security;
alter table lisa_locations enable row level security;
alter table lisa_messages enable row level security;
alter table lisa_pending_actions enable row level security;
alter table lisa_reminded_events enable row level security;

-- Seed the owner's regular locations (update full names to the real place names,
-- or just tell Lisa in chat: "จำไว้ TP office คือ ...").
insert into lisa_locations (alias, full_name) values
  ('tp office', 'TP Office'),
  ('fab office', 'Fab Office'),
  ('aqua office', 'Aqua Office')
on conflict (alias) do nothing;
