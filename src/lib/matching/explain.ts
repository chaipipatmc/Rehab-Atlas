import type { AssessmentAnswers, MatchExplanation, ScoredCenter } from "@/types/assessment";
import type { Center } from "@/types/center";

const LABEL_MAP: Record<string, string> = {
  substance_use: "substance use",
  mental_health: "mental health",
  dual_diagnosis: "dual diagnosis",
  eating_disorder: "eating disorders",
  behavioral: "behavioral health",
};

function humanize(val: string): string {
  return LABEL_MAP[val] || val.replace(/_/g, " ");
}

/**
 * Template-based explanation — free, instant, no API dependency.
 * Produces quality explanations from structured data.
 */
function generateTemplateExplanation(
  answers: AssessmentAnswers,
  match: ScoredCenter,
  center: Center
): MatchExplanation {
  const location = [center.city, center.country].filter(Boolean).join(", ");
  const focusLabels = center.treatment_focus.slice(0, 2).map(humanize);
  const serviceLabels = center.services.slice(0, 3).map(humanize);
  const issue = answers.primary_issue.map(humanize).join(" and ");

  // Build explanation sentences
  const sentences: string[] = [];

  // Sentence 1: Why this center fits
  if (focusLabels.length > 0) {
    sentences.push(
      `${center.name} in ${location} specializes in ${focusLabels.join(" and ")}, which aligns with your needs around ${issue}.`
    );
  } else {
    sentences.push(
      `${center.name} in ${location} may be well-suited based on your responses regarding ${issue}.`
    );
  }

  // Sentence 2: Services/setting
  if (serviceLabels.length > 0) {
    const settingNote = center.setting_type
      ? ` in a ${humanize(center.setting_type)} setting`
      : "";
    sentences.push(
      `They offer ${serviceLabels.join(", ")} services${settingNote}.`
    );
  }

  // Sentence 3: Detox/severity specific
  if (answers.needs_detox && center.services.includes("detox")) {
    sentences.push("Their medical detox program may support a safe transition into treatment.");
  } else if (answers.severity === "severe") {
    sentences.push("Their comprehensive program may be appropriate given the severity of your situation.");
  }

  // Fit summary
  const strength = match.score >= 70 ? "Strong" : match.score >= 50 ? "Good" : "Potential";
  const focusSummary = focusLabels[0] || "treatment";
  const settingSummary = center.setting_type ? humanize(center.setting_type) : "therapeutic";

  return {
    center_id: match.center_id,
    explanation: sentences.join(" ").slice(0, 500),
    fit_summary: `${strength} match for ${focusSummary} in a ${settingSummary} setting`,
  };
}

/**
 * AI-enhanced explanation using Claude API.
 * Only called when ANTHROPIC_API_KEY is configured.
 */
async function generateAIExplanation(
  answers: AssessmentAnswers,
  match: ScoredCenter,
  center: Center
): Promise<MatchExplanation> {
  try {
    // Dynamic import to avoid crash when package not needed
    const Anthropic = (await import("@anthropic-ai/sdk")).default;
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 300,
      system: `You are a compassionate treatment matching assistant for Rehab-Atlas.
Explain why a rehab center may suit someone based on their assessment responses.
Rules: Never diagnose. Never guarantee outcomes. Use "may be suitable", "based on your responses".
Be warm, concise, and factual. Respond ONLY with valid JSON.`,
      messages: [
        {
          role: "user",
          content: `Assessment responses: ${JSON.stringify({
            who_for: answers.who_for,
            primary_issue: answers.primary_issue,
            severity: answers.severity,
            co_occurring: answers.co_occurring,
            budget: answers.budget,
            preferred_setting: answers.preferred_setting,
            needs_detox: answers.needs_detox,
          })}

Center: ${center.name}, ${center.city || ""}, ${center.country}
Focus: ${center.treatment_focus.join(", ")}
Services: ${center.services.join(", ")}
Setting: ${center.setting_type || "various"}
Score: ${match.score}/100

Write a JSON object with:
- "explanation": 2-3 sentence explanation of why this center may fit
- "fit_summary": one-line fit summary (e.g. "Strong match for dual diagnosis in a residential setting")`,
        },
      ],
    });

    const text =
      response.content[0].type === "text" ? response.content[0].text : "";
    const parsed = JSON.parse(text);

    if (
      typeof parsed.explanation !== "string" ||
      typeof parsed.fit_summary !== "string"
    ) {
      throw new Error("Invalid AI response format");
    }

    return {
      center_id: match.center_id,
      explanation: parsed.explanation.slice(0, 500),
      fit_summary: parsed.fit_summary.slice(0, 200),
    };
  } catch {
    // Fall back to template if AI fails
    return generateTemplateExplanation(answers, match, center);
  }
}

/**
 * Generate match explanations.
 * Uses template-based by default. Uses Claude AI when ANTHROPIC_API_KEY is set.
 */
export async function generateExplanations(
  answers: AssessmentAnswers,
  matches: ScoredCenter[],
  centersMap: Map<string, Center>
): Promise<MatchExplanation[]> {
  const useAI = !!process.env.ANTHROPIC_API_KEY;

  const explanations = await Promise.all(
    matches.map((match) => {
      const center = centersMap.get(match.center_id);
      if (!center) {
        return Promise.resolve({
          center_id: match.center_id,
          explanation: "This center may be a suitable option based on your responses.",
          fit_summary: "Potential match",
        });
      }

      if (useAI) {
        return generateAIExplanation(answers, match, center);
      }
      return Promise.resolve(generateTemplateExplanation(answers, match, center));
    })
  );

  return explanations;
}
