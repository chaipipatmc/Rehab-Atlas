// Treatment Focus / Specializations
export const TREATMENT_FOCUS_OPTIONS = [
  { value: "substance_use", label: "Substance Use" },
  { value: "mental_health", label: "Mental Health" },
  { value: "dual_diagnosis", label: "Dual Diagnosis" },
  { value: "eating_disorder", label: "Eating Disorders" },
  { value: "behavioral", label: "Behavioral Addictions" },
  { value: "trauma", label: "Trauma" },
  { value: "drug_addiction", label: "Drug Addiction" },
  { value: "alcohol_addiction", label: "Alcohol Addiction" },
  { value: "detox", label: "Detox" },
  { value: "gambling", label: "Gambling" },
  { value: "gaming", label: "Gaming" },
  { value: "sex_addiction", label: "Sex Addiction" },
  { value: "internet_addiction", label: "Internet Addiction" },
  { value: "codependency", label: "Codependency" },
  { value: "chronic_relapse", label: "Chronic Relapse" },
  { value: "grief_and_loss", label: "Grief and Loss" },
  { value: "anger_management", label: "Anger Management" },
] as const;

// Substances We Treat
export const SUBSTANCE_OPTIONS = [
  { value: "alcohol", label: "Alcohol" },
  { value: "opioids", label: "Opioids" },
  { value: "heroin", label: "Heroin" },
  { value: "cocaine", label: "Cocaine" },
  { value: "methamphetamine", label: "Methamphetamine" },
  { value: "benzodiazepines", label: "Benzodiazepines" },
  { value: "prescription_drugs", label: "Prescription Drugs" },
  { value: "cannabis", label: "Cannabis" },
  { value: "ecstasy", label: "Ecstasy / MDMA" },
  { value: "ketamine", label: "Ketamine" },
  { value: "fentanyl", label: "Fentanyl" },
  { value: "kratom", label: "Kratom" },
  { value: "synthetic_drugs", label: "Synthetic Drugs" },
  { value: "inhalants", label: "Inhalants" },
  { value: "co_occurring", label: "Co-Occurring Disorders" },
] as const;

// Conditions We Treat
export const CONDITION_OPTIONS = [
  { value: "anxiety", label: "Anxiety" },
  { value: "depression", label: "Depression" },
  { value: "ptsd", label: "PTSD" },
  { value: "trauma", label: "Trauma" },
  { value: "eating_disorder", label: "Eating Disorder" },
  { value: "bipolar", label: "Bipolar Disorder" },
  { value: "ocd", label: "OCD" },
  { value: "personality_disorder", label: "Personality Disorder" },
  { value: "adhd", label: "ADHD" },
  { value: "anger", label: "Anger Issues" },
  { value: "burnout", label: "Burnout" },
  { value: "chemsex", label: "Chemsex" },
  { value: "self_harm", label: "Self-Harm" },
  { value: "suicidal_ideation", label: "Suicidal Ideation" },
  { value: "schizophrenia", label: "Schizophrenia" },
  { value: "insomnia", label: "Insomnia / Sleep Disorders" },
  { value: "phobias", label: "Phobias" },
  { value: "grief", label: "Grief & Loss" },
] as const;

// Who We Treat
export const WHO_WE_TREAT_OPTIONS = [
  { value: "men", label: "Men" },
  { value: "women", label: "Women" },
  { value: "young_adults", label: "Young Adults (18-25)" },
  { value: "lgbtq", label: "LGBTQ+" },
  { value: "midlife_adults", label: "Midlife Adults" },
  { value: "seniors", label: "Seniors (65+)" },
  { value: "adolescents", label: "Adolescents" },
  { value: "couples", label: "Couples" },
  { value: "families", label: "Families" },
  { value: "veterans", label: "Veterans" },
  { value: "executives", label: "Executives / Professionals" },
  { value: "healthcare_workers", label: "Healthcare Workers" },
  { value: "first_responders", label: "First Responders" },
  { value: "mild_disabilities", label: "Mild Disabilities" },
] as const;

// Treatment Services
export const SERVICE_OPTIONS = [
  { value: "detox", label: "Detox" },
  { value: "residential", label: "Residential / Inpatient" },
  { value: "intensive_outpatient", label: "Intensive Outpatient (IOP)" },
  { value: "outpatient", label: "Outpatient" },
  { value: "day_treatment", label: "Day Treatment / PHP" },
  { value: "sober_living", label: "Sober Living" },
  { value: "aftercare", label: "Aftercare" },
  { value: "individual_therapy", label: "Individual Therapy" },
  { value: "group_therapy", label: "Group Therapy" },
  { value: "family_therapy", label: "Family Therapy" },
  { value: "couples_therapy", label: "Couples Therapy" },
  { value: "psychiatric_care", label: "Psychiatric Care" },
  { value: "medication_management", label: "Medication Management" },
  { value: "crisis_intervention", label: "Crisis Intervention" },
  { value: "telehealth", label: "Telehealth / Virtual" },
] as const;

// Approaches
export const APPROACH_OPTIONS = [
  { value: "evidence_based", label: "Evidence-Based" },
  { value: "holistic", label: "Holistic" },
  { value: "medical", label: "Medical" },
  { value: "family_involvement", label: "Family Involvement" },
  { value: "individual_treatment", label: "Individual Treatment" },
  { value: "12_step", label: "12-Step" },
  { value: "non_12_step", label: "Non 12-Step" },
  { value: "faith_based", label: "Faith-Based" },
  { value: "secular", label: "Secular" },
  { value: "harm_reduction", label: "Harm Reduction" },
  { value: "abstinence_based", label: "Abstinence-Based" },
  { value: "trauma_informed", label: "Trauma-Informed" },
  { value: "person_centered", label: "Person-Centered" },
  { value: "strengths_based", label: "Strengths-Based" },
  { value: "mat", label: "Medication-Assisted Treatment (MAT)" },
] as const;

// Therapies / Treatment Methods
export const TREATMENT_METHOD_OPTIONS = [
  { value: "cbt", label: "Cognitive Behavioral Therapy (CBT)" },
  { value: "dbt", label: "Dialectical Behavior Therapy (DBT)" },
  { value: "emdr", label: "Eye Movement Therapy (EMDR)" },
  { value: "act", label: "Acceptance & Commitment Therapy (ACT)" },
  { value: "mi", label: "Motivational Interviewing (MI)" },
  { value: "psychodynamic", label: "Psychodynamic Therapy" },
  { value: "somatic", label: "Somatic Experiencing" },
  { value: "art_therapy", label: "Art Therapy" },
  { value: "music_therapy", label: "Music Therapy" },
  { value: "equine_therapy", label: "Equine Therapy" },
  { value: "adventure_therapy", label: "Adventure Therapy" },
  { value: "mindfulness", label: "Mindfulness / Meditation" },
  { value: "yoga", label: "Yoga" },
  { value: "acupuncture", label: "Acupuncture" },
  { value: "neurofeedback", label: "Neurofeedback" },
  { value: "hypnotherapy", label: "Hypnotherapy" },
  { value: "narrative_therapy", label: "Narrative Therapy" },
  { value: "family_therapy", label: "Family Therapy" },
  { value: "group_therapy", label: "Group Therapy" },
  { value: "1on1_counseling", label: "1-on-1 Counseling" },
  { value: "experiential", label: "Experiential Therapy" },
  { value: "biofeedback", label: "Biofeedback" },
  { value: "breathwork", label: "Breathwork" },
  { value: "sound_healing", label: "Sound Healing" },
  { value: "reiki", label: "Reiki" },
] as const;

// Aftercare Options
export const AFTERCARE_OPTIONS = [
  { value: "outpatient_treatment", label: "Outpatient Treatment" },
  { value: "recovery_coach", label: "Recovery Coach" },
  { value: "support_meetings", label: "Support Meetings" },
  { value: "return_visits", label: "Return Visits" },
  { value: "drug_screening", label: "Drug Screening" },
  { value: "family_followup", label: "Family Follow-up Counseling" },
  { value: "followup_in_person", label: "Follow-up Sessions (in-person)" },
  { value: "followup_online", label: "Follow-up Sessions (online)" },
  { value: "fitness_sessions", label: "Fitness Sessions" },
  { value: "alumni_network", label: "Alumni Network" },
  { value: "relapse_prevention", label: "Relapse Prevention Plan" },
  { value: "sober_living_referral", label: "Sober Living Referral" },
  { value: "peer_support", label: "Peer Support Groups" },
] as const;

// Amenities
export const AMENITY_OPTIONS = [
  { value: "pool", label: "Pool" },
  { value: "gym", label: "Fitness Center / Gym" },
  { value: "gardens", label: "Gardens" },
  { value: "nature_access", label: "Access to Nature" },
  { value: "library", label: "Library" },
  { value: "internet", label: "Internet / Wi-Fi" },
  { value: "gourmet_dining", label: "Gourmet Dining" },
  { value: "private_rooms", label: "Private Rooms" },
  { value: "shared_rooms", label: "Shared Rooms" },
  { value: "en_suite_bathroom", label: "En Suite Bathroom" },
  { value: "air_conditioning", label: "Air Conditioning" },
  { value: "laundry", label: "Laundry Service" },
  { value: "housekeeping", label: "Housekeeping" },
  { value: "meditation_room", label: "Meditation Room" },
  { value: "spa", label: "Spa / Wellness Center" },
  { value: "business_center", label: "Business Center" },
  { value: "chapel", label: "Chapel / Prayer Room" },
  { value: "art_studio", label: "Art Studio" },
  { value: "music_room", label: "Music Room" },
  { value: "outdoor_seating", label: "Outdoor Seating / Lounge" },
] as const;

// Activities
export const ACTIVITY_OPTIONS = [
  { value: "yoga_classes", label: "Yoga" },
  { value: "meditation_classes", label: "Meditation" },
  { value: "hiking", label: "Hiking" },
  { value: "swimming", label: "Swimming" },
  { value: "surfing", label: "Surfing" },
  { value: "boxing", label: "Boxing / Martial Arts" },
  { value: "biking", label: "Biking" },
  { value: "volleyball", label: "Volleyball" },
  { value: "massage", label: "Massage" },
  { value: "aa_na_meetings", label: "AA/NA Meetings" },
  { value: "cooking_classes", label: "Cooking Classes" },
  { value: "journaling", label: "Journaling" },
  { value: "music", label: "Music / Instruments" },
  { value: "movies", label: "Movie Nights" },
  { value: "excursions", label: "Excursions / Day Trips" },
  { value: "gardening", label: "Gardening" },
  { value: "animal_therapy", label: "Animal-Assisted Activities" },
] as const;

// Special Considerations / Accommodations
export const ACCOMMODATION_OPTIONS = [
  { value: "wheelchair_accessible", label: "Wheelchair Accessible" },
  { value: "lgbtq_affirming", label: "LGBTQ+ Affirming" },
  { value: "vegetarian", label: "Vegetarian" },
  { value: "vegan", label: "Vegan" },
  { value: "halal", label: "Halal" },
  { value: "kosher", label: "Kosher" },
  { value: "gluten_free", label: "Gluten-Free" },
  { value: "dietary_accommodations", label: "Dietary Accommodations" },
  { value: "young_adults_program", label: "Young Adults Program" },
  { value: "women_only", label: "Women-Only Program" },
  { value: "men_only", label: "Men-Only Program" },
  { value: "neurodivergent_friendly", label: "Neurodivergent-Friendly" },
  { value: "deaf_hoh", label: "Deaf / Hard of Hearing Support" },
  { value: "pet_friendly", label: "Pet-Friendly" },
  { value: "smoking_area", label: "Designated Smoking Area" },
  { value: "airport_transfer", label: "Airport Transfer" },
] as const;

// Language Options
export const LANGUAGE_OPTIONS = [
  { value: "english", label: "English" },
  { value: "spanish", label: "Spanish" },
  { value: "french", label: "French" },
  { value: "german", label: "German" },
  { value: "italian", label: "Italian" },
  { value: "portuguese", label: "Portuguese" },
  { value: "dutch", label: "Dutch" },
  { value: "swedish", label: "Swedish" },
  { value: "thai", label: "Thai" },
  { value: "hindi", label: "Hindi" },
  { value: "arabic", label: "Arabic" },
  { value: "mandarin", label: "Mandarin" },
  { value: "japanese", label: "Japanese" },
  { value: "korean", label: "Korean" },
  { value: "russian", label: "Russian" },
  { value: "malay", label: "Malay" },
  { value: "indonesian", label: "Indonesian" },
] as const;

// Setting Types
export const SETTING_TYPE_OPTIONS = [
  { value: "inpatient", label: "Inpatient" },
  { value: "outpatient", label: "Outpatient" },
  { value: "residential", label: "Residential" },
  { value: "hybrid", label: "Hybrid" },
  { value: "luxury", label: "Luxury Residential" },
  { value: "wilderness", label: "Wilderness / Nature-Based" },
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
  { value: "blue_cross", label: "Blue Cross Blue Shield" },
  { value: "self_pay", label: "Self-Pay" },
  { value: "sliding_scale", label: "Sliding Scale" },
  { value: "private_insurance", label: "Private Insurance" },
  { value: "international", label: "International Insurance" },
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

// Hospital Affiliation
export const HOSPITAL_AFFILIATION_OPTIONS = [
  { value: "on_site", label: "Hospital On-Site" },
  { value: "partnered", label: "Partnered Hospital" },
  { value: "none", label: "No Hospital Affiliation" },
] as const;
