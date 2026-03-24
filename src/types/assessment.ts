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
