const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://jfpxyaajmarlfhcngszh.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpmcHh5YWFqbWFybGZoY25nc3poIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3Mzg5NDkyNCwiZXhwIjoyMDg5NDcwOTI0fQ.v0b7BQ8gv5SCmU23UHrEIg4-kJ8cicmKEoi7yirQgqI'
);

const urlMap = {
  "Tennessee Behavioral Health": "https://tennesseebehavioralhealth.com/",
  "Sophros Recovery Jacksonville": "https://www.sophrosrecovery.com/",
  "New Chapter Faith Based Recovery": "https://newchapterfaithrecovery.com/",
  "Meta Addiction Treatment North Reading": "https://metaaddictiontreatment.com/",
  "Ocean Coast Recovery": "https://oceancoastrecovery.com/",
  "Topsail Addiction Treatment": "https://www.topsailaddictiontreatment.com/",
  "Shoreline Recovery Center San Diego": "https://shorelinerecoverycenter.com/",
  "Design for Change": "https://designforchangerecovery.com/",
  "Aftermath Addiction Treatment Center": "https://aftermathtreatmentcenter.com/",
  "Coastal Detox of Southern California": "https://coastaldetoxsc.com/",
  "S2L Recovery: Women's Christian Rehab Center": "https://www.s2lrecovery.org/",
  "South Coast Behavioral Health - Costa Mesa": "https://www.scbh.com/",
  "Royal Life Centers at Chapter 5": "https://chapter5recovery.com/",
  "Lakeside Milam Auburn Outpatient": "https://lakesidemilam.com/",
  "Peachtree Recovery Solutions": "https://peachtreerecoverysolutions.com/",
  "Greater Family Health Franklin Park": "https://greaterfamilyhealth.org/",
  "Vanity Wellness Center Outpatient": "https://www.vanitywellnesscenter.com/",
  "Nashville Addiction Recovery": "https://www.nashvilleaddictionrecovery.com/",
  "AWA Broward": "https://adolescentwellnessacademy.com/",
  "Hickory Treatment Center at Terre Haute": "https://hickorytreatmentcenters.com/",
  "Brentwood Springs Detox": "https://brentwoodspringsdetox.com/",
  "Principles Recovery Center": "https://principlesrecoverycenter.com/",
  "Clinic 5": null,
  "Methow Valley Wellness Center": "https://www.methowvalleywellnesscenter.com/",
  "Executive Home Detox": "https://homedetox.com/",
  "White Oak Recovery Center": "https://www.whiteoakrecovery.com",
  "Washburn House": "https://www.washburnhouse.com",
  "MAT Recovery Centers Atlanta": "https://matrecoverycenters.com",
  "Steps Recovery Center St. George": "https://www.stepsrc.com",
  "MAT Recovery Centers Miami": "https://matrecoverycenters.com",
  "The Palms Recovery": "https://thepalmsrecovery.com",
  "Recovery Institute of Ohio": "https://recoveryinstituteofohio.com",
  "Pasadena Villa Outpatient Charlotte": "https://pasadenavillaoutpatient.com",
  "Nextep Women": "https://thenextep.org",
  "Greater Family Health Hanover Park": "https://greaterfamilyhealth.org",
  "Northpoint Washington": "https://www.northpointwashington.com",
  "Charlotte Detox Center": "https://charlottencdetox.com",
  "Satori Detox": "https://satoridetox.com",
  "Transitions Sober Living": "https://tslcolorado.com",
  "Allpure Behavioral Health": "https://allpurebh.com",
  "Inner Voyage Recovery": "https://innervoyagerecovery.com",
  "Brain Balance Center of Wexford": "https://www.brainbalancecenters.com/locations/pennsylvania/wexford",
  "Vogue Recovery Center Nevada": "https://www.voguerecoverycenter.com",
  "Rhode Island Addiction Treatment Centers": "https://www.rhodeislandaddictiontreatmentcenters.com",
  "Arden House": "https://ardenhousertc.org",
  "Royal Life Centers at Cascade Heights": "https://cascadeheightsrecovery.com",
  "Zinnia Health Denver Recovery Center": "https://zinniahealth.com/locations/zinnia-denver",
  "Brain Balance Center of Allen": "https://www.brainbalancecenters.com/locations/texas/allen",
  "Brain Balance Center of Greenville": "https://www.brainbalancecenters.com/locations/south-carolina/greenville",
  "Liberty Addiction Recovery": "https://libertyaddictionrecovery.com",
};

async function updateUrls() {
  let updated = 0;
  for (const [name, url] of Object.entries(urlMap)) {
    if (!url) continue;
    const { error } = await supabase
      .from('centers')
      .update({ website_url: url })
      .eq('name', name);
    if (error) {
      console.log('ERR:', name, error.message);
    } else {
      updated++;
      console.log('OK:', name, '->', url);
    }
  }
  console.log('\nUpdated:', updated, 'centers');
}

updateUrls();
