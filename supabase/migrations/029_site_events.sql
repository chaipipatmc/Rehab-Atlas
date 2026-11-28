-- Aggregate funnel events (counts only) written by /api/pageview.
-- No session id, user agent, IP or visitor-entered text is stored here.
--
-- Rollback:
--   DROP TABLE IF EXISTS public.site_events;

CREATE TABLE IF NOT EXISTS public.site_events (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event       TEXT NOT NULL CHECK (event IN ('cta_assessment_click', 'assessment_step1_start')),
  path        TEXT,
  country     TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_site_events_event_created
  ON public.site_events (event, created_at);

-- Written only by the service role (bypasses RLS); readable by admins.
ALTER TABLE public.site_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read site_events"
  ON public.site_events FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));
