-- ============================================
-- RehabAtlas Outreach Pipeline — Database Tables
-- Automated partner acquisition: research → outreach → follow-up → agreement → activation
-- ============================================

-- ── Pipeline State Machine ──
-- Tracks each center's journey through the partner recruitment pipeline

CREATE TABLE IF NOT EXISTS outreach_pipeline (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  center_id             UUID NOT NULL REFERENCES centers(id) ON DELETE CASCADE,

  -- Pipeline state
  stage                 TEXT NOT NULL DEFAULT 'new'
    CHECK (stage IN (
      'new', 'researching', 'research_complete', 'outreach_drafted',
      'outreach_sent', 'followed_up', 'responded', 'negotiating', 'terms_agreed',
      'agreement_drafted', 'agreement_sent', 'agreement_signed', 'active',
      'stalled', 'declined'
    )),

  -- Research data (populated by Research Agent)
  research_data         JSONB,
  research_completed_at TIMESTAMPTZ,

  -- Outreach tracking
  outreach_email_id     TEXT,           -- Gmail message ID
  outreach_thread_id    TEXT,           -- Gmail thread ID for reply threading
  outreach_persona      TEXT DEFAULT 'Sarah',
  outreach_sent_at      TIMESTAMPTZ,

  -- Follow-up tracking
  follow_up_count       INTEGER DEFAULT 0,
  last_follow_up_at     TIMESTAMPTZ,
  next_follow_up_at     TIMESTAMPTZ,

  -- Response tracking
  responded_at          TIMESTAMPTZ,
  response_summary      TEXT,
  response_sentiment    TEXT CHECK (response_sentiment IN ('positive', 'neutral', 'negative', 'question')),

  -- Commission negotiation
  proposed_commission_rate   NUMERIC(5,2) DEFAULT 12.00,
  agreed_commission_rate     NUMERIC(5,2),
  agreed_commission_type     TEXT DEFAULT 'percentage' CHECK (agreed_commission_type IN ('percentage', 'fixed', 'none')),
  blog_tier                  TEXT CHECK (blog_tier IN ('none', 'standard', 'premium')),
  special_terms              TEXT,

  -- Agreement / e-signature
  agreement_document_url     TEXT,
  esign_envelope_id          TEXT,       -- PandaDoc document ID
  esign_status               TEXT CHECK (esign_status IN (
    'draft', 'sent', 'viewed', 'center_signed', 'owner_signed', 'completed', 'declined', 'expired'
  )),
  agreement_sent_at          TIMESTAMPTZ,
  agreement_signed_at        TIMESTAMPTZ,

  -- Meta
  assigned_to           TEXT DEFAULT 'outreach_orchestrator',
  notes                 TEXT,
  created_at            TIMESTAMPTZ DEFAULT now(),
  updated_at            TIMESTAMPTZ DEFAULT now(),

  -- One pipeline entry per center
  UNIQUE(center_id)
);

CREATE INDEX IF NOT EXISTS idx_outreach_pipeline_stage ON outreach_pipeline(stage);
CREATE INDEX IF NOT EXISTS idx_outreach_pipeline_center ON outreach_pipeline(center_id);
CREATE INDEX IF NOT EXISTS idx_outreach_pipeline_followup ON outreach_pipeline(next_follow_up_at)
  WHERE stage IN ('outreach_sent', 'followed_up');
CREATE INDEX IF NOT EXISTS idx_outreach_pipeline_updated ON outreach_pipeline(updated_at DESC);


-- ── Email Audit Trail ──
-- Every email sent or received in the outreach process

CREATE TABLE IF NOT EXISTS outreach_emails (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pipeline_id       UUID NOT NULL REFERENCES outreach_pipeline(id) ON DELETE CASCADE,
  center_id         UUID REFERENCES centers(id),

  direction         TEXT NOT NULL CHECK (direction IN ('outbound', 'inbound')),
  gmail_message_id  TEXT,
  gmail_thread_id   TEXT,

  from_email        TEXT NOT NULL,
  to_email          TEXT NOT NULL,
  subject           TEXT NOT NULL,
  body_text         TEXT,
  body_html         TEXT,

  email_type        TEXT NOT NULL CHECK (email_type IN (
    'initial_outreach', 'follow_up_1', 'follow_up_2', 'follow_up_3',
    'response', 'negotiation', 'agreement_notice', 'confirmation', 'custom'
  )),

  sent_at           TIMESTAMPTZ DEFAULT now(),
  created_at        TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_outreach_emails_pipeline ON outreach_emails(pipeline_id);
CREATE INDEX IF NOT EXISTS idx_outreach_emails_thread ON outreach_emails(gmail_thread_id);
CREATE INDEX IF NOT EXISTS idx_outreach_emails_center ON outreach_emails(center_id);


-- ── Monthly Blog Counts ──
-- Tracks approved partner blog posts per month for commission tier calculation

CREATE TABLE IF NOT EXISTS outreach_blog_counts (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  center_id         UUID NOT NULL REFERENCES centers(id) ON DELETE CASCADE,
  year_month        TEXT NOT NULL,        -- Format: '2026-03'
  approved_count    INTEGER DEFAULT 0,
  tier              TEXT CHECK (tier IN ('none', 'standard', 'premium')),
  effective_rate    NUMERIC(5,2),
  calculated_at     TIMESTAMPTZ DEFAULT now(),

  UNIQUE(center_id, year_month)
);

CREATE INDEX IF NOT EXISTS idx_blog_counts_center ON outreach_blog_counts(center_id);
CREATE INDEX IF NOT EXISTS idx_blog_counts_month ON outreach_blog_counts(year_month);


-- ── RLS: Admin-only access (via service role) ──

ALTER TABLE outreach_pipeline ENABLE ROW LEVEL SECURITY;
ALTER TABLE outreach_emails ENABLE ROW LEVEL SECURITY;
ALTER TABLE outreach_blog_counts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage outreach_pipeline" ON outreach_pipeline FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "Admins can manage outreach_emails" ON outreach_emails FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "Admins can manage outreach_blog_counts" ON outreach_blog_counts FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));


-- ── Update agent_tasks to accept new outreach agent types ──

ALTER TABLE agent_tasks DROP CONSTRAINT IF EXISTS agent_tasks_agent_type_check;
ALTER TABLE agent_tasks ADD CONSTRAINT agent_tasks_agent_type_check
  CHECK (agent_type IN (
    'center_admin', 'content_admin', 'follow_up', 'lead_verify',
    'outreach_research', 'outreach_followup', 'outreach_response',
    'outreach_agreement', 'outreach_activation', 'outreach_orchestrator'
  ));


-- ── Default settings: all outreach agents OFF ──

INSERT INTO site_settings (key, value) VALUES
  ('agent_outreach_research_enabled', 'false'),
  ('agent_outreach_followup_enabled', 'false'),
  ('agent_outreach_response_enabled', 'false'),
  ('agent_outreach_agreement_enabled', 'false'),
  ('agent_outreach_activation_enabled', 'false'),
  ('agent_outreach_orchestrator_enabled', 'false'),
  ('outreach_daily_email_limit', '20'),
  ('outreach_persona_name', 'Sarah')
ON CONFLICT (key) DO NOTHING;


-- ── Auto-update updated_at trigger for outreach_pipeline ──

CREATE OR REPLACE FUNCTION update_outreach_pipeline_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_outreach_pipeline_updated_at
  BEFORE UPDATE ON outreach_pipeline
  FOR EACH ROW
  EXECUTE FUNCTION update_outreach_pipeline_updated_at();
