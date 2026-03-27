-- Add 'approved' status to pages for content pool scheduling
ALTER TABLE pages DROP CONSTRAINT IF EXISTS pages_status_check;
ALTER TABLE pages ADD CONSTRAINT pages_status_check
  CHECK (status IN ('draft', 'approved', 'published'));

-- Add content_scheduler to agent_tasks
ALTER TABLE agent_tasks DROP CONSTRAINT IF EXISTS agent_tasks_agent_type_check;
ALTER TABLE agent_tasks ADD CONSTRAINT agent_tasks_agent_type_check
  CHECK (agent_type IN (
    'center_admin', 'content_admin', 'follow_up', 'lead_verify',
    'outreach_research', 'outreach_followup', 'outreach_response',
    'outreach_agreement', 'outreach_activation', 'outreach_orchestrator',
    'content_creator', 'content_scheduler'
  ));

INSERT INTO site_settings (key, value) VALUES
  ('agent_content_scheduler_enabled', 'false')
ON CONFLICT (key) DO NOTHING;
