-- ============================================
-- RehabAtlas Agent System — Database Tables
-- ============================================

-- Central task queue for all agents
CREATE TABLE IF NOT EXISTS agent_tasks (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_type      TEXT NOT NULL CHECK (agent_type IN ('center_admin', 'content_admin', 'follow_up', 'lead_verify')),
  entity_type     TEXT NOT NULL,
  entity_id       UUID NOT NULL,

  -- Agent analysis output
  status          TEXT NOT NULL DEFAULT 'pending' CHECK (status IN (
    'pending', 'processing', 'awaiting_owner', 'approved', 'rejected', 'expired', 'error'
  )),
  checklist       JSONB,
  ai_summary      TEXT,
  ai_recommendation TEXT CHECK (ai_recommendation IN ('approve', 'reject', 'needs_info')),
  confidence      NUMERIC(3,2),

  -- Owner action
  action_token    TEXT UNIQUE,
  token_expires   TIMESTAMPTZ,
  owner_decision  TEXT CHECK (owner_decision IN ('approved', 'rejected', 'needs_info')),
  owner_note      TEXT,
  decided_at      TIMESTAMPTZ,

  -- Metadata
  retry_count     INTEGER DEFAULT 0,
  error_message   TEXT,
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now(),
  completed_at    TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_agent_tasks_status ON agent_tasks(status);
CREATE INDEX IF NOT EXISTS idx_agent_tasks_type ON agent_tasks(agent_type);
CREATE INDEX IF NOT EXISTS idx_agent_tasks_token ON agent_tasks(action_token);
CREATE INDEX IF NOT EXISTS idx_agent_tasks_entity ON agent_tasks(entity_type, entity_id);

-- Follow-up sequence tracking
CREATE TABLE IF NOT EXISTS agent_follow_ups (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type     TEXT NOT NULL,
  entity_id       UUID NOT NULL,
  target_user_id  UUID,
  target_email    TEXT NOT NULL,

  reason          TEXT NOT NULL,
  message_sent    TEXT,

  attempt_number  INTEGER DEFAULT 1,
  max_attempts    INTEGER DEFAULT 3,
  status          TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'completed', 'abandoned')),

  next_follow_up  TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT now(),
  responded_at    TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_follow_ups_next ON agent_follow_ups(next_follow_up) WHERE status = 'sent';
CREATE INDEX IF NOT EXISTS idx_follow_ups_entity ON agent_follow_ups(entity_type, entity_id);

-- Audit trail for all agent actions
CREATE TABLE IF NOT EXISTS agent_log (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_type      TEXT NOT NULL,
  task_id         UUID REFERENCES agent_tasks(id),
  action          TEXT NOT NULL,
  details         JSONB,
  created_at      TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_agent_log_task ON agent_log(task_id);
CREATE INDEX IF NOT EXISTS idx_agent_log_type ON agent_log(agent_type, created_at DESC);

-- Site settings (key-value store for agent toggles + admin settings)
CREATE TABLE IF NOT EXISTS site_settings (
  key             TEXT PRIMARY KEY,
  value           TEXT,
  updated_at      TIMESTAMPTZ DEFAULT now()
);

-- Default: all agents OFF (manual mode)
INSERT INTO site_settings (key, value) VALUES
  ('agent_center_admin_enabled', 'false'),
  ('agent_content_admin_enabled', 'false'),
  ('agent_follow_up_enabled', 'false'),
  ('agent_lead_verify_enabled', 'false')
ON CONFLICT (key) DO NOTHING;

-- RLS: agent tables are admin-only (accessed via service role)
ALTER TABLE agent_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_follow_ups ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage agent_tasks" ON agent_tasks FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "Admins can manage agent_follow_ups" ON agent_follow_ups FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "Admins can manage agent_log" ON agent_log FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

ALTER TABLE site_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage site_settings" ON site_settings FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));
