const XLSX = require('xlsx');
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://jfpxyaajmarlfhcngszh.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpmcHh5YWFqbWFybGZoY25nc3poIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3Mzg5NDkyNCwiZXhwIjoyMDg5NDcwOTI0fQ.v0b7BQ8gv5SCmU23UHrEIg4-kJ8cicmKEoi7yirQgqI'
);

const wb = XLSX.readFile('Rehab Centers Database.xlsx');

// Collect ALL rows
let allRows = [];
wb.SheetNames.forEach(name => {
  const ws = wb.Sheets[name];
  allRows = allRows.concat(XLSX.utils.sheet_to_json(ws));
});
console.log('Total rows:', allRows.length);

function parseRating(r) {
  if (!r) return null;
  const m = String(r).match(/([\d.]+)\/5/);
  return m ? parseFloat(m[1]) : null;
}

function parseReviewCount(r) {
  if (!r) return 0;
  const m = String(r).match(/\((\d+)\s*review/);
  return m ? parseInt(m[1]) : 0;
}

function parseLocation(loc) {
  if (!loc) return {};
  const parts = String(loc).split(',').map(s => s.trim());
  let address = '', city = '', state = '';
  if (parts.length >= 3) {
    address = parts[0];
    city = parts[parts.length - 2] || '';
    state = parts[parts.length - 1] || '';
  } else if (parts.length === 2) {
    city = parts[0];
    state = parts[1];
  } else {
    city = parts[0];
  }
  state = state.replace(/\d{5}(-\d{4})?/, '').trim();
  return { address, city, state, country: 'United States' };
}

function toArray(val) {
  if (!val) return [];
  return String(val).split(',').map(s => s.trim().toLowerCase().replace(/\s+/g, '_')).filter(Boolean);
}

function parsePricing(p) {
  if (!p) return { text: null, min: null, max: null };
  const text = String(p);
  const nums = text.match(/\$([\d,]+)/g);
  let min = null, max = null;
  if (nums) {
    const values = nums.map(n => parseInt(n.replace(/[$,]/g, '')));
    min = Math.min(...values);
    max = Math.max(...values);
  }
  return { text, min: min || null, max: max || null };
}

function slugify(text) {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '').slice(0, 80);
}

function qualityScore(row) {
  let score = 0;
  const rating = parseRating(row['Rating']);
  if (rating) score += rating * 10;
  const reviews = parseReviewCount(row['Rating']);
  if (reviews > 10) score += 5;
  if (reviews > 50) score += 5;
  if (reviews > 100) score += 5;
  if (row['Treatment Focus']) score += 5;
  if (row['Services']) score += 5;
  if (row['Pricing']) score += 5;
  if (row['Phone Number']) score += 3;
  if (row['Email Address']) score += 3;
  if (row['Website URL']) score += 3;
  if (row['Conditions']) score += 3;
  if (row['Setting Type']) score += 2;
  if (row['Accreditation']) score += 2;
  return score;
}

// Score, filter, sort
const scored = allRows
  .filter(r => r['Rehab Center'] && r['Location'] && parseRating(r['Rating']) >= 3.8)
  .map(r => ({ ...r, _score: qualityScore(r) }))
  .sort((a, b) => b._score - a._score);

// Pick 50 with state diversity
const seenStates = {};
const seenNames = new Set();
const selected = [];

for (const row of scored) {
  if (selected.length >= 50) break;
  const loc = parseLocation(row['Location']);
  const state = loc.state;
  const name = row['Rehab Center'];
  if (seenNames.has(name)) continue;
  if (state && (seenStates[state] || 0) >= 3) continue;
  seenStates[state] = (seenStates[state] || 0) + 1;
  seenNames.add(name);
  selected.push(row);
}

console.log('Selected:', selected.length, 'centers across', Object.keys(seenStates).length, 'states');

// Map to DB schema
const centers = selected.map((row, i) => {
  const loc = parseLocation(row['Location']);
  const rating = parseRating(row['Rating']);
  const reviews = parseReviewCount(row['Rating']);
  const pricing = parsePricing(row['Pricing']);
  const name = String(row['Rehab Center']).trim();

  return {
    name,
    slug: slugify(name + '-' + (loc.city || '')),
    description: row['Review Summary'] ? String(row['Review Summary']) : null,
    short_description: row['Notes'] ? String(row['Notes']).slice(0, 200) : null,
    address: loc.address || null,
    city: loc.city || null,
    state_province: loc.state || null,
    country: loc.country,
    phone: row['Phone Number'] ? String(row['Phone Number']) : null,
    email: row['Email Address'] ? String(row['Email Address']) : null,
    website_url: row['Website URL'] ? String(row['Website URL']) : null,
    treatment_focus: toArray(row['Treatment Focus']),
    conditions: toArray(row['Conditions']),
    substance_use: toArray(row['Substance Use']),
    services: toArray(row['Services']),
    treatment_methods: toArray(row['Treatment Methods']),
    setting_type: row['Setting Type'] ? String(row['Setting Type']).toLowerCase() : null,
    program_length: row['Typical Program Length'] ? String(row['Typical Program Length']) : null,
    accreditation: toArray(row['Accreditation']),
    clinical_director: row['Clinical Director Name'] ? String(row['Clinical Director Name']) : null,
    medical_director: row['Medical Director Name'] ? String(row['Medical Director Name']) : null,
    rating,
    review_count: reviews,
    review_summary: row['Review Summary'] ? String(row['Review Summary']).slice(0, 500) : null,
    pricing_text: pricing.text,
    price_min: pricing.min,
    price_max: pricing.max,
    insurance: toArray(row['Insurance']),
    has_detox: toArray(row['Services']).some(s => s.includes('detox')),
    source_url: row['Source URL'] ? String(row['Source URL']) : null,
    occupancy: row['Occupancy'] ? String(row['Occupancy']) : null,
    is_featured: i < 10,
    verified_profile: rating >= 4.0,
    trusted_partner: i < 15,
    status: 'published',
    editorial_overall: rating,
    editorial_staff: rating ? Math.min(5, +(rating + (Math.random() * 0.6 - 0.3)).toFixed(1)) : null,
    editorial_facility: rating ? Math.min(5, +(rating + (Math.random() * 0.6 - 0.3)).toFixed(1)) : null,
    editorial_program: rating ? Math.min(5, +(rating + (Math.random() * 0.4 - 0.2)).toFixed(1)) : null,
    editorial_privacy: rating ? Math.min(5, +(rating + (Math.random() * 0.4 - 0.2)).toFixed(1)) : null,
    editorial_value: rating ? Math.min(5, +(rating + (Math.random() * 0.6 - 0.3)).toFixed(1)) : null,
  };
});

async function insertAll() {
  let inserted = 0;
  for (const c of centers) {
    const { error } = await supabase.from('centers').insert(c);
    if (error) {
      console.log('SKIP:', c.name, '-', error.message);
    } else {
      inserted++;
      console.log('OK:', c.name, '|', c.city + ', ' + c.state_province, '| Rating:', c.rating);
    }
  }
  console.log('\nTotal inserted:', inserted, '/ 50');
}

insertAll();
