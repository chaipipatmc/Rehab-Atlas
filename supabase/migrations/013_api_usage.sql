-- Track API usage and costs across all platform integrations
CREATE TABLE api_usage (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service         TEXT NOT NULL,            -- 'anthropic', 'unsplash', 'gmail', 'resend', 'pandadoc'
  agent_type      TEXT,                     -- which agent made the call (nullable for non-agent calls)
  operation       TEXT NOT NULL,            -- e.g. 'article_generation', 'email_draft', 'research', 'sentiment_analysis'
  model           TEXT,                     -- e.g. 'claude-sonnet-4-20250514'
  input_tokens    INTEGER DEFAULT 0,
  output_tokens   INTEGER DEFAULT 0,
  total_tokens    INTEGER DEFAULT 0,
  cost_usd        NUMERIC(10,6) DEFAULT 0, -- estimated cost in USD
  metadata        JSONB,                   -- extra info (center name, article title, etc.)
  created_at      TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_api_usage_service ON api_usage(service);
CREATE INDEX idx_api_usage_created ON api_usage(created_at);
CREATE INDEX idx_api_usage_agent ON api_usage(agent_type);

-- RLS: only admins can read
ALTER TABLE api_usage ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read api_usage"
  ON api_usage FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Service role can insert (agents run with service role)
CREATE POLICY "Service role can insert api_usage"
  ON api_usage FOR INSERT
  WITH CHECK (true);
