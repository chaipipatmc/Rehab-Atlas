import { readFileSync } from "fs";
import { resolve } from "path";

const env = readFileSync(resolve(".env.local"), "utf-8");
const getVar = (k) => {
  const m = env.match(new RegExp(`^${k}=(.*)$`, "m"));
  return m ? m[1].trim() : "";
};

const clientId = getVar("GMAIL_CLIENT_ID");
const clientSecret = getVar("GMAIL_CLIENT_SECRET");
const refreshToken = getVar("GMAIL_REFRESH_TOKEN");

const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
  method: "POST",
  headers: { "Content-Type": "application/x-www-form-urlencoded" },
  body: new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    refresh_token: refreshToken,
    grant_type: "refresh_token",
  }).toString(),
});
const { access_token } = await tokenRes.json();

const threadIds = process.argv.slice(2);

function decodeBase64Url(s) {
  return Buffer.from(s, "base64url").toString("utf-8");
}

function extractBody(payload) {
  if (!payload) return "";
  if (payload.body?.data) return decodeBase64Url(payload.body.data);
  if (payload.parts) {
    const text = payload.parts.find((p) => p.mimeType === "text/plain");
    if (text?.body?.data) return decodeBase64Url(text.body.data);
    for (const p of payload.parts) {
      const inner = extractBody(p);
      if (inner) return inner;
    }
  }
  return "";
}

for (const tid of threadIds) {
  const r = await fetch(`https://www.googleapis.com/gmail/v1/users/me/threads/${tid}?format=full`, {
    headers: { Authorization: `Bearer ${access_token}` },
  });
  const t = await r.json();
  console.log(`\n====== THREAD ${tid} ======`);
  for (const m of t.messages || []) {
    const h = (n) =>
      (m.payload?.headers || []).find((x) => x.name.toLowerCase() === n.toLowerCase())?.value || "";
    const body = extractBody(m.payload).slice(0, 3000);
    console.log(`\n--- From: ${h("From")} | Date: ${h("Date")} | Subject: ${h("Subject")}`);
    console.log(body);
  }
}
