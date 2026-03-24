-- Center staff/team members
-- Run this in your Supabase SQL Editor

CREATE TABLE IF NOT EXISTS center_staff (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  center_id   UUID NOT NULL REFERENCES centers(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  position    TEXT NOT NULL,
  credentials TEXT,
  photo_url   TEXT,
  bio         TEXT,
  sort_order  INTEGER DEFAULT 0,
  created_at  TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_center_staff_center ON center_staff(center_id);

-- RLS
ALTER TABLE center_staff ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read staff of published centers"
  ON center_staff FOR SELECT
  USING (center_id IN (SELECT id FROM centers WHERE status = 'published'));

CREATE POLICY "Admins can manage staff"
  ON center_staff FOR ALL
  USING (get_user_role() = 'admin')
  WITH CHECK (get_user_role() = 'admin');

-- Allow partners to manage their own center's staff
CREATE POLICY "Partners can manage own center staff"
  ON center_staff FOR ALL
  USING (center_id IN (SELECT center_id FROM profiles WHERE id = auth.uid() AND role = 'partner'))
  WITH CHECK (center_id IN (SELECT center_id FROM profiles WHERE id = auth.uid() AND role = 'partner'));
