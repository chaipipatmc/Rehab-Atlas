// ============================================
// Rehab-Atlas Agent System — Type Definitions
// ============================================

export type AgentType =
  | "center_admin" | "content_admin" | "follow_up" | "lead_verify"
  | "outreach_research" | "outreach_followup" | "outreach_response"
  | "outreach_agreement" | "outreach_activation" | "outreach_orchestrator"
  | "content_creator" | "content_scheduler";
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

// --- Outreach Pipeline ---

export type OutreachStage =
  | "new" | "researching" | "research_complete" | "outreach_drafted"
  | "outreach_sent" | "followed_up" | "responded" | "negotiating" | "terms_agreed"
  | "agreement_drafted" | "agreement_sent" | "agreement_signed" | "active"
  | "stalled" | "declined";

export type ResponseSentiment = "positive" | "neutral" | "negative" | "question";
export type BlogTier = "none" | "standard" | "premium";
export type ESignStatus = "draft" | "sent" | "viewed" | "center_signed" | "owner_signed" | "completed" | "declined" | "expired";

export interface OutreachPipeline {
  id: string;
  center_id: string;
  stage: OutreachStage;
  research_data: CenterResearch | null;
  research_completed_at: string | null;
  outreach_email_id: string | null;
  outreach_thread_id: string | null;
  outreach_persona: string;
  outreach_sent_at: string | null;
  follow_up_count: number;
  last_follow_up_at: string | null;
  next_follow_up_at: string | null;
  responded_at: string | null;
  response_summary: string | null;
  response_sentiment: ResponseSentiment | null;
  proposed_commission_rate: number;
  agreed_commission_rate: number | null;
  agreed_commission_type: string;
  blog_tier: BlogTier | null;
  special_terms: string | null;
  agreement_document_url: string | null;
  esign_envelope_id: string | null;
  esign_status: ESignStatus | null;
  agreement_sent_at: string | null;
  agreement_signed_at: string | null;
  assigned_to: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface OutreachEmail {
  id: string;
  pipeline_id: string;
  center_id: string | null;
  direction: "outbound" | "inbound";
  gmail_message_id: string | null;
  gmail_thread_id: string | null;
  from_email: string;
  to_email: string;
  subject: string;
  body_text: string | null;
  body_html: string | null;
  email_type: string;
  sent_at: string;
  created_at: string;
}

export interface CenterResearch {
  programs: string[];
  specialties: string[];
  target_audience: string;
  website_summary: string;
  unique_selling_points: string[];
  contact_person_name: string | null;
  tone_analysis: string;
}

export interface OutreachEmailDraft {
  subject: string;
  body_html: string;
  body_text: string;
  personalization_points: string[];
}

export interface AgreementDetails {
  center_name: string;
  center_country: string;
  center_city: string;
  contact_person: string;
  contact_email: string;
  commission_rate: number;
  blog_tier: BlogTier;
  special_terms: string | null;
  contract_start: string;
  contract_end: string;
}

export interface PipelineFunnelMetrics {
  total_centers: number;
  by_stage: Record<OutreachStage, number>;
  response_rate: number;
  close_rate: number;
  avg_days_to_close: number;
  this_week_contacted: number;
  this_week_responded: number;
  this_week_signed: number;
}

export interface OutreachBlogCount {
  id: string;
  center_id: string;
  year_month: string;
  approved_count: number;
  tier: BlogTier | null;
  effective_rate: number | null;
  calculated_at: string;
}

// --- Webhook Payload ---

export interface WebhookPayload {
  type: "INSERT" | "UPDATE" | "DELETE";
  table: string;
  record: Record<string, unknown>;
  old_record?: Record<string, unknown>;
}
