// Check unread messages in info@rehab-atlas.com via Gmail API
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
if (!access_token) {
  console.error("Token refresh failed:", await tokenRes.text());
  process.exit(1);
}

const query = encodeURIComponent("is:unread in:inbox -category:promotions -category:social");
const listRes = await fetch(
  `https://www.googleapis.com/gmail/v1/users/me/messages?q=${query}&maxResults=50`,
  { headers: { Authorization: `Bearer ${access_token}` } }
);
const list = await listRes.json();
const msgs = list.messages || [];
console.log(`Found ${msgs.length} unread messages (primary/updates)\n`);

const out = [];
for (const m of msgs) {
  const r = await fetch(
    `https://www.googleapis.com/gmail/v1/users/me/messages/${m.id}?format=metadata&metadataHeaders=From&metadataHeaders=To&metadataHeaders=Subject&metadataHeaders=Date`,
    { headers: { Authorization: `Bearer ${access_token}` } }
  );
  const full = await r.json();
  const h = (n) =>
    (full.payload?.headers || []).find((x) => x.name.toLowerCase() === n.toLowerCase())?.value || "";
  out.push({
    id: m.id,
    threadId: full.threadId,
    from: h("From"),
    subject: h("Subject"),
    date: h("Date"),
    snippet: full.snippet,
  });
}

console.log(JSON.stringify(out, null, 2));
