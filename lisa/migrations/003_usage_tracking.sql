-- Token usage logging for the weekly cost summary

create table if not exists lisa_usage (
  id bigint generated always as identity primary key,
  model text not null,
  input_tokens integer not null default 0,
  output_tokens integer not null default 0,
  cache_creation_tokens integer not null default 0,
  cache_read_tokens integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists lisa_usage_created_at_idx on lisa_usage (created_at desc);

alter table lisa_usage enable row level security;
