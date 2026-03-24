export interface Center {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  short_description: string | null;

  // Location
  address: string | null;
  city: string | null;
  state_province: string | null;
  country: string;
  latitude: number | null;
  longitude: number | null;

  // Contact
  phone: string | null;
  email: string | null;
  website_url: string | null;
  inquiry_email: string | null;

  // Clinical
  treatment_focus: string[];
  conditions: string[];
  substance_use: string[];
  services: string[];
  treatment_methods: string[];
  setting_type: string | null;
  program_length: string | null;
  languages: string[];

  // Pricing
  pricing_text: string | null;
  price_min: number | null;
  price_max: number | null;
  insurance: string[];
  has_detox: boolean;

  // Staff
  clinical_director: string | null;
  medical_director: string | null;

  // Accreditation & Rating
  accreditation: string[];
  rating: number | null;
  review_count: number;
  review_summary: string | null;

  // Editorial Ratings
  editorial_overall: number | null;
  editorial_staff: number | null;
  editorial_facility: number | null;
  editorial_program: number | null;
  editorial_privacy: number | null;
  editorial_value: number | null;

  // Commercial
  verified_profile: boolean;
  trusted_partner: boolean;
  referral_eligible: boolean;
  is_featured: boolean;
  is_sponsored: boolean;
  agreement_status: "none" | "pending" | "active" | "expired";

  // Commission
  commission_type: "none" | "percentage" | "fixed";
  commission_rate: number | null;
  commission_fixed_amount: number | null;
  commission_currency: string;
  commission_notes: string | null;
  contract_start: string | null;
  contract_end: string | null;
  account_manager: string | null;

  // Status
  status: "draft" | "published" | "archived";
  occupancy: string | null;

  // Metadata
  source_url: string | null;
  last_verified: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;

  // Relations (optional, loaded separately)
  photos?: CenterPhoto[];
  faqs?: CenterFaq[];
}

export interface CenterPhoto {
  id: string;
  center_id: string;
  url: string;
  alt_text: string | null;
  sort_order: number;
  is_primary: boolean;
}

export interface CenterFaq {
  id: string;
  center_id: string;
  question: string;
  answer: string;
  sort_order: number;
}

export interface CenterFilters {
  country?: string;
  city?: string;
  treatment_focus?: string[];
  setting_type?: string;
  has_detox?: boolean;
  price_min?: number;
  price_max?: number;
  insurance?: string;
  language?: string;
  search?: string;
}

export type CenterSortOption =
  | "relevance"
  | "featured"
  | "price_asc"
  | "price_desc"
  | "rating";
