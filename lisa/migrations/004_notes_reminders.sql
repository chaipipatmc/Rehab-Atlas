-- Freeform notes/reminders — things the owner asks Lisa to remember that
-- have no specific date/time (decisions, todos, ideas), recalled on demand.

create table if not exists lisa_notes (
  id uuid primary key default gen_random_uuid(),
  content text not null,
  category text not null default 'other' check (category in ('work', 'personal', 'other')),
  status text not null default 'open' check (status in ('open', 'done')),
  created_at timestamptz not null default now(),
  done_at timestamptz
);

create index if not exists lisa_notes_status_idx on lisa_notes (status, created_at desc);

alter table lisa_notes enable row level security;
