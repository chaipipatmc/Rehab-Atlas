-- Blog author fields for partner-submitted content
-- Run this in your Supabase SQL Editor

ALTER TABLE pages ADD COLUMN IF NOT EXISTS author_type TEXT DEFAULT 'rehabatlas';
ALTER TABLE pages ADD COLUMN IF NOT EXISTS author_name TEXT;
ALTER TABLE pages ADD COLUMN IF NOT EXISTS author_center_id UUID REFERENCES centers(id);
ALTER TABLE pages ADD COLUMN IF NOT EXISTS submitted_by UUID REFERENCES auth.users(id);

-- author_type: 'rehabatlas' (our team) or 'partner' (center-written)
-- author_name: display name of the author
-- author_center_id: linked center for backlink (partner articles only)
-- submitted_by: user who submitted the article
