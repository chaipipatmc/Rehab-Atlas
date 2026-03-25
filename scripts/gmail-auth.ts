/**
 * Gmail OAuth2 Setup Script
 * Run this once to obtain a refresh token for info@rehab-atlas.com
 *
 * Prerequisites:
 * 1. Create a Google Cloud project at console.cloud.google.com
 * 2. Enable the Gmail API
 * 3. Create OAuth2 Web Application credentials
 * 4. Set redirect URI to http://localhost:3000/callback
 *
 * Usage:
 *   npx tsx scripts/gmail-auth.ts
 *
 * Then open the URL printed in the console, authorize with info@rehab-atlas.com,
 * and the script will print your refresh token.
 */

import http from "http";
import { URL } from "url";

const CLIENT_ID = process.env.GMAIL_CLIENT_ID || "";
const CLIENT_SECRET = process.env.GMAIL_CLIENT_SECRET || "";
const REDIRECT_URI = "http://localhost:3456/callback";
const SCOPES = [
  "https://www.googleapis.com/auth/gmail.send",
  "https://www.googleapis.com/auth/gmail.readonly",
  "https://www.googleapis.com/auth/gmail.modify",
].join(" ");

if (!CLIENT_ID || !CLIENT_SECRET) {
  console.error("Error: Set GMAIL_CLIENT_ID and GMAIL_CLIENT_SECRET environment variables first.");
  console.error("Example:");
  console.error("  GMAIL_CLIENT_ID=xxx GMAIL_CLIENT_SECRET=yyy npx tsx scripts/gmail-auth.ts");
  process.exit(1);
}

// Build authorization URL
const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?${new URLSearchParams({
  client_id: CLIENT_ID,
  redirect_uri: REDIRECT_URI,
  response_type: "code",
  scope: SCOPES,
  access_type: "offline",
  prompt: "consent",
}).toString()}`;

console.log("\n=== Gmail OAuth2 Setup ===\n");
console.log("1. Open this URL in your browser:\n");
console.log(`   ${authUrl}\n`);
console.log("2. Sign in with info@rehab-atlas.com");
console.log("3. Authorize the application");
console.log("4. You'll be redirected — the refresh token will be printed here.\n");
console.log("Waiting for callback on http://localhost:3000/callback ...\n");

// Start a temporary server to receive the OAuth callback
const server = http.createServer(async (req, res) => {
  const url = new URL(req.url || "/", `http://localhost:3000`);

  if (url.pathname === "/callback") {
    const code = url.searchParams.get("code");

    if (!code) {
      res.writeHead(400, { "Content-Type": "text/html" });
      res.end("<h1>Error: No authorization code received</h1>");
      return;
    }

    // Exchange code for tokens
    try {
      const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          code,
          client_id: CLIENT_ID,
          client_secret: CLIENT_SECRET,
          redirect_uri: REDIRECT_URI,
          grant_type: "authorization_code",
        }).toString(),
      });

      const tokens = await tokenResponse.json();

      if (tokens.refresh_token) {
        console.log("\n=== SUCCESS ===\n");
        console.log("Add these to your .env.local file:\n");
        console.log(`GMAIL_CLIENT_ID=${CLIENT_ID}`);
        console.log(`GMAIL_CLIENT_SECRET=${CLIENT_SECRET}`);
        console.log(`GMAIL_REFRESH_TOKEN=${tokens.refresh_token}`);
        console.log(`GMAIL_OUTREACH_EMAIL=info@rehab-atlas.com`);
        console.log("\n===============\n");

        res.writeHead(200, { "Content-Type": "text/html" });
        res.end(`
          <h1>Success!</h1>
          <p>Your refresh token has been printed in the terminal.</p>
          <p>Add it to your <code>.env.local</code> file and you're all set.</p>
          <p>You can close this tab now.</p>
        `);
      } else {
        console.error("No refresh token received:", tokens);
        res.writeHead(400, { "Content-Type": "text/html" });
        res.end(`<h1>Error</h1><pre>${JSON.stringify(tokens, null, 2)}</pre>`);
      }
    } catch (err) {
      console.error("Token exchange failed:", err);
      res.writeHead(500, { "Content-Type": "text/html" });
      res.end("<h1>Token exchange failed</h1>");
    }

    // Shut down after a brief delay
    setTimeout(() => {
      server.close();
      process.exit(0);
    }, 1000);
  } else {
    res.writeHead(404);
    res.end("Not found");
  }
});

server.listen(3456, () => {
  // Server is ready
});
