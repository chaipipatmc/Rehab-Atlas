/**
 * Data Import Script for Rehab-Atlas
 *
 * Reads the Excel database, curates a quality subset, and inserts into Supabase.
 *
 * Usage:
 *   npx tsx scripts/import-centers.ts
 *
 * Requires:
 *   - NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local
 *   - The Excel file at the project root
 */

import * as XLSX from "xlsx";
import { createClient } from "@supabase/supabase-js";
import * as path from "path";
import * as dotenv from "dotenv";

// Load env
dotenv.config({ path: path.resolve(__dirname, "../.env.local") });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const EXCEL_FILE = path.resolve(__dirname, "../Rehab Centers Database.xlsx");

// ------- Helpers -------

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 100);
}

function parseLocation(location: string | null): {
  address: string | null;
  city: string | null;
  state_province: string | null;
  country: string;
} {
  if (!location) return { address: null, city: null, state_province: null, country: "United States" };

  const parts = location.split(",").map((s) => s.trim());

  if (parts.length >= 3) {
    // Try to detect country vs US state
    const last = parts[parts.length - 1];
    const secondLast = parts[parts.length - 2];

    // Check if it looks like "City, State, ZIP" (US format)
    const isUS =
      /^\d{5}/.test(last) ||
      /^[A-Z]{2}$/.test(last) ||
      [
        "Alabama", "Alaska", "Arizona", "Arkansas", "California", "Colorado",
        "Connecticut", "Delaware", "Florida", "Georgia", "Hawaii", "Idaho",
        "Illinois", "Indiana", "Iowa", "Kansas", "Kentucky", "Louisiana",
        "Maine", "Maryland", "Massachusetts", "Michigan", "Minnesota",
        "Mississippi", "Missouri", "Montana", "Nebraska", "Nevada",
        "New Hampshire", "New Jersey", "New Mexico", "New York",
        "North Carolina", "North Dakota", "Ohio", "Oklahoma", "Oregon",
        "Pennsylvania", "Rhode Island", "South Carolina", "South Dakota",
        "Tennessee", "Texas", "Utah", "Vermont", "Virginia", "Washington",
        "West Virginia", "Wisconsin", "Wyoming",
      ].some((s) => last.includes(s) || secondLast.includes(s));

    if (isUS) {
      return {
        address: parts.slice(0, -2).join(", "),
        city: parts.length >= 3 ? parts[parts.length - 3] || parts[0] : parts[0],
        state_province: secondLast,
        country: "United States",
      };
    }

    // International
    return {
      address: parts.slice(0, -2).join(", "),
      city: parts[parts.length - 2],
      state_province: null,
      country: last,
    };
  }

  return {
    address: location,
    city: parts[0] || null,
    state_province: null,
    country: parts[parts.length - 1] || "Unknown",
  };
}

function parseRating(rating: string | null): { value: number | null; count: number } {
  if (!rating) return { value: null, count: 0 };
  const match = rating.match(/([\d.]+)\/5\s*\((\d+)\s*reviews?\)/i);
  if (match) {
    return { value: parseFloat(match[1]), count: parseInt(match[2]) };
  }
  return { value: null, count: 0 };
}

function splitField(value: string | null): string[] {
  if (!value) return [];
  return value
    .split(",")
    .map((s) => s.trim().toLowerCase().replace(/\s+/g, "_"))
    .filter(Boolean);
}

function parsePricing(text: string | null): {
  pricing_text: string | null;
  price_min: number | null;
  price_max: number | null;
} {
  if (!text) return { pricing_text: null, price_min: null, price_max: null };

  // Try to extract numeric values
  const priceMatch = text.match(/\$?([\d,]+)/g);
  if (priceMatch && priceMatch.length > 0) {
    const prices = priceMatch
      .map((p) => parseInt(p.replace(/[$,]/g, "")))
      .filter((n) => !isNaN(n));
    return {
      pricing_text: text.split("|")[0]?.trim() || text,
      price_min: prices.length > 0 ? Math.min(...prices) : null,
      price_max: prices.length > 1 ? Math.max(...prices) : prices[0] || null,
    };
  }

  return { pricing_text: text, price_min: null, price_max: null };
}

// ------- Quality Score -------

function qualityScore(row: Record<string, unknown>): number {
  let score = 0;
  if (row["Rehab Center"]) score += 10;
  if (row["Rating"]) score += 5;
  if (row["Location"]) score += 5;
  if (row["Phone Number"]) score += 3;
  if (row["Email Address"]) score += 3;
  if (row["Treatment Focus"]) score += 5;
  if (row["Conditions"]) score += 3;
  if (row["Services"]) score += 3;
  if (row["Treatment Methods"]) score += 3;
  if (row["Pricing"]) score += 5;
  if (row["Accreditation"]) score += 5;
  if (row["Notes"]) score += 2;
  return score;
}

// ------- Main -------

async function main() {
  console.log("Reading Excel file...");
  const workbook = XLSX.readFile(EXCEL_FILE);

  const allRows: Record<string, unknown>[] = [];

  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json(sheet) as Record<string, unknown>[];
    console.log(`  ${sheetName}: ${rows.length} rows`);
    allRows.push(...rows);
  }

  console.log(`Total rows: ${allRows.length}`);

  // Score and filter
  const scored = allRows
    .map((row) => ({ row, score: qualityScore(row) }))
    .filter(({ row }) => {
      // Must have name and at least some clinical data
      if (!row["Rehab Center"]) return false;
      if (!row["Treatment Focus"] && !row["Conditions"] && !row["Services"]) return false;
      return true;
    })
    .sort((a, b) => b.score - a.score);

  // Take top 500 quality rows
  const selected = scored.slice(0, 500);
  console.log(`Selected ${selected.length} centers for import`);

  // Track slugs for uniqueness
  const usedSlugs = new Set<string>();

  const centers = selected.map(({ row }) => {
    const name = String(row["Rehab Center"] || "").trim();
    const location = parseLocation(String(row["Location"] || ""));
    const rating = parseRating(String(row["Rating"] || ""));
    const pricing = parsePricing(row["Pricing"] as string | null);

    // Generate unique slug
    let slug = slugify(`${name}-${location.city || location.country}`);
    let suffix = 1;
    const baseSlug = slug;
    while (usedSlugs.has(slug)) {
      slug = `${baseSlug}-${suffix}`;
      suffix++;
    }
    usedSlugs.add(slug);

    const services = splitField(row["Services"] as string | null);
    const hasDetox = services.some((s) => s.includes("detox"));

    // Use Notes as short_description
    const notes = String(row["Notes"] || "").trim();
    const shortDesc = notes
      ? notes.split("|").pop()?.trim().slice(0, 200)
      : null;

    return {
      name,
      slug,
      short_description: shortDesc,
      description: notes || null,
      ...location,
      phone: (row["Phone Number"] as string)?.trim() || null,
      email: (row["Email Address"] as string)?.trim() || null,
      website_url: null, // Don't import external form URLs
      treatment_focus: splitField(row["Treatment Focus"] as string | null),
      conditions: splitField(row["Conditions"] as string | null),
      substance_use: splitField(row["Substance Use"] as string | null),
      services,
      treatment_methods: splitField(row["Treatment Methods"] as string | null),
      setting_type: null, // Placeholder data in Excel, skip
      program_length: (row["Typical Program Length"] as string)?.trim() || null,
      languages: ["english"],
      ...pricing,
      insurance: splitField(row["Insurance"] as string | null)
        .map((i) => i.split("|")[0]?.trim())
        .filter(Boolean)
        .slice(0, 10),
      has_detox: hasDetox,
      accreditation: (row["Accreditation"] as string)
        ? [String(row["Accreditation"]).trim()]
        : [],
      clinical_director: (row["Clinical Director Name"] as string)?.trim() || null,
      medical_director: (row["Medical Director Name"] as string)?.trim() || null,
      rating: rating.value,
      review_count: rating.count,
      source_url: (row["Source URL"] as string)?.trim() || null,
      status: "draft" as const,
    };
  });

  // Insert in batches
  const BATCH_SIZE = 50;
  let inserted = 0;

  for (let i = 0; i < centers.length; i += BATCH_SIZE) {
    const batch = centers.slice(i, i + BATCH_SIZE);
    const { error } = await supabase.from("centers").insert(batch);

    if (error) {
      console.error(`Error inserting batch ${i / BATCH_SIZE + 1}:`, error.message);
    } else {
      inserted += batch.length;
      console.log(`Inserted ${inserted}/${centers.length}`);
    }
  }

  console.log(`\nDone! Inserted ${inserted} centers as drafts.`);
  console.log("Next steps:");
  console.log("  1. Run the SQL migration in Supabase");
  console.log("  2. Review and publish centers in the admin dashboard");
}

main().catch(console.error);
