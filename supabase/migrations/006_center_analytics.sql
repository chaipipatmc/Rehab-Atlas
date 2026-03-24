-- ============================================
-- RehabAtlas Center Analytics — Daily Aggregates
-- ============================================

CREATE TABLE IF NOT EXISTS center_analytics (
  id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  center_id       UUID NOT NULL REFERENCES centers(id) ON DELETE CASCADE,
  event_date      DATE NOT NULL DEFAULT CURRENT_DATE,
  profile_views   INTEGER NOT NULL DEFAULT 0,
  card_clicks     INTEGER NOT NULL DEFAULT 0,
  inquiry_clicks  INTEGER NOT NULL DEFAULT 0,
  UNIQUE (center_id, event_date)
);

CREATE INDEX IF NOT EXISTS idx_center_analytics_lookup
  ON center_analytics(center_id, event_date DESC);

-- Atomic upsert-increment function (no race conditions)
CREATE OR REPLACE FUNCTION increment_center_stat(p_center_id UUID, p_stat TEXT)
RETURNS VOID AS $$
BEGIN
  INSERT INTO center_analytics (center_id, event_date, profile_views, card_clicks, inquiry_clicks)
  VALUES (
    p_center_id,
    CURRENT_DATE,
    CASE WHEN p_stat = 'profile_view' THEN 1 ELSE 0 END,
    CASE WHEN p_stat = 'card_click' THEN 1 ELSE 0 END,
    CASE WHEN p_stat = 'inquiry_click' THEN 1 ELSE 0 END
  )
  ON CONFLICT (center_id, event_date) DO UPDATE SET
    profile_views   = center_analytics.profile_views   + CASE WHEN p_stat = 'profile_view' THEN 1 ELSE 0 END,
    card_clicks     = center_analytics.card_clicks     + CASE WHEN p_stat = 'card_click' THEN 1 ELSE 0 END,
    inquiry_clicks  = center_analytics.inquiry_clicks  + CASE WHEN p_stat = 'inquiry_click' THEN 1 ELSE 0 END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RLS: admin-only reads (all writes go through SECURITY DEFINER function)
ALTER TABLE center_analytics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read all analytics" ON center_analytics FOR SELECT
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));
