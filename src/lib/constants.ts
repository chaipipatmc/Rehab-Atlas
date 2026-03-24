// Treatment Focus
export const TREATMENT_FOCUS_OPTIONS = [
  { value: "substance_use", label: "Substance Use" },
  { value: "mental_health", label: "Mental Health" },
  { value: "dual_diagnosis", label: "Substance Use & Mental Health" },
  { value: "eating_disorder", label: "Eating Disorders" },
  { value: "behavioral", label: "Behavioral Addictions" },
] as const;

// Conditions
export const CONDITION_OPTIONS = [
  { value: "anxiety", label: "Anxiety" },
  { value: "depression", label: "Depression" },
  { value: "ptsd", label: "PTSD" },
  { value: "trauma", label: "Trauma" },
  { value: "eating_disorder", label: "Eating Disorder" },
  { value: "bipolar", label: "Bipolar Disorder" },
  { value: "ocd", label: "OCD" },
  { value: "personality_disorder", label: "Personality Disorder" },
] as const;

// Substance Types
export const SUBSTANCE_OPTIONS = [
  { value: "alcohol", label: "Alcohol" },
  { value: "opioids", label: "Opioids" },
  { value: "heroin", label: "Heroin" },
  { value: "cocaine", label: "Cocaine" },
  { value: "methamphetamine", label: "Methamphetamine" },
  { value: "benzodiazepines", label: "Benzodiazepines" },
  { value: "prescription_drugs", label: "Prescription Drugs" },
  { value: "cannabis", label: "Cannabis" },
  { value: "co_occurring", label: "Co-Occurring Disorders" },
] as const;

// Services
export const SERVICE_OPTIONS = [
  { value: "detox", label: "Detox" },
  { value: "residential", label: "Residential / Inpatient" },
  { value: "intensive_outpatient", label: "Intensive Outpatient (IOP)" },
  { value: "outpatient", label: "Outpatient" },
  { value: "day_treatment", label: "Day Treatment / PHP" },
  { value: "sober_living", label: "Sober Living" },
  { value: "aftercare", label: "Aftercare" },
] as const;

// Treatment Methods
export const TREATMENT_METHOD_OPTIONS = [
  { value: "cbt", label: "Cognitive Behavioral Therapy (CBT)" },
  { value: "dbt", label: "Dialectical Behavior Therapy (DBT)" },
  { value: "emdr", label: "EMDR" },
  { value: "12_step", label: "12-Step Program" },
  { value: "holistic", label: "Holistic" },
  { value: "art_therapy", label: "Art Therapy" },
  { value: "equine_therapy", label: "Equine Therapy" },
  { value: "mindfulness", label: "Mindfulness / Meditation" },
  { value: "family_therapy", label: "Family Therapy" },
  { value: "group_therapy", label: "Group Therapy" },
  { value: "evidence_based", label: "Evidence-Based" },
  { value: "yoga", label: "Yoga" },
] as const;

// Setting Types
export const SETTING_TYPE_OPTIONS = [
  { value: "inpatient", label: "Inpatient" },
  { value: "outpatient", label: "Outpatient" },
  { value: "residential", label: "Residential" },
  { value: "hybrid", label: "Hybrid" },
] as const;

// Insurance Providers
export const INSURANCE_OPTIONS = [
  { value: "aetna", label: "Aetna" },
  { value: "anthem", label: "Anthem" },
  { value: "cigna", label: "Cigna" },
  { value: "humana", label: "Humana" },
  { value: "united_healthcare", label: "United Healthcare" },
  { value: "medicaid", label: "Medicaid" },
  { value: "medicare", label: "Medicare" },
  { value: "tricare", label: "Tricare" },
  { value: "kaiser", label: "Kaiser" },
  { value: "self_pay", label: "Self-Pay" },
] as const;

// Lead Statuses
export const LEAD_STATUS_OPTIONS = [
  { value: "new", label: "New", color: "bg-blue-100 text-blue-800" },
  { value: "under_review", label: "Under Review", color: "bg-yellow-100 text-yellow-800" },
  { value: "awaiting_info", label: "Awaiting Info", color: "bg-orange-100 text-orange-800" },
  { value: "ready_to_forward", label: "Ready to Forward", color: "bg-purple-100 text-purple-800" },
  { value: "forwarded", label: "Forwarded", color: "bg-green-100 text-green-800" },
  { value: "closed", label: "Closed", color: "bg-gray-100 text-gray-800" },
] as const;

// Budget Tiers
export const BUDGET_OPTIONS = [
  { value: "economy", label: "Economy (Under $5,000/month)" },
  { value: "mid", label: "Mid-Range ($5,000–$15,000/month)" },
  { value: "premium", label: "Premium ($15,000+/month)" },
  { value: "any", label: "Flexible / Not Sure" },
] as const;

// Age Ranges
export const AGE_RANGE_OPTIONS = [
  { value: "18-25", label: "18–25" },
  { value: "26-35", label: "26–35" },
  { value: "36-50", label: "36–50" },
  { value: "51-65", label: "51–65" },
  { value: "65+", label: "65+" },
] as const;

// Who For
export const WHO_FOR_OPTIONS = [
  { value: "self", label: "Myself" },
  { value: "loved_one", label: "A Loved One" },
  { value: "professional", label: "Professional Referral" },
] as const;

// Urgency
export const URGENCY_OPTIONS = [
  { value: "not_urgent", label: "I'm exploring options" },
  { value: "soon", label: "I need help soon" },
  { value: "urgent", label: "This is urgent / immediate" },
] as const;

// Severity
export const SEVERITY_OPTIONS = [
  { value: "mild", label: "Mild — Early signs or occasional use" },
  { value: "moderate", label: "Moderate — Regular use or worsening symptoms" },
  { value: "severe", label: "Severe — Daily use, crisis, or significant impact" },
] as const;

// Privacy Importance
export const PRIVACY_OPTIONS = [
  { value: "low", label: "Not a major concern" },
  { value: "medium", label: "Somewhat important" },
  { value: "high", label: "Very important — Privacy is a top priority" },
] as const;

// Sort Options
export const SORT_OPTIONS = [
  { value: "relevance", label: "Relevance" },
  { value: "featured", label: "Featured" },
  { value: "price_asc", label: "Price: Low to High" },
  { value: "price_desc", label: "Price: High to Low" },
  { value: "rating", label: "Highest Rated" },
] as const;
