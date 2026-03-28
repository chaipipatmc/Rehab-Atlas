-- Site-wide page views tracking
CREATE TABLE page_views (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  path        TEXT NOT NULL,
  referrer    TEXT,
  user_agent  TEXT,
  country     TEXT,
  created_at  TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_page_views_created ON page_views(created_at);
CREATE INDEX idx_page_views_path ON page_views(path);

ALTER TABLE page_views ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read page_views"
  ON page_views FOR SELECT
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "Service role can insert page_views"
  ON page_views FOR INSERT
  WITH CHECK (true);

-- Newsletter subscribers
CREATE TABLE newsletter_subscribers (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email       TEXT UNIQUE NOT NULL,
  status      TEXT DEFAULT 'active' CHECK (status IN ('active', 'unsubscribed')),
  source      TEXT DEFAULT 'footer',
  created_at  TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_newsletter_email ON newsletter_subscribers(email);

ALTER TABLE newsletter_subscribers ENABLE ROW LEVEL SECURITY;

-- Admins can read
CREATE POLICY "Admins can read subscribers"
  ON newsletter_subscribers FOR SELECT
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- Service role can insert
CREATE POLICY "Service role can insert subscribers"
  ON newsletter_subscribers FOR INSERT
  WITH CHECK (true);
