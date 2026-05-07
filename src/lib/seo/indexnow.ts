const ENDPOINT = "https://api.indexnow.org/indexnow";

function getBaseUrl(): string {
  return (process.env.NEXT_PUBLIC_APP_URL || "https://rehab-atlas.com").trim().replace(/\/$/, "");
}

function getHost(): string {
  return new URL(getBaseUrl()).host;
}

export async function pingIndexNow(urlOrUrls: string | string[]): Promise<void> {
  const key = process.env.INDEXNOW_KEY;
  if (!key) return;

  const urls = Array.isArray(urlOrUrls) ? urlOrUrls : [urlOrUrls];
  if (urls.length === 0) return;

  const baseUrl = getBaseUrl();
  const absoluteUrls = urls.map((u) => (u.startsWith("http") ? u : `${baseUrl}${u.startsWith("/") ? u : `/${u}`}`));

  try {
    const res = await fetch(ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json; charset=utf-8" },
      body: JSON.stringify({
        host: getHost(),
        key,
        keyLocation: `${baseUrl}/api/seo/indexnow-key`,
        urlList: absoluteUrls,
      }),
    });

    if (!res.ok && res.status !== 202) {
      console.warn(`IndexNow ping returned ${res.status} for ${absoluteUrls.length} URL(s)`);
    }
  } catch (err) {
    console.warn("IndexNow ping failed:", err);
  }
}
