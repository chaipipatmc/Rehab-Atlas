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
