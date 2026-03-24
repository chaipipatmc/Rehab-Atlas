export const SCORING_WEIGHTS = {
  treatment_focus: 25,
  conditions: 15,
  services: 15,
  budget: 15,
  location: 10,
  insurance: 10,
  program_suitability: 5,
  quality: 5,
  partner: 3,
} as const;

export const BUDGET_RANGES: Record<string, { min: number; max: number }> = {
  economy: { min: 0, max: 5000 },
  mid: { min: 5000, max: 15000 },
  premium: { min: 15000, max: Infinity },
  any: { min: 0, max: Infinity },
};
