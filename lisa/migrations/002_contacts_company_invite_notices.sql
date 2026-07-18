-- Contacts: related company; Invitations: notification/decision tracking

alter table lisa_contacts add column if not exists company text;

create table if not exists lisa_invite_notices (
  event_id text primary key,
  notified_at timestamptz not null default now(),
  decision text,
  decided_at timestamptz
);

alter table lisa_invite_notices enable row level security;
