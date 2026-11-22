/**
 * Read a required env var for one-off maintenance scripts.
 * Keys are never hard-coded in scripts/ (lint: rehab secret-literal rule);
 * load them from your local, untracked .env.local, e.g.
 *   node --env-file=.env.local scripts/seed-pages.js
 */
function requireEnv(name) {
  const value = (process.env[name] || "").trim();
  if (!value) {
    console.error(`Missing env ${name}. Run with: node --env-file=.env.local <script>`);
    process.exit(1);
  }
  return value;
}

module.exports = { requireEnv };
