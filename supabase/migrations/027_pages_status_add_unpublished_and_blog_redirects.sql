-- "unpublished" is a fourth page status, distinct from "draft" (never been
-- public): used for articles that were live but have since been taken down,
-- e.g. duplicates that were merged into a canonical sibling. Keeping them
-- under their own status lets admin tools surface them separately.
ALTER TABLE pages DROP CONSTRAINT IF EXISTS pages_status_check;
ALTER TABLE pages
  ADD CONSTRAINT pages_status_check
  CHECK (status IN ('draft', 'approved', 'published', 'unpublished'));

-- 301/308 redirects for blog slugs that no longer resolve. The /blog/[slug]
-- page checks this table when a slug isn't found among published rows and
-- issues a permanentRedirect to target_slug — preserving SEO link equity
-- when we merge near-duplicate articles via the dedup cleanup.
CREATE TABLE IF NOT EXISTS blog_redirects (
  slug TEXT PRIMARY KEY,
  target_slug TEXT NOT NULL,
  reason TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS blog_redirects_target_idx ON blog_redirects (target_slug);
