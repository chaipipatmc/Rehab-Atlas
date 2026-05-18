-- ============================================
-- 026: Data Verifier Agent — verification fields
-- ============================================
-- Adds provenance + verification tracking to center_photos so the data_verifier
-- agent can distinguish photos that were matched against the center's official
-- website (or judged plausible by Claude Vision) from photos that look like
-- stock/unrelated content.
--
-- Adds a top-level data_verification_status on centers so we can quickly
-- filter "centers whose facts were cross-checked against their website" vs
-- raw imported data.
--
-- centers.last_verified already exists (001_initial_schema.sql) — reused.

ALTER TABLE center_photos
  ADD COLUMN IF NOT EXISTS verification_status TEXT NOT NULL DEFAULT 'unverified'
    CHECK (verification_status IN ('unverified', 'verified', 'suspicious')),
  ADD COLUMN IF NOT EXISTS source_url TEXT,
  ADD COLUMN IF NOT EXISTS image_sha256 TEXT,
  ADD COLUMN IF NOT EXISTS last_verified_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS verification_notes TEXT;

CREATE INDEX IF NOT EXISTS idx_center_photos_verification
  ON center_photos(verification_status);

ALTER TABLE centers
  ADD COLUMN IF NOT EXISTS data_verification_status TEXT NOT NULL DEFAULT 'unverified'
    CHECK (data_verification_status IN ('unverified', 'verified', 'issues_found', 'no_website')),
  ADD COLUMN IF NOT EXISTS data_verification_issues JSONB;

CREATE INDEX IF NOT EXISTS idx_centers_data_verification
  ON centers(data_verification_status, last_verified);
