import { requireEnv } from "@/lib/env";
import { exchangeCodeForTokens } from "@/lib/google";
import { setSetting } from "@/lib/supabase";

function html(body: string, status = 200): Response {
  return new Response(
    `<!doctype html><meta charset="utf-8"><body style="font-family:sans-serif;padding:40px">${body}</body>`,
    { status, headers: { "Content-Type": "text/html; charset=utf-8" } }
  );
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  if (url.searchParams.get("state") !== requireEnv("CRON_SECRET")) {
    return html("<h2>❌ Invalid state</h2>", 401);
  }
  const code = url.searchParams.get("code");
  if (!code) {
    return html(`<h2>❌ Authorization failed</h2><p>${url.searchParams.get("error") ?? ""}</p>`, 400);
  }

  const tokens = await exchangeCodeForTokens(code);
  if (!tokens.refresh_token) {
    return html(
      "<h2>⚠️ No refresh token returned</h2><p>Remove Lisa's access at <a href='https://myaccount.google.com/permissions'>Google account permissions</a> and try again.</p>",
      400
    );
  }

  await setSetting("google_refresh_token", tokens.refresh_token);
  await setSetting("google_access_token", tokens.access_token);
  await setSetting(
    "google_access_token_expires_at",
    new Date(Date.now() + tokens.expires_in * 1000).toISOString()
  );

  let email = "";
  if (tokens.id_token) {
    try {
      const payload = JSON.parse(
        Buffer.from(tokens.id_token.split(".")[1], "base64url").toString("utf8")
      );
      email = payload.email ?? "";
      if (email) await setSetting("google_account_email", email);
    } catch {
      // email is informational only
    }
  }

  return html(
    `<h2>✅ Google Calendar connected</h2><p>Account: <b>${email || "(unknown)"}</b></p><p>Lisa is ready — go back to LINE and say hi.</p>`
  );
}
