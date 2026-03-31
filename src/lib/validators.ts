import { z } from "zod";

// Reusable phone validation (E.164-ish: optional +, then digits, spaces, dashes)
const phoneSchema = z
  .string()
  .max(20)
  .regex(/^[+]?[\d\s\-().]{7,20}$/, "Please enter a valid phone number")
  .optional()
  .or(z.literal(""));

// Assessment arrays — use z.string() to accept expanded options + custom "Other" values
// Constants in src/lib/constants.ts define the full option sets

const AGE_RANGES = ["18-25", "26-35", "36-50", "51-65", "65+"] as const;

// Lead / Inquiry Form
export const leadFormSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(100),
  email: z.string().email("Please enter a valid email").max(254),
  phone: phoneSchema,
  country: z.string().max(100).optional(),
  who_for: z.enum(["self", "loved_one", "professional"]).optional(),
  age_range: z.enum(AGE_RANGES).optional().or(z.literal("")),
  concern: z
    .string()
    .min(10, "Please describe your concern (at least 10 characters)")
    .max(5000, "Concern text is too long"),
  urgency: z.enum(["not_urgent", "soon", "urgent"]).optional(),
  preferred_center_id: z.string().uuid().optional().nullable(),
  budget: z.enum(["economy", "mid", "premium", "any"]).optional().or(z.literal("")),
  message: z.string().max(5000).optional(),
  consent: z.literal(true, { message: "You must agree to the privacy policy" }),
  request_call: z.boolean().default(false),
});

export type LeadFormData = z.infer<typeof leadFormSchema>;

// Assessment Form
export const assessmentSchema = z.object({
  who_for: z.enum(["self", "loved_one", "professional"]),
  age_range: z.enum(AGE_RANGES, { message: "Please select an age range" }),
  primary_issue: z
    .array(z.string().min(1))
    .min(1, "Please select at least one issue"),
  substances: z.array(z.string().min(1)).optional(),
  severity: z.enum(["mild", "moderate", "severe"]),
  co_occurring: z.array(z.string().min(1)).default([]),
  prior_treatment: z.boolean(),
  needs_detox: z.boolean(),
  budget: z.enum(["economy", "mid", "premium", "any"]),
  preferred_country: z.string().max(100).optional(),
  preferred_setting: z.enum(["inpatient", "outpatient", "any"]),
  insurance_provider: z.string().max(100).optional(),
  privacy_importance: z.enum(["low", "medium", "high"]),
  urgency: z.enum(["not_urgent", "soon", "urgent"]),
});

export type AssessmentFormData = z.infer<typeof assessmentSchema>;

// Center Form (Admin)
export const centerFormSchema = z.object({
  name: z.string().min(2, "Name is required"),
  slug: z.string().min(2, "Slug is required"),
  description: z.string().optional(),
  short_description: z.string().max(200).optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  state_province: z.string().optional(),
  country: z.string().min(1, "Country is required"),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  website_url: z.string().url().optional().or(z.literal("")),
  inquiry_email: z.string().email().optional().or(z.literal("")),
  treatment_focus: z.array(z.string()).default([]),
  conditions: z.array(z.string()).default([]),
  substance_use: z.array(z.string()).default([]),
  services: z.array(z.string()).default([]),
  treatment_methods: z.array(z.string()).default([]),
  setting_type: z.string().optional(),
  program_length: z.string().optional(),
  languages: z.array(z.string()).default(["english"]),
  pricing_text: z.string().optional(),
  price_min: z.number().optional(),
  price_max: z.number().optional(),
  insurance: z.array(z.string()).default([]),
  has_detox: z.boolean().default(false),
  status: z.enum(["draft", "published", "archived"]).default("draft"),
});

export type CenterFormData = z.infer<typeof centerFormSchema>;

// ── Analytics tracking ──
export const trackEventSchema = z.object({
  center_id: z.string().uuid(),
  event: z.enum(["profile_view", "card_click", "inquiry_click"]),
});
