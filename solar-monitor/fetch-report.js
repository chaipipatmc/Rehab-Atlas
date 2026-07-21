/**
 * FusionSolar daily performance report.
 *
 * Logs into Huawei FusionSolar (intl.fusionsolar.huawei.com) with a normal
 * user account via headless Chromium, pulls the plant list + KPIs through the
 * portal's own REST endpoints (using the authenticated browser session), and
 * writes out/report.md + out/report.json + screenshots. Optionally emails the
 * summary via Resend.
 *
 * Env:
 *   FUSIONSOLAR_USERNAME  (required)
 *   FUSIONSOLAR_PASSWORD  (required)
 *   RESEND_API_KEY        (optional — enables the email step)
 *   REPORT_TO             (default: chaipipat.mc@gmail.com)
 *   REPORT_FROM           (default: Solar Monitor <onboarding@resend.dev>)
 */
const fs = require("fs");
const path = require("path");
const { chromium } = require("playwright");

const BASE = "https://intl.fusionsolar.huawei.com";
const PORTAL_URL = `${BASE}/uniportal/pvmswebsite/assets/build/cloud.html#/home/list`;
const OUT = path.join(__dirname, "out");
fs.mkdirSync(OUT, { recursive: true });

const USERNAME = process.env.FUSIONSOLAR_USERNAME;
const PASSWORD = process.env.FUSIONSOLAR_PASSWORD;
if (!USERNAME || !PASSWORD) {
  console.error("Missing FUSIONSOLAR_USERNAME / FUSIONSOLAR_PASSWORD env vars.");
  process.exit(1);
}

const shot = async (page, name) => {
  try {
    await page.screenshot({ path: path.join(OUT, `${name}.png`), fullPage: false });
    console.log(`[shot] ${name}.png`);
  } catch (e) {
    console.warn(`[shot] ${name} failed: ${e.message}`);
  }
};

async function fillFirst(page, selectors, value, label) {
  for (const sel of selectors) {
    const loc = page.locator(sel).first();
    try {
      if (await loc.isVisible({ timeout: 2000 })) {
        await loc.fill(value);
        console.log(`[login] filled ${label} via ${sel}`);
        return true;
      }
    } catch {}
  }
  return false;
}

async function clickFirst(page, selectors, label) {
  for (const sel of selectors) {
    const loc = page.locator(sel).first();
    try {
      if (await loc.isVisible({ timeout: 2000 })) {
        await loc.click();
        console.log(`[login] clicked ${label} via ${sel}`);
        return true;
      }
    } catch {}
  }
  return false;
}

async function dumpFormElements(page) {
  const info = await page.evaluate(() =>
    Array.from(document.querySelectorAll("input, button"))
      .filter((el) => el.offsetWidth || el.offsetHeight)
      .map((el) => ({
        tag: el.tagName,
        type: el.type,
        id: el.id,
        name: el.name,
        placeholder: el.placeholder,
        cls: String(el.className).slice(0, 60),
        text: (el.innerText || el.value || "").slice(0, 30),
      }))
  );
  console.log("[dom] visible inputs/buttons:", JSON.stringify(info, null, 1));
}

async function login(page) {
  console.log("[login] navigating to portal...");
  await page.goto(PORTAL_URL, { waitUntil: "domcontentloaded", timeout: 90000 });
  await page.waitForTimeout(10000);
  console.log("[login] landed on:", page.url());
  await shot(page, "01-landing");

  if (!page.url().includes("unisso") && !(await page.locator('input[type="password"]').count())) {
    console.log("[login] no login form detected — maybe already authenticated");
    return;
  }

  await dumpFormElements(page);

  const userOk = await fillFirst(
    page,
    ['input[id="username"]', 'input[name="username"]', ".username input", 'input[placeholder*="sername"]', 'input[placeholder*="ccount"]', 'input[type="text"]'],
    USERNAME,
    "username"
  );
  const passOk = await fillFirst(
    page,
    ['input[id="password"]', 'input[name="password"]', ".password input", 'input[type="password"]'],
    PASSWORD,
    "password"
  );
  if (!userOk || !passOk) {
    await shot(page, "02-login-form-not-found");
    throw new Error("Could not locate username/password fields — see screenshots + DOM dump above.");
  }

  // Captcha detection: FusionSolar sometimes shows a verify-code input.
  const captcha = await page
    .locator('input[id*="verify" i], input[name*="verify" i], input[placeholder*="erification" i], img.verifycode')
    .count();
  if (captcha > 0) {
    await shot(page, "02-captcha-detected");
    throw new Error(
      "CAPTCHA detected on the login page. Automated login is blocked for this run — " +
        "consider requesting a FusionSolar Northbound (OpenAPI) account for reliable automation."
    );
  }

  await shot(page, "02-login-filled");
  const clicked = await clickFirst(
    page,
    ["#submitDataverify", "#loginBtn", 'button[type="submit"]', ".login-btn", 'span:text-is("Log In")', 'button:has-text("Log In")', 'div[class*="submit"]'],
    "login button"
  );
  if (!clicked) {
    await page.keyboard.press("Enter");
    console.log("[login] no button matched — pressed Enter instead");
  }

  await page.waitForTimeout(15000);
  console.log("[login] post-submit URL:", page.url());
  await shot(page, "03-post-login");

  const stillOnLogin = page.url().includes("unisso") || (await page.locator('input[type="password"]:visible').count()) > 0;
  if (stillOnLogin) {
    const errText = await page
      .locator('[class*="error" i], [class*="tip" i], [class*="msg" i]')
      .allInnerTexts()
      .then((t) => t.filter(Boolean).join(" | "))
      .catch(() => "");
    throw new Error(`Login appears to have failed (still on login page). Page messages: ${errText || "none captured"}`);
  }
  console.log("[login] success");
}

async function restPost(page, url, body, csrf) {
  return page.evaluate(
    async ({ url, body, csrf }) => {
      const res = await fetch(url, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json", roarand: csrf || "" },
        body: JSON.stringify(body),
      });
      const text = await res.text();
      try {
        return { status: res.status, json: JSON.parse(text) };
      } catch {
        return { status: res.status, text: text.slice(0, 500) };
      }
    },
    { url, body, csrf }
  );
}

async function getCsrf(page) {
  const r = await page.evaluate(async () => {
    const res = await fetch("/unisess/v1/auth/session", { credentials: "include" });
    try {
      return await res.json();
    } catch {
      return null;
    }
  });
  const token = r && (r.csrfToken || r.csrf || (r.data && r.data.csrfToken));
  console.log("[csrf]", token ? "obtained" : `not found (${JSON.stringify(r).slice(0, 200)})`);
  return token || "";
}

async function fetchStations(page, csrf) {
  const attempts = [
    {
      url: "/rest/pvms/web/station/v1/station/station-list",
      body: {
        curPage: 1,
        pageSize: 100,
        gridConnectedTime: "",
        queryTime: Date.now(),
        timeZone: 7,
        sortId: "createTime",
        sortDir: "DESC",
        locale: "en_US",
      },
    },
    { url: "/rest/pvms/web/station/v1/station/station-list", body: { curPage: 1, pageSize: 100 } },
  ];
  for (const a of attempts) {
    const r = await restPost(page, a.url, a.body, csrf);
    console.log(`[stations] ${a.url} -> HTTP ${r.status}`);
    const list = r.json && r.json.data && (r.json.data.list || r.json.data);
    if (r.status === 200 && Array.isArray(list) && list.length) return list;
    if (r.json) console.log("[stations] payload head:", JSON.stringify(r.json).slice(0, 400));
    if (r.text) console.log("[stations] text head:", r.text);
  }
  return null;
}

async function scrapePlantListDom(page) {
  // Fallback: read whatever the plant-list table renders.
  await page.goto(PORTAL_URL, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(20000);
  await shot(page, "04-plant-list");
  const text = await page.evaluate(() => document.body.innerText.slice(0, 8000));
  fs.writeFileSync(path.join(OUT, "plant-list-dom.txt"), text);
  console.log("[dom-fallback] saved plant-list-dom.txt (first 500 chars):\n", text.slice(0, 500));
  return text;
}

function buildReport(stations, domText) {
  const date = new Date().toLocaleDateString("en-GB", { timeZone: "Asia/Bangkok" });
  const lines = [`# Solar Daily Report — ${date}`, ""];
  const summary = { date, totalPlants: 0, normal: 0, faulty: 0, offline: 0, totalDailyKwh: 0, totalCapacityKw: 0, plants: [] };

  if (stations) {
    for (const s of stations) {
      const name = s.plantName || s.stationName || s.name || "?";
      const capacity = Number(s.capacity || s.installedCapacity || 0);
      const daily = Number(s.dailyEnergy || s.dayPower || s.day_power || 0);
      const status = String(s.plantStatus ?? s.healthState ?? s.stationLinkman ?? "unknown");
      // FusionSolar healthState: 1=disconnected, 2=faulty, 3=healthy (per API docs)
      const statusLabel =
        status === "3" || /healthy|normal|connected/i.test(status) ? "normal" :
        status === "2" || /fault/i.test(status) ? "faulty" :
        status === "1" || /disconnect|offline/i.test(status) ? "offline" : status;
      summary.totalPlants++;
      summary.totalDailyKwh += daily;
      summary.totalCapacityKw += capacity;
      if (statusLabel === "normal") summary.normal++;
      else if (statusLabel === "faulty") summary.faulty++;
      else if (statusLabel === "offline") summary.offline++;
      summary.plants.push({ name, capacity, dailyKwh: daily, status: statusLabel });
    }
    lines.push(
      `**Plants:** ${summary.totalPlants} total — ${summary.normal} normal, ${summary.faulty} faulty, ${summary.offline} offline`,
      `**Total capacity:** ${summary.totalCapacityKw.toLocaleString()} kW`,
      `**Today's yield:** ${summary.totalDailyKwh.toLocaleString()} kWh`,
      "",
      "| Plant | Capacity (kW) | Daily yield (kWh) | Status |",
      "|---|---:|---:|---|",
      ...summary.plants.map((p) => `| ${p.name} | ${p.capacity} | ${p.dailyKwh} | ${p.status} |`)
    );
  } else {
    lines.push("REST API extraction failed this run — raw dashboard text captured below (see screenshots in artifacts).", "", "```", (domText || "").slice(0, 3000), "```");
  }

  const md = lines.join("\n");
  fs.writeFileSync(path.join(OUT, "report.md"), md);
  fs.writeFileSync(path.join(OUT, "report.json"), JSON.stringify(summary, null, 2));
  console.log("\n===== REPORT =====\n" + md + "\n==================\n");
  return { md, summary };
}

async function sendEmail(md, summary) {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    console.log("[email] RESEND_API_KEY not set — skipping email step.");
    return;
  }
  const to = process.env.REPORT_TO || "chaipipat.mc@gmail.com";
  const from = process.env.REPORT_FROM || "Solar Monitor <onboarding@resend.dev>";
  const html = md
    .replace(/^# (.*)$/m, "<h2>$1</h2>")
    .replace(/\*\*(.*?)\*\*/g, "<b>$1</b>")
    .replace(/\n/g, "<br>");
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from, to, subject: `☀️ Solar Daily Report — ${summary.date}`, html }),
  });
  console.log(`[email] Resend responded ${res.status}: ${(await res.text()).slice(0, 200)}`);
}

(async () => {
  const browser = await chromium.launch({ headless: true, args: ["--no-sandbox"] });
  const ctx = await browser.newContext({ viewport: { width: 1600, height: 1000 }, locale: "en-US" });
  const page = await ctx.newPage();
  page.setDefaultTimeout(60000);

  try {
    await login(page);
    const csrf = await getCsrf(page);
    let stations = await fetchStations(page, csrf);
    let domText = null;
    if (!stations) domText = await scrapePlantListDom(page);
    const { md, summary } = buildReport(stations, domText);
    await sendEmail(md, summary);
  } catch (e) {
    console.error("FAILED:", e.message);
    await shot(page, "99-error");
    fs.writeFileSync(path.join(OUT, "error.txt"), String(e.stack || e.message));
    process.exitCode = 1;
  } finally {
    await browser.close();
  }
})();
