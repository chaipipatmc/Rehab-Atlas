-- Support multi-location organizations (e.g., New Life Rehab with 6 locations)
ALTER TABLE centers ADD COLUMN IF NOT EXISTS organization_name TEXT;

-- Index for sibling lookups
CREATE INDEX IF NOT EXISTS idx_centers_organization_name ON centers (organization_name) WHERE organization_name IS NOT NULL;
