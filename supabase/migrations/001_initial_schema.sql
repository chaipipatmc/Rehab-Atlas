-- RehabAtlas MVP Database Schema
-- Run this in your Supabase SQL Editor

-- ============================================
-- 1. CENTERS
-- ============================================
CREATE TABLE centers (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug            TEXT UNIQUE NOT NULL,
  name            TEXT NOT NULL,
  description     TEXT,
  short_description TEXT,

  -- Location
  address         TEXT,
  city            TEXT,
  state_province  TEXT,
  country         TEXT NOT NULL,
  latitude        DOUBLE PRECISION,
  longitude       DOUBLE PRECISION,

  -- Contact
  phone           TEXT,
  email           TEXT,
  website_url     TEXT,
  inquiry_email   TEXT,

  -- Clinical (arrays)
  treatment_focus TEXT[] DEFAULT '{}',
  conditions      TEXT[] DEFAULT '{}',
  substance_use   TEXT[] DEFAULT '{}',
  services        TEXT[] DEFAULT '{}',
  treatment_methods TEXT[] DEFAULT '{}',
  setting_type    TEXT,
  program_length  TEXT,
  languages       TEXT[] DEFAULT '{english}',

  -- Pricing
  pricing_text    TEXT,
  price_min       INTEGER,
  price_max       INTEGER,
  insurance       TEXT[] DEFAULT '{}',
  has_detox       BOOLEAN DEFAULT false,

  -- Staff
  clinical_director TEXT,
  medical_director  TEXT,

  -- Accreditation & External Rating
  accreditation   TEXT[] DEFAULT '{}',
  rating          NUMERIC(2,1),
  review_count    INTEGER DEFAULT 0,
  review_summary  TEXT,

  -- Editorial Ratings (admin-only, 1-5 scale)
  editorial_overall      NUMERIC(2,1),
  editorial_staff        NUMERIC(2,1),
  editorial_facility     NUMERIC(2,1),
  editorial_program      NUMERIC(2,1),
  editorial_privacy      NUMERIC(2,1),
  editorial_value        NUMERIC(2,1),

  -- Commercial / Business
  verified_profile    BOOLEAN DEFAULT false,
  trusted_partner     BOOLEAN DEFAULT false,
  referral_eligible   BOOLEAN DEFAULT false,
  is_featured         BOOLEAN DEFAULT false,
  is_sponsored        BOOLEAN DEFAULT false,
  agreement_status    TEXT DEFAULT 'none' CHECK (agreement_status IN ('none','pending','active','expired')),

  -- Status
  status          TEXT DEFAULT 'draft' CHECK (status IN ('draft','published','archived')),
  occupancy       TEXT,

  -- Metadata
  source_url      TEXT,
  last_verified   TIMESTAMPTZ,
  notes           TEXT,
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now(),
  created_by      UUID REFERENCES auth.users(id),
  updated_by      UUID REFERENCES auth.users(id)
);

CREATE INDEX idx_centers_country ON centers(country);
CREATE INDEX idx_centers_city ON centers(city);
CREATE INDEX idx_centers_status ON centers(status);
CREATE INDEX idx_centers_slug ON centers(slug);
CREATE INDEX idx_centers_treatment_focus ON centers USING GIN(treatment_focus);
CREATE INDEX idx_centers_services ON centers USING GIN(services);
CREATE INDEX idx_centers_conditions ON centers USING GIN(conditions);
CREATE INDEX idx_centers_insurance ON centers USING GIN(insurance);

-- ============================================
-- 2. CENTER PHOTOS
-- ============================================
CREATE TABLE center_photos (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  center_id   UUID NOT NULL REFERENCES centers(id) ON DELETE CASCADE,
  url         TEXT NOT NULL,
  alt_text    TEXT,
  sort_order  INTEGER DEFAULT 0,
  is_primary  BOOLEAN DEFAULT false,
  created_at  TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_center_photos_center ON center_photos(center_id);

-- ============================================
-- 3. CENTER FAQS
-- ============================================
CREATE TABLE center_faqs (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  center_id   UUID NOT NULL REFERENCES centers(id) ON DELETE CASCADE,
  question    TEXT NOT NULL,
  answer      TEXT NOT NULL,
  sort_order  INTEGER DEFAULT 0
);

CREATE INDEX idx_center_faqs_center ON center_faqs(center_id);

-- ============================================
-- 4. PROFILES (linked to Supabase Auth)
-- ============================================
CREATE TABLE profiles (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role        TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('admin','partner','user')),
  full_name   TEXT,
  email       TEXT,
  center_id   UUID REFERENCES centers(id),
  created_at  TIMESTAMPTZ DEFAULT now(),
  updated_at  TIMESTAMPTZ DEFAULT now()
);

-- Auto-create profile on user signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, role)
  VALUES (NEW.id, NEW.email, 'user');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ============================================
-- 5. CENTER EDIT REQUESTS
-- ============================================
CREATE TABLE center_edit_requests (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  center_id   UUID NOT NULL REFERENCES centers(id) ON DELETE CASCADE,
  submitted_by UUID NOT NULL REFERENCES auth.users(id),
  changes     JSONB NOT NULL,
  status      TEXT DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  reviewed_by UUID REFERENCES auth.users(id),
  review_note TEXT,
  created_at  TIMESTAMPTZ DEFAULT now(),
  reviewed_at TIMESTAMPTZ
);

CREATE INDEX idx_edit_requests_center ON center_edit_requests(center_id);
CREATE INDEX idx_edit_requests_status ON center_edit_requests(status);

-- ============================================
-- 6. ASSESSMENTS
-- ============================================
CREATE TABLE assessments (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id      TEXT NOT NULL,
  user_id         UUID REFERENCES auth.users(id),
  answers         JSONB NOT NULL,
  matched_center_ids UUID[],
  match_scores    JSONB,
  explanations    JSONB,
  urgency_level   TEXT,
  completed       BOOLEAN DEFAULT false,
  created_at      TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_assessments_session ON assessments(session_id);

-- ============================================
-- 7. LEADS (Critical - admin only access)
-- ============================================
CREATE TABLE leads (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Contact
  name            TEXT NOT NULL,
  email           TEXT NOT NULL,
  phone           TEXT,
  country         TEXT,

  -- Inquiry details
  who_for         TEXT,
  age_range       TEXT,
  concern         TEXT,
  urgency         TEXT CHECK (urgency IN ('not_urgent','soon','urgent')),
  preferred_center_id UUID REFERENCES centers(id),
  budget          TEXT,
  message         TEXT,
  consent         BOOLEAN NOT NULL DEFAULT false,
  request_call    BOOLEAN DEFAULT false,

  -- Linked data
  assessment_id   UUID REFERENCES assessments(id),
  source_page     TEXT,

  -- Admin workflow
  status          TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new','under_review','awaiting_info','ready_to_forward','forwarded','closed')),
  assigned_to     UUID REFERENCES auth.users(id),
  admin_notes     TEXT,

  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_leads_status ON leads(status);
CREATE INDEX idx_leads_created ON leads(created_at DESC);

-- ============================================
-- 8. LEAD FORWARDS (Audit log)
-- ============================================
CREATE TABLE lead_forwards (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id     UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  center_id   UUID NOT NULL REFERENCES centers(id),
  forwarded_by UUID NOT NULL REFERENCES auth.users(id),
  method      TEXT DEFAULT 'email',
  notes       TEXT,
  created_at  TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_lead_forwards_lead ON lead_forwards(lead_id);

-- ============================================
-- 9. PAGES (CMS)
-- ============================================
CREATE TABLE pages (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug        TEXT UNIQUE NOT NULL,
  title       TEXT NOT NULL,
  content     TEXT,
  page_type   TEXT NOT NULL CHECK (page_type IN ('static','blog','legal','faq')),
  status      TEXT DEFAULT 'draft' CHECK (status IN ('draft','published')),
  meta_title  TEXT,
  meta_description TEXT,
  created_at  TIMESTAMPTZ DEFAULT now(),
  updated_at  TIMESTAMPTZ DEFAULT now(),
  published_at TIMESTAMPTZ,
  created_by  UUID REFERENCES auth.users(id)
);

CREATE INDEX idx_pages_slug ON pages(slug);
CREATE INDEX idx_pages_type ON pages(page_type);

-- ============================================
-- 10. SITE FAQS
-- ============================================
CREATE TABLE site_faqs (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question    TEXT NOT NULL,
  answer      TEXT NOT NULL,
  category    TEXT,
  sort_order  INTEGER DEFAULT 0,
  published   BOOLEAN DEFAULT true
);

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

-- Helper function to get user role
CREATE OR REPLACE FUNCTION get_user_role()
RETURNS TEXT AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- CENTERS
ALTER TABLE centers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read published centers"
  ON centers FOR SELECT
  USING (status = 'published');

CREATE POLICY "Admins can do everything with centers"
  ON centers FOR ALL
  USING (get_user_role() = 'admin')
  WITH CHECK (get_user_role() = 'admin');

CREATE POLICY "Partners can read own center"
  ON centers FOR SELECT
  USING (
    id IN (SELECT center_id FROM profiles WHERE id = auth.uid() AND role = 'partner')
  );

-- CENTER PHOTOS
ALTER TABLE center_photos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read photos of published centers"
  ON center_photos FOR SELECT
  USING (
    center_id IN (SELECT id FROM centers WHERE status = 'published')
  );

CREATE POLICY "Admins can manage photos"
  ON center_photos FOR ALL
  USING (get_user_role() = 'admin')
  WITH CHECK (get_user_role() = 'admin');

-- CENTER FAQS
ALTER TABLE center_faqs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read faqs of published centers"
  ON center_faqs FOR SELECT
  USING (
    center_id IN (SELECT id FROM centers WHERE status = 'published')
  );

CREATE POLICY "Admins can manage faqs"
  ON center_faqs FOR ALL
  USING (get_user_role() = 'admin')
  WITH CHECK (get_user_role() = 'admin');

-- PROFILES
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Admins can read all profiles"
  ON profiles FOR SELECT
  USING (get_user_role() = 'admin');

CREATE POLICY "Admins can manage all profiles"
  ON profiles FOR ALL
  USING (get_user_role() = 'admin')
  WITH CHECK (get_user_role() = 'admin');

-- CENTER EDIT REQUESTS
ALTER TABLE center_edit_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Partners can create edit requests for own center"
  ON center_edit_requests FOR INSERT
  WITH CHECK (
    get_user_role() = 'partner'
    AND center_id IN (SELECT center_id FROM profiles WHERE id = auth.uid())
  );

CREATE POLICY "Partners can read own edit requests"
  ON center_edit_requests FOR SELECT
  USING (submitted_by = auth.uid());

CREATE POLICY "Admins can manage edit requests"
  ON center_edit_requests FOR ALL
  USING (get_user_role() = 'admin')
  WITH CHECK (get_user_role() = 'admin');

-- ASSESSMENTS (inserted via service role, readable by session or admin)
ALTER TABLE assessments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read all assessments"
  ON assessments FOR SELECT
  USING (get_user_role() = 'admin');

CREATE POLICY "Admins can manage assessments"
  ON assessments FOR ALL
  USING (get_user_role() = 'admin')
  WITH CHECK (get_user_role() = 'admin');

-- LEADS (admin only - submission via service role API)
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage leads"
  ON leads FOR ALL
  USING (get_user_role() = 'admin')
  WITH CHECK (get_user_role() = 'admin');

-- LEAD FORWARDS
ALTER TABLE lead_forwards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage lead forwards"
  ON lead_forwards FOR ALL
  USING (get_user_role() = 'admin')
  WITH CHECK (get_user_role() = 'admin');

-- PAGES
ALTER TABLE pages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read published pages"
  ON pages FOR SELECT
  USING (status = 'published');

CREATE POLICY "Admins can manage pages"
  ON pages FOR ALL
  USING (get_user_role() = 'admin')
  WITH CHECK (get_user_role() = 'admin');

-- SITE FAQS
ALTER TABLE site_faqs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read published site faqs"
  ON site_faqs FOR SELECT
  USING (published = true);

CREATE POLICY "Admins can manage site faqs"
  ON site_faqs FOR ALL
  USING (get_user_role() = 'admin')
  WITH CHECK (get_user_role() = 'admin');

-- ============================================
-- UPDATED_AT TRIGGER
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER centers_updated_at
  BEFORE UPDATE ON centers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER leads_updated_at
  BEFORE UPDATE ON leads
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER pages_updated_at
  BEFORE UPDATE ON pages
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================
-- STORAGE BUCKET FOR CENTER PHOTOS
-- ============================================
INSERT INTO storage.buckets (id, name, public) VALUES ('center-photos', 'center-photos', true);

CREATE POLICY "Public can read center photos"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'center-photos');

CREATE POLICY "Admins can upload center photos"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'center-photos' AND get_user_role() IN ('admin', 'partner'));

CREATE POLICY "Admins can delete center photos"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'center-photos' AND get_user_role() = 'admin');
