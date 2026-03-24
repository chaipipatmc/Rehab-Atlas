import type { AssessmentAnswers, ScoredCenter } from "@/types/assessment";
import type { Center } from "@/types/center";
import { SCORING_WEIGHTS, BUDGET_RANGES } from "./weights";

function arrayOverlap(a: string[], b: string[]): number {
  if (a.length === 0 || b.length === 0) return 0;
  const setB = new Set(b.map((s) => s.toLowerCase()));
  const matches = a.filter((item) => setB.has(item.toLowerCase())).length;
  return matches / Math.max(a.length, 1);
}

function scoreCenter(
  answers: AssessmentAnswers,
  center: Center
): { score: number; breakdown: Record<string, number> } {
  const breakdown: Record<string, number> = {};

  // 1. Treatment focus match (0-25)
  const focusOverlap = arrayOverlap(
    answers.primary_issue,
    center.treatment_focus
  );
  breakdown.treatment_focus = Math.round(
    focusOverlap * SCORING_WEIGHTS.treatment_focus
  );

  // 2. Conditions match (0-15)
  if (answers.co_occurring.length > 0) {
    const condOverlap = arrayOverlap(answers.co_occurring, center.conditions);
    breakdown.conditions = Math.round(
      condOverlap * SCORING_WEIGHTS.conditions
    );
  } else {
    breakdown.conditions = SCORING_WEIGHTS.conditions * 0.5; // neutral
  }

  // 3. Services match (0-15)
  let serviceScore = 0;
  if (answers.needs_detox && center.has_detox) {
    serviceScore += 8;
  } else if (answers.needs_detox && !center.has_detox) {
    serviceScore -= 5; // penalty
  }
  if (answers.preferred_setting !== "any") {
    const settingMatch =
      center.setting_type?.toLowerCase().includes(answers.preferred_setting) ||
      center.services.some((s) =>
        s.toLowerCase().includes(answers.preferred_setting)
      );
    serviceScore += settingMatch ? 7 : 0;
  } else {
    serviceScore += 5;
  }
  breakdown.services = Math.max(
    0,
    Math.min(SCORING_WEIGHTS.services, serviceScore)
  );

  // 4. Budget match (0-15)
  const budgetRange = BUDGET_RANGES[answers.budget];
  if (center.price_min !== null || center.price_max !== null) {
    const cMin = center.price_min ?? 0;
    const cMax = center.price_max ?? cMin;
    const overlap =
      cMin <= budgetRange.max && cMax >= budgetRange.min;
    breakdown.budget = overlap ? SCORING_WEIGHTS.budget : 0;
  } else {
    breakdown.budget = SCORING_WEIGHTS.budget * 0.4; // unknown pricing, mild score
  }

  // 5. Location match (0-10)
  if (answers.preferred_country) {
    const countryMatch =
      center.country?.toLowerCase() ===
      answers.preferred_country.toLowerCase();
    breakdown.location = countryMatch ? SCORING_WEIGHTS.location : 0;
  } else {
    breakdown.location = SCORING_WEIGHTS.location * 0.5;
  }

  // 6. Insurance match (0-10)
  if (answers.insurance_provider) {
    const insMatch = center.insurance.some(
      (ins) =>
        ins.toLowerCase().includes(answers.insurance_provider!.toLowerCase())
    );
    breakdown.insurance = insMatch ? SCORING_WEIGHTS.insurance : 0;
  } else {
    breakdown.insurance = SCORING_WEIGHTS.insurance * 0.3;
  }

  // 7. Program suitability (0-5)
  let suitability = 0;
  if (answers.severity === "severe") {
    if (
      center.services.some((s) =>
        ["residential", "inpatient", "detox"].some((k) =>
          s.toLowerCase().includes(k)
        )
      )
    ) {
      suitability = 5;
    }
  } else if (answers.severity === "mild") {
    if (
      center.services.some((s) => s.toLowerCase().includes("outpatient"))
    ) {
      suitability = 5;
    }
  } else {
    suitability = 3;
  }
  breakdown.program_suitability = suitability;

  // 8. Quality bonus (0-5)
  breakdown.quality = center.editorial_overall
    ? Math.round(Number(center.editorial_overall))
    : 0;

  // 9. Partner bonus (0-3)
  let partnerBonus = 0;
  if (center.trusted_partner) partnerBonus += 2;
  if (center.verified_profile) partnerBonus += 1;
  breakdown.partner = partnerBonus;

  const score = Object.values(breakdown).reduce((a, b) => a + b, 0);
  return { score, breakdown };
}

function shouldExclude(
  answers: AssessmentAnswers,
  center: Center
): boolean {
  // Exclude outpatient-only if user needs detox and center has no detox
  if (
    answers.needs_detox &&
    !center.has_detox &&
    center.setting_type?.toLowerCase() === "outpatient"
  ) {
    return true;
  }
  return false;
}

export function rankCenters(
  answers: AssessmentAnswers,
  centers: Center[]
): { primary: ScoredCenter[]; alternatives: ScoredCenter[] } {
  const scored: ScoredCenter[] = [];

  for (const center of centers) {
    if (shouldExclude(answers, center)) continue;

    const { score, breakdown } = scoreCenter(answers, center);
    scored.push({
      center_id: center.id,
      center_name: center.name,
      center_slug: center.slug,
      score,
      breakdown,
    });
  }

  scored.sort((a, b) => b.score - a.score);

  return {
    primary: scored.slice(0, 3),
    alternatives: scored.slice(3, 8),
  };
}
