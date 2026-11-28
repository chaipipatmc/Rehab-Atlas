-- Allow the data_verifier agent to create agent_tasks rows.
-- /api/agents/data-verifier inserts agent_type='data_verifier' but the check
-- constraint (last set in 011_content_planner) never listed it, so every
-- insert failed with 23514. Values below = the live constraint (read from
-- pg_constraint 2026-11-28) + 'data_verifier'.
--
-- Rollback (only after confirming no rows use it:
--   SELECT count(*) FROM agent_tasks WHERE agent_type = 'data_verifier';):
--   ALTER TABLE agent_tasks DROP CONSTRAINT IF EXISTS agent_tasks_agent_type_check;
--   ALTER TABLE agent_tasks ADD CONSTRAINT agent_tasks_agent_type_check
--     CHECK (agent_type IN (
--       'center_admin', 'content_admin', 'follow_up', 'lead_verify',
--       'outreach_research', 'outreach_followup', 'outreach_response',
--       'outreach_agreement', 'outreach_activation', 'outreach_orchestrator',
--       'content_creator', 'content_scheduler', 'content_planner'
--     ));

ALTER TABLE agent_tasks DROP CONSTRAINT IF EXISTS agent_tasks_agent_type_check;
ALTER TABLE agent_tasks ADD CONSTRAINT agent_tasks_agent_type_check
  CHECK (agent_type IN (
    'center_admin', 'content_admin', 'follow_up', 'lead_verify',
    'outreach_research', 'outreach_followup', 'outreach_response',
    'outreach_agreement', 'outreach_activation', 'outreach_orchestrator',
    'content_creator', 'content_scheduler', 'content_planner',
    'data_verifier'
  ));
