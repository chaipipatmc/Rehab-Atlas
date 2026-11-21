/**
 * Outreach sender identity — the single source for the persona name used in
 * email signatures, the AI tone prompt and the Gmail "From" display name.
 *
 * Resolution order: /admin/agents setting (outreach_research.persona_name)
 * → OUTREACH_PERSONA_NAME env → DEFAULT_PERSONA_NAME.
 */

export const DEFAULT_PERSONA_NAME = "The Rehab-Atlas Team";

export const DEFAULT_PERSONA = (process.env.OUTREACH_PERSONA_NAME || "").trim() || DEFAULT_PERSONA_NAME;

export const OUTREACH_EMAIL = (process.env.GMAIL_OUTREACH_EMAIL || "info@rehab-atlas.com").trim();

/** Persona name from admin settings, falling back to env, then the default. */
export async function resolvePersona(): Promise<string> {
  try {
    const { getAgentSettingString } = await import("../config");
    const name = (await getAgentSettingString("outreach_research", "persona_name", DEFAULT_PERSONA)).trim();
    return name || DEFAULT_PERSONA;
  } catch {
    return DEFAULT_PERSONA;
  }
}

/**
 * Make a display name safe for an RFC 5322 header: printable ASCII only,
 * no quotes, backslashes, angle brackets or line breaks.
 */
export function toHeaderSafeName(name: string): string {
  const safe = name
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u2014\u2013]/g, "-")
    .replace(/[^\x20-\x7E]/g, "")
    .replace(/["\\<>]/g, "")
    .replace(/\s+/g, " ")
    .trim();
  return safe || DEFAULT_PERSONA_NAME;
}

/** Format a From header value: "Display Name" <email>. */
export function formatFromAddress(name: string, email: string = OUTREACH_EMAIL): string {
  return `"${toHeaderSafeName(name)}" <${email}>`;
}

/** The exact From header value the next outreach email will be sent with. */
export async function resolveFromAddress(): Promise<string> {
  return formatFromAddress(await resolvePersona());
}
