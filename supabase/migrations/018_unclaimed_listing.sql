-- Add unclaimed listing flag to centers
ALTER TABLE centers ADD COLUMN IF NOT EXISTS is_unclaimed BOOLEAN DEFAULT false;
ALTER TABLE centers ADD COLUMN IF NOT EXISTS unclaimed_note TEXT DEFAULT 'Data sourced from public records';
