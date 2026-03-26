import json

data = [
{"recoveryUrl":"https://recovery.com/addiction-rehab-toronto/","centerName":"Addiction Rehab Toronto","website":"https://addictionrehabtoronto.ca/","phone":"+1(833)318-1855"},
{"recoveryUrl":"https://recovery.com/acorn-recovery-living/","centerName":"Acorn Recovery Living","website":"https://www.cedarsrecovery.com","phone":"(778)8885400"},
{"recoveryUrl":"https://recovery.com/andys-house/","centerName":"Andy's House","website":"https://andyshouse.com","phone":"(514)738-2639"},
{"recoveryUrl":"https://recovery.com/another-road-recovery/","centerName":"Another Road Addiction Recovery","website":"https://anotherroad.ca","phone":"(855)917-6319"},
{"recoveryUrl":"https://recovery.com/atlantic-centre-for-trauma-nova-scotia/","centerName":"EHN Guardians Atlantic","website":"https://www.edgewoodhealthnetwork.com/locations/atlantic-centre-for-trauma/facility/","phone":"(902)334-5002"},
{"recoveryUrl":"https://recovery.com/bellwood-health-services/","centerName":"EHN Bellwood Toronto","website":"https://www.edgewoodhealthnetwork.com/locations/inpatient-centres/bellwood/","phone":"(844)461-0223"},
{"recoveryUrl":"https://recovery.com/aurora-recovery/","centerName":"Aurora Recovery Centre","website":"https://aurorarecoverycentre.com/","phone":"(833)943-2782"},
{"recoveryUrl":"https://recovery.com/birch-wellness-center/","centerName":"Birch Wellness Center","website":"https://birchwellnesscenter.ca/","phone":"(888)890-2492"},
{"recoveryUrl":"https://recovery.com/canadian-centre-for-addictions/","centerName":"Canadian Centre for Addictions","website":"https://canadiancentreforaddictions.org/","phone":"1(833)691-4743"},
{"recoveryUrl":"https://recovery.com/cedars-at-cobble-hill/","centerName":"Cedars Recovery","website":"https://www.cedarsrecovery.com","phone":"(855)657-0263"},
{"recoveryUrl":"https://recovery.com/centres-for-health-and-healing-ontario/","centerName":"Centres for Health and Healing","website":"https://cfhh.ca/","phone":"(833)956-8772"},
{"recoveryUrl":"https://recovery.com/bowline-health-calgary/","centerName":"Bowline Health Virtual Recovery Coaching","website":"https://www.bowlinehealth.ca/","phone":"(780)666-6223"},
{"recoveryUrl":"https://recovery.com/clinique-nouveau-depart/","centerName":"EHN Nouveau Depart Montreal","website":"https://www.cliniquenouveaudepart.com/","phone":"(844)931-0601"},
{"recoveryUrl":"https://recovery.com/edgewood-treatment-centre/","centerName":"EHN Edgewood Nanaimo","website":"https://www.edgewoodhealthnetwork.com/locations/inpatient-centres/edgewood/","phone":"(855)814-3522"},
{"recoveryUrl":"https://recovery.com/ehn-bellwood-nova-scotia/","centerName":"EHN Bellwood Nova Scotia","website":"https://www.edgewoodhealthnetwork.com/locations/bellwood-nova-scotia/","phone":"(855)727-9994"},
{"recoveryUrl":"https://recovery.com/crosbie-house-canada/","centerName":"Crosbie House","website":"http://www.crosbiehousesociety.com/","phone":"(866)681-0613"},
{"recoveryUrl":"https://recovery.com/ehn-edgewood-rockies/","centerName":"EHN Edgewood Rockies","website":"https://www.edgewoodhealthnetwork.com/locations/edgewood-rockies/","phone":"(877)421-1658"},
{"recoveryUrl":"https://recovery.com/ehn-red-deer-alberta-canada/","centerName":"EHN Red Deer Recovery Community","website":"https://www.edgewoodhealthnetwork.com/locations/red-deer-recovery-community/","phone":"(866)513-7759"},
{"recoveryUrl":"https://recovery.com/ehn-willowview-recovery/","centerName":"EHN Willowview Recovery Centre","website":"https://www.edgewoodhealthnetwork.com/locations/willowview/","phone":""},
{"recoveryUrl":"https://recovery.com/farm-stouffville/","centerName":"The Farm","website":"https://thefarmrehab.com/","phone":"+1(833)361-4973"},
{"recoveryUrl":"https://recovery.com/field-trip-health-montreal-quebec/","centerName":"Field Trip Health Montreal","website":"https://fieldtriphealth.ca/locations/montreal/","phone":"(514)556-0902"},
{"recoveryUrl":"https://recovery.com/field-trip-health-vancouver-canada/","centerName":"Field Trip Health Vancouver","website":"https://fieldtriphealth.ca/vancouver/","phone":"(604)359-9661"},
{"recoveryUrl":"https://recovery.com/field-trip-health-toronto-canada/","centerName":"Field Trip Health Toronto","website":"https://fieldtriphealth.ca/","phone":"(647)933-4770"},
{"recoveryUrl":"https://recovery.com/gateway-recovery-canada/","centerName":"EHN Guardians Gateway","website":"https://canadianhealthrecoverycentre.ca/","phone":"(705)710-2253"},
{"recoveryUrl":"https://recovery.com/georgia-strait-womens-clinic/","centerName":"Georgia Strait Womens Clinic","website":"https://georgiastraitwomensclinic.ca/","phone":"(844)432-0333"},
{"recoveryUrl":"https://recovery.com/greenestone-muskoka/","centerName":"GreeneStone Centre for Recovery","website":"http://greenestone.net/","phone":"(249)486-6234"},
{"recoveryUrl":"https://recovery.com/heritage-treatment-foundation-canada/","centerName":"Heritage Treatment Foundation","website":"https://soberrecovery.ca/","phone":"(888)999-1968"},
{"recoveryUrl":"https://recovery.com/homewood-ravensview-north-saanich-british-columbia/","centerName":"Homewood Ravensview","website":"https://ravensview.com/","phone":"(888)807-3602"},
{"recoveryUrl":"https://recovery.com/homewood-health-centre-ontario-canada/","centerName":"Homewood Health Centre","website":"https://homewoodhealthcentre.com/","phone":"(888)891-7586"},
{"recoveryUrl":"https://recovery.com/irecover-addiction-canada/","centerName":"iRecover Okanagan","website":"https://irecover.ca/","phone":"(877)387-4155"},
{"recoveryUrl":"https://recovery.com/inspire-change-health-wellness/","centerName":"Inspire Change Wellness Center","website":"https://addictionhealingcentre.ca/","phone":"+1(833)506-0968"},
{"recoveryUrl":"https://recovery.com/jellinek-society-alberta-canada/","centerName":"Jellinek Society","website":"https://www.jellinek.ca/","phone":"(780)488-1160"},
{"recoveryUrl":"https://recovery.com/john-volken-academy-surrey-british-columbia/","centerName":"John Volken Academy British Columbia","website":"https://volken.org/our-location/","phone":"(877)702-1436"},
{"recoveryUrl":"https://recovery.com/irecover-alberta-canada/","centerName":"iRecover Alberta","website":"https://irecover.ca/central-alberta/","phone":"(877)387-4155"},
{"recoveryUrl":"https://recovery.com/kelburn-recovery-saint-adolphe-quebec/","centerName":"Kelburn Recovery Centre","website":"https://www.kelburnrecoverycentre.com/","phone":"(844)679-1980"},
{"recoveryUrl":"https://recovery.com/last-door-new-westminster-british-columbia/","centerName":"Last Door Recovery Centre","website":"https://lastdoor.org","phone":"(833)394-6589"},
{"recoveryUrl":"https://recovery.com/metamorphosis-centre-canada/","centerName":"Metamorphosis Centre for Change","website":"https://metamorphosiscentre.com/","phone":"(888)457-7507"},
{"recoveryUrl":"https://recovery.com/orchard-recovery/","centerName":"Orchard Recovery","website":"https://orchardrecovery.com","phone":"+1(844)426-1987"},
{"recoveryUrl":"https://recovery.com/outpatient/alberta-adolescent-recovery-centre/","centerName":"Alberta Adolescent Recovery Centre","website":"","phone":"(403)800-7681"},
{"recoveryUrl":"https://recovery.com/outpatient/centre-for-wholeness-and-well-being-calgary/","centerName":"Centre for Wholeness & Well Being","website":"","phone":"(825)413-3100"},
{"recoveryUrl":"https://recovery.com/paradise-valley-healing-center/","centerName":"Paradise Valley Healing Center","website":"https://paradisevalleyhealing.com/","phone":"(604)781-8589"},
{"recoveryUrl":"https://recovery.com/pine-river-instite-ontario-canada/","centerName":"Pine River Institute","website":"https://pineriverinstitute.com/","phone":"(888)863-3592"},
{"recoveryUrl":"https://recovery.com/outpatient/field-trip-health-hamilton-ontario/","centerName":"Field Trip Health Hamilton","website":"","phone":"(905)364-4690"},
{"recoveryUrl":"https://recovery.com/residential/dunham-house/","centerName":"Dunham House","website":"","phone":"(450)263-3434"},
{"recoveryUrl":"https://recovery.com/outpatient/shifa-therapy/","centerName":"Shifa Therapy","website":"","phone":"+1226-828-9306"},
{"recoveryUrl":"https://recovery.com/residential/ehn-guardians-nanaimo/","centerName":"EHN Guardians Nanaimo","website":"","phone":"(825)414-2268"},
{"recoveryUrl":"https://recovery.com/renascent/","centerName":"Renascent","website":"https://renascent.ca/","phone":"(867)670-3721"},
{"recoveryUrl":"https://recovery.com/residential/envision-mind-care-alberta-canada/","centerName":"Envision Mind Care","website":"","phone":"(780)306-2345"},
{"recoveryUrl":"https://recovery.com/residential/hope-valley-healing/","centerName":"Hope Valley Healing","website":"","phone":"(905)923-7675"},
{"recoveryUrl":"https://recovery.com/residential/freeport-recovery/","centerName":"Freeport Recovery","website":"","phone":"(833)974-6791"},
{"recoveryUrl":"https://recovery.com/residential/into-action-recovery-canada/","centerName":"Into Action Recovery - Canada","website":"","phone":"(604)933-9003"},
{"recoveryUrl":"https://recovery.com/residential/nomina-wellness/","centerName":"Nomina Wellness","website":"","phone":"1-877-651-0923"},
{"recoveryUrl":"https://recovery.com/residential/peak-house-vancouver-canada/","centerName":"Peak House","website":"","phone":"(604)253-3381"},
{"recoveryUrl":"https://recovery.com/residential/pacifica/","centerName":"Pacifica","website":"","phone":"(866)446-0668"},
{"recoveryUrl":"https://recovery.com/residential/rose-city-recovery-welland/","centerName":"Rose City Recovery","website":"","phone":"+1(416)800-8859"},
{"recoveryUrl":"https://recovery.com/residential/round-lake-treatment-canada/","centerName":"Round Lake Alcohol and Drug Treatment Society","website":"","phone":"(250)546-3077"},
{"recoveryUrl":"https://recovery.com/residential/scott/","centerName":"The Scott","website":"","phone":"(888)827-7736"},
{"recoveryUrl":"https://recovery.com/residential/sobriety-ca-foundation/","centerName":"Sobriety.ca Foundation","website":"","phone":"(866)575-7349"},
{"recoveryUrl":"https://recovery.com/residential/tedds-on-chapel/","centerName":"TeDDs on Chapel Center for Recovery","website":"","phone":"(506)702-5032"},
{"recoveryUrl":"https://recovery.com/residential/umattercare-canada/","centerName":"UMATTERCARE","website":"","phone":"(416)822-0132"},
{"recoveryUrl":"https://recovery.com/stella-maris-sober-living-nova-scotia/","centerName":"Stella Maris Sober Living","website":"https://stellamarissoberliving.my.canva.site/stella-maris-sober-living-sanctuary","phone":"(888)301-7218"},
{"recoveryUrl":"https://recovery.com/sunshine-coast-health-center/","centerName":"Sunshine Coast Health Centre","website":"https://www.sunshinecoasthealthcentre.ca/","phone":"(833)939-3029"},
{"recoveryUrl":"https://recovery.com/searidge-foundation-canada/","centerName":"Searidge Foundation","website":"https://searidgealcoholrehab.com/","phone":"(888)511-3685"},
{"recoveryUrl":"https://recovery.com/terradyne/","centerName":"Terradyne Wellness Centre","website":"https://terradynewellness.ca/","phone":"(833)685-6076"},
{"recoveryUrl":"https://recovery.com/the-northern-lights/","centerName":"The Northern Lights","website":"https://www.thenorthernlights.ca/","phone":"(705)667-1000"},
{"recoveryUrl":"https://recovery.com/the-healing-institute-at-forbidden-plateau/","centerName":"The Healing Institute","website":"https://www.thehealinginstitute.ca/","phone":"(877)774-3843"},
{"recoveryUrl":"https://recovery.com/the-residence-ontario-canada/","centerName":"The Residence at Homewood","website":"https://theresidenceathomewood.com/","phone":"(855)467-5937"},
{"recoveryUrl":"https://recovery.com/the-sanctuary-vancouver-island-british-columbia/","centerName":"The Sanctuary Vancouver Island","website":"https://www.sanctuaryvancouverisland.com/","phone":"(774)352-5670"},
{"recoveryUrl":"https://recovery.com/valiant-recovery/","centerName":"Valiant Recovery","website":"https://www.valiantrecovery.com/","phone":"+1(833)944-2789"},
{"recoveryUrl":"https://recovery.com/together-we-can-canada/","centerName":"Together We Can","website":"https://twcrecoverylife.org/","phone":"(844)595-1122"},
{"recoveryUrl":"https://recovery.com/trafalgar-ontario/","centerName":"Trafalgar Addiction Treatment Centres","website":"https://trafalgarresidence.com/","phone":"(833)803-0455"},
{"recoveryUrl":"https://recovery.com/victoria-wellness-canada/","centerName":"Victoria Wellness","website":"https://victoriawellness.ca/","phone":"(855)949-6139"},
]

def assign_province(url, name):
    url_lower = url.lower()

    bc_kw = ['british-columbia','vancouver','nanaimo','surrey','cobble-hill','bowen','sunshine-coast','ravensview','saanich','forbidden-plateau','vancouver-island','georgia-strait','last-door','westminster','orchard','paradise-valley','edgewood-treatment']
    on_kw = ['ontario','toronto','stouffville','muskoka','welland','hamilton','pine-river','bellwood-health','greenestone','homewood-health','trafalgar','farm-stouffville','addiction-rehab-toronto']
    qc_kw = ['montreal','quebec','depart','dunham','chapel','andys-house','kelburn','adolphe']
    ab_kw = ['calgary','alberta','red-deer','willowview','bowline','jellinek','aurora-recovery']
    ns_kw = ['nova-scotia','stella-maris']
    mb_kw = ['winnipeg','manitoba']

    for kw in bc_kw:
        if kw in url_lower: return 'British Columbia'
    for kw in on_kw:
        if kw in url_lower: return 'Ontario'
    for kw in qc_kw:
        if kw in url_lower: return 'Quebec'
    for kw in ab_kw:
        if kw in url_lower: return 'Alberta'
    for kw in ns_kw:
        if kw in url_lower: return 'Nova Scotia'
    for kw in mb_kw:
        if kw in url_lower: return 'Manitoba'

    return 'Canada'

for c in data:
    c['region'] = assign_province(c['recoveryUrl'], c['centerName'])
    c['email'] = ''

with open('canada_centers_data.json', 'w', encoding='utf-8') as f:
    json.dump(data, f, indent=2, ensure_ascii=False)

print(f'Saved {len(data)} centers')

from collections import Counter
provinces = Counter(c['region'] for c in data)
for p, cnt in sorted(provinces.items(), key=lambda x: -x[1]):
    print(f'  {p}: {cnt}')

with_web = [c for c in data if c['website']]
print(f'Centers with websites: {len(with_web)}')
