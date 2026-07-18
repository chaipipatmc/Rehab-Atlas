export const dynamic = "force-dynamic";

const REQUIRED_ENVS = [
  "LINE_CHANNEL_SECRET",
  "LINE_CHANNEL_ACCESS_TOKEN",
  "LINE_OWNER_USER_ID",
  "GOOGLE_CLIENT_ID",
  "GOOGLE_CLIENT_SECRET",
  "LISA_BASE_URL",
  "ANTHROPIC_API_KEY",
  "SUPABASE_URL",
  "SUPABASE_SERVICE_ROLE_KEY",
  "CRON_SECRET",
];

export default function Home() {
  const rows = REQUIRED_ENVS.map((name) => ({ name, set: Boolean(process.env[name]) }));
  const allSet = rows.every((r) => r.set);
  return (
    <main style={{ maxWidth: 560, margin: "60px auto", padding: 24 }}>
      <h1 style={{ color: "#45636b" }}>Lisa 🤖📅</h1>
      <p>Personal LINE assistant for Google Calendar.</p>
      <h3>Environment checklist</h3>
      <ul style={{ lineHeight: 1.9, listStyle: "none", padding: 0 }}>
        {rows.map((r) => (
          <li key={r.name}>
            {r.set ? "✅" : "❌"} <code>{r.name}</code>
          </li>
        ))}
      </ul>
      <p style={{ color: "#8a9ba1" }}>
        {allSet
          ? "All env vars set. Connect Google Calendar via /api/google/auth?key=<CRON_SECRET>, then set the LINE webhook to /api/line/webhook."
          : "Set the missing env vars in Vercel project settings, then redeploy."}
      </p>
    </main>
  );
}
