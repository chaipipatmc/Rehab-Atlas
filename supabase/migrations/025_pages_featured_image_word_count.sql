-- Performance: derived columns so list views (/blog, /) don't have to fetch
-- the full markdown `content` for every row just to compute the featured
-- image URL and read-time. Generated STORED columns stay in sync with
-- content automatically — no app-level write logic required.
ALTER TABLE pages
  ADD COLUMN IF NOT EXISTS featured_image_url TEXT GENERATED ALWAYS AS (
    (regexp_match(content, '!\[featured\]\(([^\s)]+)'))[1]
  ) STORED,
  ADD COLUMN IF NOT EXISTS word_count INTEGER GENERATED ALWAYS AS (
    array_length(regexp_split_to_array(coalesce(content, ''), '\s+'), 1)
  ) STORED;

-- Partial index: the /blog and / queries always filter
-- page_type='blog' AND status='published' ORDER BY published_at DESC,
-- so a covering partial index lets PostgreSQL avoid a table scan.
CREATE INDEX IF NOT EXISTS pages_blog_published_idx
  ON pages (page_type, status, published_at DESC)
  WHERE page_type = 'blog' AND status = 'published';
