# Solar Monitor (personal project — not part of RehabAtlas)

Daily FusionSolar performance report via GitHub Actions. Logs into
[intl.fusionsolar.huawei.com](https://intl.fusionsolar.huawei.com) headlessly,
pulls plant KPIs (daily yield, normal/faulty/offline status), and:

- prints the report in the Actions run log
- uploads `report.md`, `report.json`, and dashboard screenshots as a run artifact (kept 30 days)
- emails the summary via Resend when `RESEND_API_KEY` is configured

## Setup (one-time)

Repo → **Settings → Secrets and variables → Actions**:

| Type | Name | Value |
|---|---|---|
| Secret | `FUSIONSOLAR_USERNAME` | FusionSolar login username |
| Secret | `FUSIONSOLAR_PASSWORD` | FusionSolar login password |
| Secret | `RESEND_API_KEY` | (optional) Resend API key for the email step |
| Variable | `SOLAR_REPORT_TO` | (optional) recipient email, defaults to chaipipat.mc@gmail.com |

## Running

- **Manual:** Actions tab → "Solar Daily Report" → Run workflow.
- **Scheduled:** daily at 20:30 Asia/Bangkok (13:30 UTC). Note GitHub only runs
  scheduled workflows from the **default branch**, so the cron activates once
  this is merged to `master`.

## Known limitations

- If FusionSolar shows a CAPTCHA at login, the run fails with a clear message.
  The durable fix is a FusionSolar **Northbound (OpenAPI) account** (ask the
  installer/O&M admin: System → Company Management → Northbound Management),
  which this script can be switched to easily.
- Portal REST endpoints are undocumented; if extraction fails the run still
  captures screenshots + raw dashboard text in the artifact for debugging.
