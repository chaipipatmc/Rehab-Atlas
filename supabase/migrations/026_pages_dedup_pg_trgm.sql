-- Duplicate detection for blog content. Two-tier strategy:
--   (1) Postgres pg_trgm trigram similarity on title — fast, free, every check
--   (2) Claude semantic judge — only invoked when trigram suggests overlap
-- Decisions and reasoning are persisted on the draft so admin can review and
-- override false positives at /admin/content.

CREATE EXTENSION IF NOT EXISTS pg_trgm;

ALTER TABLE pages
  ADD COLUMN IF NOT EXISTS dedup_status TEXT
    CHECK (dedup_status IN ('clear', 'flagged', 'overridden', 'pending'))
    DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS dedup_closest_slug TEXT,
  ADD COLUMN IF NOT EXISTS dedup_reasoning TEXT,
  ADD COLUMN IF NOT EXISTS dedup_retry_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS dedup_checked_at TIMESTAMPTZ;

-- All existing published articles are the baseline.
UPDATE pages
SET dedup_status = 'clear'
WHERE page_type = 'blog'
  AND status = 'published'
  AND (dedup_status IS NULL OR dedup_status = 'pending');

CREATE INDEX IF NOT EXISTS pages_title_trgm_idx
  ON pages USING GIN (title gin_trgm_ops);

-- RPC: return the top-N published blog titles most similar to a candidate
-- title, with their trigram similarity score. exclude_id lets us skip a
-- row by id so we can check a draft against everything except itself.
CREATE OR REPLACE FUNCTION find_similar_published_titles(
  query_title TEXT,
  max_results INTEGER DEFAULT 5,
  exclude_id UUID DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  slug TEXT,
  title TEXT,
  meta_description TEXT,
  published_at TIMESTAMPTZ,
  trigram_similarity REAL
)
LANGUAGE SQL
STABLE
AS $$
  SELECT
    p.id,
    p.slug,
    p.title,
    p.meta_description,
    p.published_at,
    similarity(p.title, query_title) AS trigram_similarity
  FROM pages p
  WHERE p.page_type = 'blog'
    AND p.status = 'published'
    AND (exclude_id IS NULL OR p.id <> exclude_id)
  ORDER BY similarity(p.title, query_title) DESC
  LIMIT max_results;
$$;
