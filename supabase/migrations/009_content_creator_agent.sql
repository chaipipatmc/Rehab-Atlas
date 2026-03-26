-- Add content_creator to agent_tasks constraint
ALTER TABLE agent_tasks DROP CONSTRAINT IF EXISTS agent_tasks_agent_type_check;
ALTER TABLE agent_tasks ADD CONSTRAINT agent_tasks_agent_type_check
  CHECK (agent_type IN (
    'center_admin', 'content_admin', 'follow_up', 'lead_verify',
    'outreach_research', 'outreach_followup', 'outreach_response',
    'outreach_agreement', 'outreach_activation', 'outreach_orchestrator',
    'content_creator'
  ));

INSERT INTO site_settings (key, value) VALUES
  ('agent_content_creator_enabled', 'false')
ON CONFLICT (key) DO NOTHING;
