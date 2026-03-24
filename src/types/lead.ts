export type LeadStatus =
  | "new"
  | "under_review"
  | "awaiting_info"
  | "ready_to_forward"
  | "forwarded"
  | "closed";

export type UrgencyLevel = "not_urgent" | "soon" | "urgent";

export interface Lead {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  country: string | null;
  who_for: string | null;
  age_range: string | null;
  concern: string | null;
  urgency: UrgencyLevel | null;
  preferred_center_id: string | null;
  budget: string | null;
  message: string | null;
  consent: boolean;
  request_call: boolean;
  assessment_id: string | null;
  source_page: string | null;
  status: LeadStatus;
  assigned_to: string | null;
  admin_notes: string | null;
  created_at: string;
  updated_at: string;

  // Relations (loaded separately)
  preferred_center?: { id: string; name: string; slug: string } | null;
  assessment?: { id: string; answers: Record<string, unknown> } | null;
}

export interface LeadForward {
  id: string;
  lead_id: string;
  center_id: string;
  forwarded_by: string;
  method: string;
  notes: string | null;
  created_at: string;

  // Relations
  center?: { id: string; name: string };
  forwarded_by_profile?: { full_name: string | null };
}
