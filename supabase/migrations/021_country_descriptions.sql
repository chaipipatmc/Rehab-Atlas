CREATE TABLE IF NOT EXISTS country_descriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  country_slug TEXT UNIQUE NOT NULL,
  country_name TEXT NOT NULL,
  description TEXT,
  highlights JSONB,
  generated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE country_descriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read country_descriptions"
  ON country_descriptions FOR SELECT USING (true);

CREATE POLICY "Service role can manage country_descriptions"
  ON country_descriptions FOR ALL WITH CHECK (true);
