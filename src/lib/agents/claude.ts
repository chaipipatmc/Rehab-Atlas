/**
 * Rehab-Atlas Agent System — Claude AI Wrapper
 * Shared Claude analysis function with Zod validation + template fallback.
 */

import { z } from "zod";

/**
 * Call Claude API for agent analysis.
 * Returns parsed, validated JSON or null on failure.
 */
export async function analyzeWithClaude<T>(params: {
  systemPrompt: string;
  userPrompt: string;
  responseSchema: z.ZodType<T>;
  maxTokens?: number;
}): Promise<T | null> {
  if (!process.env.ANTHROPIC_API_KEY) return null;

  try {
    const Anthropic = (await import("@anthropic-ai/sdk")).default;
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: params.maxTokens || 500,
      system: params.systemPrompt,
      messages: [{ role: "user", content: params.userPrompt }],
    });

    const text = response.content[0].type === "text" ? response.content[0].text : "";

    // Extract JSON from response (handle markdown code blocks)
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;

    const parsed = JSON.parse(jsonMatch[0]);
    const validated = params.responseSchema.safeParse(parsed);

    if (!validated.success) {
      console.error("Claude response validation failed:", validated.error.message);
      return null;
    }

    return validated.data;
  } catch (err) {
    console.error("Claude agent analysis failed:", err);
    return null;
  }
}
