// ============================================
// Rehab-Atlas Agent System — Type Definitions
// ============================================

export type AgentType = "center_admin" | "content_admin" | "follow_up" | "lead_verify";
export type TaskStatus = "pending" | "processing" | "awaiting_owner" | "approved" | "rejected" | "expired" | "error";
export type AgentRecommendation = "approve" | "reject" | "needs_info";
export type OwnerDecision = "approved" | "rejected" | "needs_info";

export interface AgentTask {
  id: string;
  agent_type: AgentType;
  entity_type: string;
  entity_id: string;
  status: TaskStatus;
  checklist: Record<string, unknown> | null;
  ai_summary: string | null;
  ai_recommendation: AgentRecommendation | null;
  confidence: number | null;
  action_token: string | null;
  token_expires: string | null;
  owner_decision: OwnerDecision | null;
  owner_note: string | null;
  decided_at: string | null;
  retry_count: number;
  error_message: string | null;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
}

export interface AgentFollowUp {
  id: string;
  entity_type: string;
  entity_id: string;
  target_user_id: string | null;
  target_email: string;
  reason: string;
  message_sent: string | null;
  attempt_number: number;
  max_attempts: number;
  status: "pending" | "sent" | "completed" | "abandoned";
  next_follow_up: string | null;
  created_at: string;
  responded_at: string | null;
}

// --- Center Admin Agent ---

export interface CenterChecklist {
  has_name: boolean;
  has_description: boolean;
  has_short_description: boolean;
  has_location: boolean;
  has_contact: boolean;
  has_inquiry_email: boolean;
  has_treatment_focus: boolean;
  has_services: boolean;
  has_pricing: boolean;
  has_photos: boolean;
  has_primary_photo: boolean;
  photo_count: number;
  has_setting_type: boolean;
  completeness_score: number;
  missing_fields: string[];
}

export interface CenterAIAnalysis {
  quality_score: number;
  issues: string[];
  suggestions: string[];
}

// --- Content Admin Agent ---

export interface ContentChecklist {
  has_title: boolean;
  has_content: boolean;
  content_word_count: number;
  has_meta_description: boolean;
  has_featured_image: boolean;
  has_valid_slug: boolean;
  author_type: string;
  author_center_exists: boolean;
}

export interface ContentAIAnalysis {
  relevance_score: number;
  medical_flags: string[];
  seo_score: number;
  promotion_level: "appropriate" | "excessive" | "none";
  summary: string;
}

// --- Lead Verify Agent ---

export interface CenterCommissionCheck {
  center_id: string;
  center_name: string;
  match_score: number;
  commission_type: string;
  commission_rate: number | null;
  commission_fixed_amount: number | null;
  agreement_status: string;
  contract_end: string | null;
  has_inquiry_email: boolean;
  is_forwardable: boolean;
  blockers: string[];
}

export interface LeadVerifyChecklist {
  has_valid_email: boolean;
  has_phone: boolean;
  has_concern: boolean;
  concern_length_adequate: boolean;
  urgency_level: string;
  has_assessment: boolean;
  assessment_completed: boolean;
  top_match_score: number | null;
  match_count: number;
  preferred_center_name: string | null;
  centers_with_commission: CenterCommissionCheck[];
  any_center_has_active_agreement: boolean;
  ready_to_forward: boolean;
  blockers: string[];
}

export interface LeadAIAnalysis {
  legitimacy_score: number;
  needs_summary: string;
  match_quality_assessment: string;
  urgency_flag: boolean;
  recommended_centers: string[];
}

// --- Webhook Payload ---

export interface WebhookPayload {
  type: "INSERT" | "UPDATE" | "DELETE";
  table: string;
  record: Record<string, unknown>;
  old_record?: Record<string, unknown>;
}
