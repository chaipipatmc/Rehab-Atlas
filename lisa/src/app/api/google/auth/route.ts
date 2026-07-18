import { requireEnv } from "@/lib/env";
import { oauthConsentUrl } from "@/lib/google";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const key = url.searchParams.get("key");
  if (key !== requireEnv("CRON_SECRET")) {
    return new Response("unauthorized — open /api/google/auth?key=<CRON_SECRET>", { status: 401 });
  }
  return Response.redirect(oauthConsentUrl(key), 302);
}
