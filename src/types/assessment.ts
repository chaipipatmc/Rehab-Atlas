export interface AssessmentAnswers {
  who_for: "self" | "loved_one" | "professional";
  age_range: string;
  primary_issue: string[];
  substances?: string[];
  severity: "mild" | "moderate" | "severe";
  co_occurring: string[];
  prior_treatment: boolean;
  needs_detox: boolean;
  budget: "economy" | "mid" | "premium" | "any";
  preferred_country?: string;
  preferred_setting: "inpatient" | "outpatient" | "any";
  insurance_provider?: string;
  privacy_importance: "low" | "medium" | "high";
  urgency: "not_urgent" | "soon" | "urgent";
  contact_email: string;
  contact_name?: string;
  contact_phone?: string;
  // Traffic attribution attached client-side at submit time. Stored inside
  // the assessments.answers jsonb column; queried via answers->>'_source' in SQL.
  _source?: {
    utm_source?: string;
    utm_medium?: string;
    utm_campaign?: string;
    utm_content?: string;
    utm_term?: string;
    referrer?: string;
    landing_path?: string;
    channel?:
      | "direct"
      | "organic_search"
      | "ai_referral"
      | "internal_blog"
      | "external_referral"
      | "paid"
      | "social"
      | "email"
      | "other";
  };
}

export interface Assessment {
  id: string;
  session_id: string;
  user_id: string | null;
  answers: AssessmentAnswers;
  matched_center_ids: string[];
  match_scores: Record<string, number>;
  explanations: MatchExplanation[];
  urgency_level: string | null;
  completed: boolean;
  created_at: string;
}

export interface MatchExplanation {
  center_id: string;
  explanation: string;
  fit_summary: string;
}

export interface ScoredCenter {
  center_id: string;
  center_name: string;
  center_slug: string;
  score: number;
  breakdown: Record<string, number>;
}

export interface MatchResult {
  assessment_id: string;
  primary_matches: (ScoredCenter & MatchExplanation)[];
  alternatives: ScoredCenter[];
  urgency_level: string;
}
