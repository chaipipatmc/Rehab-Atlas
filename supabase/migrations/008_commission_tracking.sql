-- ============================================
-- RehabAtlas Commission Tracking
-- Lead outcome tracking + monthly commission reports
-- ============================================

-- ── Add partner outcome tracking to lead_forwards ──

ALTER TABLE lead_forwards ADD COLUMN IF NOT EXISTS partner_status TEXT DEFAULT 'pending'
  CHECK (partner_status IN ('pending', 'admitted', 'not_admitted'));
ALTER TABLE lead_forwards ADD COLUMN IF NOT EXISTS partner_status_updated_at TIMESTAMPTZ;
ALTER TABLE lead_forwards ADD COLUMN IF NOT EXISTS treatment_fee NUMERIC(12,2);
ALTER TABLE lead_forwards ADD COLUMN IF NOT EXISTS commission_rate NUMERIC(5,2);
ALTER TABLE lead_forwards ADD COLUMN IF NOT EXISTS commission_amount NUMERIC(12,2);

-- Allow partners to read and update their own forwarded leads
CREATE POLICY "Partners can view their forwarded leads"
  ON lead_forwards FOR SELECT
  USING (
    center_id IN (
      SELECT center_id FROM profiles WHERE id = auth.uid() AND role = 'partner'
    )
  );

CREATE POLICY "Partners can update outcome of their leads"
  ON lead_forwards FOR UPDATE
  USING (
    center_id IN (
      SELECT center_id FROM profiles WHERE id = auth.uid() AND role = 'partner'
    )
  )
  WITH CHECK (
    center_id IN (
      SELECT center_id FROM profiles WHERE id = auth.uid() AND role = 'partner'
    )
  );

-- Allow partners to read lead details for forwarded leads
CREATE POLICY "Partners can view leads forwarded to them"
  ON leads FOR SELECT
  USING (
    id IN (
      SELECT lead_id FROM lead_forwards
      WHERE center_id IN (
        SELECT center_id FROM profiles WHERE id = auth.uid() AND role = 'partner'
      )
    )
  );


-- ── Monthly Commission Reports ──

CREATE TABLE IF NOT EXISTS commission_reports (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  center_id       UUID NOT NULL REFERENCES centers(id) ON DELETE CASCADE,
  year_month      TEXT NOT NULL,           -- '2026-03'

  -- Summary
  total_leads_forwarded   INTEGER DEFAULT 0,
  total_admitted           INTEGER DEFAULT 0,
  total_not_admitted       INTEGER DEFAULT 0,
  total_pending            INTEGER DEFAULT 0,

  -- Financial
  commission_rate          NUMERIC(5,2),    -- effective rate for this month
  total_treatment_fees     NUMERIC(12,2) DEFAULT 0,
  total_commission         NUMERIC(12,2) DEFAULT 0,
  currency                 TEXT DEFAULT 'USD',

  -- Payment
  payment_status           TEXT DEFAULT 'pending'
    CHECK (payment_status IN ('pending', 'invoiced', 'paid', 'overdue', 'waived')),
  payment_due_date         DATE,
  payment_received_date    DATE,
  payment_notes            TEXT,
  invoice_number           TEXT,

  -- Meta
  generated_at             TIMESTAMPTZ DEFAULT now(),
  updated_at               TIMESTAMPTZ DEFAULT now(),

  UNIQUE(center_id, year_month)
);

CREATE INDEX IF NOT EXISTS idx_commission_reports_center ON commission_reports(center_id);
CREATE INDEX IF NOT EXISTS idx_commission_reports_month ON commission_reports(year_month);
CREATE INDEX IF NOT EXISTS idx_commission_reports_status ON commission_reports(payment_status);

-- RLS
ALTER TABLE commission_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage commission_reports" ON commission_reports FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "Partners can view their commission reports" ON commission_reports FOR SELECT
  USING (
    center_id IN (
      SELECT center_id FROM profiles WHERE id = auth.uid() AND role = 'partner'
    )
  );
