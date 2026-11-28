import { describe, expect, it } from "vitest";
import {
  isBotUserAgent,
  parseTrackedEvent,
  resolveEntryReferrer,
} from "@/lib/pageview";

const HOSTS = ["rehab-atlas.com"];

describe("resolveEntryReferrer", () => {
  it("records a visit with no entry referrer as direct (null)", () => {
    expect(resolveEntryReferrer("", HOSTS)).toBeNull();
    expect(resolveEntryReferrer("   ", HOSTS)).toBeNull();
    expect(resolveEntryReferrer(undefined, HOSTS)).toBeNull();
    expect(resolveEntryReferrer(null, HOSTS)).toBeNull();
  });

  it("never treats our own site as a referrer (incl. www)", () => {
    expect(resolveEntryReferrer("https://rehab-atlas.com/blog/x", HOSTS)).toBeNull();
    expect(resolveEntryReferrer("https://www.rehab-atlas.com/", HOSTS)).toBeNull();
  });

  it("keeps real external referrers", () => {
    expect(resolveEntryReferrer("https://www.google.com/", HOSTS)).toBe("https://www.google.com/");
    expect(resolveEntryReferrer("https://chatgpt.com/", HOSTS)).toBe("https://chatgpt.com/");
  });

  it("drops junk values", () => {
    expect(resolveEntryReferrer("not a url", HOSTS)).toBeNull();
    expect(resolveEntryReferrer("javascript:alert(1)", HOSTS)).toBeNull();
  });
});

describe("isBotUserAgent", () => {
  it.each([
    "",
    "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)",
    "Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko; compatible; GPTBot/1.2; +https://openai.com/gptbot)",
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/120.0.0.0 Safari/537.36",
    "curl/8.4.0",
    "python-requests/2.31.0",
    "Go-http-client/1.1",
    "Mozilla/5.0 (Linux; Android 11; moto g power (2022)) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/109.0.0.0 Mobile Safari/537.36 Chrome-Lighthouse",
  ])("flags %s", (ua) => {
    expect(isBotUserAgent(ua)).toBe(true);
  });

  it.each([
    "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_5) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Safari/605.1.15",
  ])("lets a browser through: %s", (ua) => {
    expect(isBotUserAgent(ua)).toBe(false);
  });
});

describe("parseTrackedEvent", () => {
  it("accepts only the allow-listed funnel events", () => {
    expect(parseTrackedEvent("cta_assessment_click")).toBe("cta_assessment_click");
    expect(parseTrackedEvent("assessment_step1_start")).toBe("assessment_step1_start");
    expect(parseTrackedEvent("email_entered")).toBeNull();
    expect(parseTrackedEvent(42)).toBeNull();
  });
});
