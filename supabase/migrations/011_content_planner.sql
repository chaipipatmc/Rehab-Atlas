-- Content Calendar — planned topics for each day
CREATE TABLE IF NOT EXISTS content_calendar (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  planned_date    DATE NOT NULL,
  topic           TEXT NOT NULL,
  category        TEXT NOT NULL,
  brief           TEXT,                -- Short description of angle/focus
  keywords        TEXT[],              -- Target SEO keywords
  status          TEXT DEFAULT 'planned' CHECK (status IN ('planned', 'approved', 'writing', 'written', 'skipped')),
  page_id         UUID REFERENCES pages(id),  -- Links to the drafted article once written
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_content_calendar_date ON content_calendar(planned_date);
CREATE INDEX IF NOT EXISTS idx_content_calendar_status ON content_calendar(status);

ALTER TABLE content_calendar ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage content_calendar" ON content_calendar FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- Add content_planner to agent types
ALTER TABLE agent_tasks DROP CONSTRAINT IF EXISTS agent_tasks_agent_type_check;
ALTER TABLE agent_tasks ADD CONSTRAINT agent_tasks_agent_type_check
  CHECK (agent_type IN (
    'center_admin', 'content_admin', 'follow_up', 'lead_verify',
    'outreach_research', 'outreach_followup', 'outreach_response',
    'outreach_agreement', 'outreach_activation', 'outreach_orchestrator',
    'content_creator', 'content_scheduler', 'content_planner'
  ));

INSERT INTO site_settings (key, value) VALUES
  ('agent_content_planner_enabled', 'false')
ON CONFLICT (key) DO NOTHING;
