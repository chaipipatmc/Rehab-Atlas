CREATE TABLE IF NOT EXISTS saved_centers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  center_id UUID NOT NULL REFERENCES centers(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, center_id)
);

CREATE INDEX idx_saved_centers_user ON saved_centers(user_id);

ALTER TABLE saved_centers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own saves"
  ON saved_centers FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
