-- Fix: ensure 'approved' status is allowed (in case migration 010 wasn't applied)
ALTER TABLE pages DROP CONSTRAINT IF EXISTS pages_status_check;
ALTER TABLE pages ADD CONSTRAINT pages_status_check
  CHECK (status IN ('draft', 'approved', 'published'));

-- Add tags column for blog filtering
ALTER TABLE pages ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}';

CREATE INDEX IF NOT EXISTS idx_pages_tags ON pages USING GIN (tags);
