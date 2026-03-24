const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://jfpxyaajmarlfhcngszh.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpmcHh5YWFqbWFybGZoY25nc3poIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3Mzg5NDkyNCwiZXhwIjoyMDg5NDcwOTI0fQ.v0b7BQ8gv5SCmU23UHrEIg4-kJ8cicmKEoi7yirQgqI'
);

async function fetchWithTimeout(url, timeout = 10000) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      },
      redirect: 'follow',
    });
    clearTimeout(id);
    return res;
  } catch (e) {
    clearTimeout(id);
    throw e;
  }
}

function extractImages(html, baseUrl) {
  const images = [];
  const seen = new Set();

  function addImage(url, alt, priority) {
    if (!url || seen.has(url)) return;
    // Skip tiny icons, svgs, tracking pixels
    if (url.includes('favicon') || url.includes('.svg') || url.includes('1x1') || url.includes('pixel') || url.includes('logo') && url.length < 50) return;
    if (url.includes('data:image')) return;
    if (url.includes('facebook.com') || url.includes('google') || url.includes('twitter') || url.includes('linkedin')) return;

    // Make absolute URL
    try {
      const absolute = new URL(url, baseUrl).href;
      if (seen.has(absolute)) return;
      seen.add(absolute);
      images.push({ url: absolute, alt: alt || '', priority });
    } catch {}
  }

  // 1. Open Graph image (highest priority)
  const ogMatches = html.match(/<meta\s+(?:property|name)=["']og:image["']\s+content=["']([^"']+)["']/gi);
  if (ogMatches) {
    ogMatches.forEach(m => {
      const url = m.match(/content=["']([^"']+)["']/)?.[1];
      if (url) addImage(url, 'og-image', 0);
    });
  }
  // Also try reversed attribute order
  const ogMatches2 = html.match(/<meta\s+content=["']([^"']+)["']\s+(?:property|name)=["']og:image["']/gi);
  if (ogMatches2) {
    ogMatches2.forEach(m => {
      const url = m.match(/content=["']([^"']+)["']/)?.[1];
      if (url) addImage(url, 'og-image', 0);
    });
  }

  // 2. Twitter card image
  const twMatches = html.match(/<meta\s+(?:name|property)=["']twitter:image["']\s+content=["']([^"']+)["']/gi);
  if (twMatches) {
    twMatches.forEach(m => {
      const url = m.match(/content=["']([^"']+)["']/)?.[1];
      if (url) addImage(url, 'twitter-image', 1);
    });
  }

  // 3. Hero/banner images (large images in header/hero sections)
  const imgMatches = html.matchAll(/<img[^>]+src=["']([^"']+)["'][^>]*>/gi);
  let imgIndex = 0;
  for (const match of imgMatches) {
    const src = match[1];
    const alt = match[0].match(/alt=["']([^"']*?)["']/i)?.[1] || '';
    const fullTag = match[0].toLowerCase();

    // Prioritize large images, hero images, facility photos
    let priority = 10 + imgIndex;
    if (fullTag.includes('hero') || fullTag.includes('banner') || fullTag.includes('header')) priority = 2;
    if (fullTag.includes('facility') || fullTag.includes('building') || fullTag.includes('campus')) priority = 3;
    if (fullTag.includes('room') || fullTag.includes('interior') || fullTag.includes('pool')) priority = 4;
    if (alt.toLowerCase().includes('facility') || alt.toLowerCase().includes('center') || alt.toLowerCase().includes('building')) priority = 3;

    // Skip small/icon images
    const width = match[0].match(/width=["']?(\d+)/i)?.[1];
    if (width && parseInt(width) < 100) continue;

    addImage(src, alt, priority);
    imgIndex++;
  }

  // 4. CSS background images
  const bgMatches = html.matchAll(/background(?:-image)?\s*:\s*url\(["']?([^"')]+)["']?\)/gi);
  for (const match of bgMatches) {
    addImage(match[1], 'background', 5);
  }

  // Sort by priority, take top 5
  images.sort((a, b) => a.priority - b.priority);
  return images.slice(0, 5);
}

async function scrapeCenter(center) {
  if (!center.website_url) return [];

  let url = center.website_url;
  if (!url.startsWith('http')) url = 'https://' + url;

  try {
    const res = await fetchWithTimeout(url);
    if (!res.ok) {
      console.log(`  HTTP ${res.status} for ${center.name}`);
      return [];
    }
    const html = await res.text();
    const images = extractImages(html, url);
    return images;
  } catch (e) {
    console.log(`  FAIL ${center.name}: ${e.message}`);
    return [];
  }
}

async function verifyImageUrl(url) {
  try {
    const res = await fetchWithTimeout(url, 5000);
    const ct = res.headers.get('content-type') || '';
    return res.ok && (ct.includes('image') || ct.includes('octet'));
  } catch {
    return false;
  }
}

async function main() {
  // Get all centers with URLs
  const { data: centers } = await supabase
    .from('centers')
    .select('id, name, website_url')
    .eq('status', 'published')
    .not('website_url', 'is', null)
    .order('name');

  console.log(`Scraping photos from ${centers.length} centers...\n`);

  let totalPhotos = 0;

  for (const center of centers) {
    process.stdout.write(`${center.name}... `);

    const images = await scrapeCenter(center);

    if (images.length === 0) {
      console.log('no images found');
      continue;
    }

    // Verify first image is actually accessible
    const verified = [];
    for (const img of images) {
      const ok = await verifyImageUrl(img.url);
      if (ok) verified.push(img);
      if (verified.length >= 4) break; // max 4 per center
    }

    if (verified.length === 0) {
      console.log('no valid images');
      continue;
    }

    // Insert into center_photos
    const photos = verified.map((img, i) => ({
      center_id: center.id,
      url: img.url,
      alt_text: img.alt || `${center.name} photo ${i + 1}`,
      sort_order: i,
      is_primary: i === 0,
    }));

    const { error } = await supabase.from('center_photos').insert(photos);
    if (error) {
      console.log(`DB error: ${error.message}`);
    } else {
      totalPhotos += verified.length;
      console.log(`${verified.length} photos saved`);
    }

    // Small delay to be polite
    await new Promise(r => setTimeout(r, 500));
  }

  console.log(`\nDone! Total photos saved: ${totalPhotos}`);
}

main();
