-- Durable rate limiting for public API routes.
--
-- The previous in-memory limiter resets on every serverless cold start /
-- instance switch on Vercel, so limits were trivially bypassed. This table +
-- atomic RPC give a shared fixed-window counter across all instances.
--
-- Accessed exclusively through the service-role client (src/lib/rate-limit.ts).
-- RLS is enabled with no policies so anon/authenticated roles have no access.

create table if not exists rate_limits (
  key text primary key,
  count integer not null default 1,
  reset_at timestamptz not null
);

alter table rate_limits enable row level security;

create index if not exists rate_limits_reset_at_idx on rate_limits (reset_at);

-- Atomic hit counter: starts a new window when the old one expired, otherwise
-- increments. Returns the state AFTER this hit; callers allow the request when
-- count <= p_limit.
create or replace function rate_limit_hit(
  p_key text,
  p_limit integer,
  p_window_seconds integer
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_now timestamptz := now();
  v_count integer;
  v_reset timestamptz;
begin
  insert into rate_limits as rl (key, count, reset_at)
  values (p_key, 1, v_now + make_interval(secs => p_window_seconds))
  on conflict (key) do update
    set count = case when rl.reset_at < v_now then 1 else rl.count + 1 end,
        reset_at = case
          when rl.reset_at < v_now then v_now + make_interval(secs => p_window_seconds)
          else rl.reset_at
        end
  returning count, reset_at into v_count, v_reset;

  -- Opportunistic garbage collection (~1% of calls)
  if random() < 0.01 then
    delete from rate_limits where reset_at < v_now - interval '1 day';
  end if;

  return jsonb_build_object(
    'allowed', v_count <= p_limit,
    'remaining', greatest(p_limit - v_count, 0),
    'reset_at', (extract(epoch from v_reset) * 1000)::bigint
  );
end;
$$;

-- Only the service role may execute
revoke execute on function rate_limit_hit(text, integer, integer) from public, anon, authenticated;
grant execute on function rate_limit_hit(text, integer, integer) to service_role;
