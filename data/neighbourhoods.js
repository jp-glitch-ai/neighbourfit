// Toronto neighbourhood dataset.
// Scores are 1-10 ILLUSTRATIVE ESTIMATES so the app works out of the box.
// Replace them with real figures from Toronto Open Data (neighbourhood profiles,
// TPS crime rates, EQAO school results, TTC stops, parks) before marketing claims.
// price = rough typical detached/semi price band in $K CAD (estimate).
window.NEIGHBOURHOODS = [
  { name: "The Annex", lat: 43.6702, lng: -79.4073, price: 2400, schools: 8, safety: 7, transit: 9, parks: 7, walk: 10, nightlife: 8, quiet: 5, family: 7 },
  { name: "Leslieville", lat: 43.6629, lng: -79.3317, price: 1600, schools: 7, safety: 7, transit: 7, parks: 8, walk: 9, nightlife: 7, quiet: 6, family: 9 },
  { name: "Riverdale", lat: 43.6713, lng: -79.3502, price: 1900, schools: 8, safety: 8, transit: 8, parks: 9, walk: 9, nightlife: 6, quiet: 7, family: 9 },
  { name: "The Beaches", lat: 43.6716, lng: -79.2964, price: 1900, schools: 8, safety: 8, transit: 6, parks: 10, walk: 8, nightlife: 5, quiet: 8, family: 9 },
  { name: "Liberty Village", lat: 43.6387, lng: -79.4210, price: 800, schools: 5, safety: 6, transit: 7, parks: 5, walk: 9, nightlife: 9, quiet: 3, family: 4 },
  { name: "King West", lat: 43.6440, lng: -79.4000, price: 1100, schools: 5, safety: 6, transit: 9, parks: 6, walk: 10, nightlife: 10, quiet: 2, family: 3 },
  { name: "Yorkville", lat: 43.6710, lng: -79.3910, price: 3500, schools: 7, safety: 8, transit: 10, parks: 6, walk: 10, nightlife: 9, quiet: 4, family: 5 },
  { name: "Rosedale", lat: 43.6797, lng: -79.3795, price: 4500, schools: 9, safety: 9, transit: 8, parks: 9, walk: 7, nightlife: 4, quiet: 9, family: 9 },
  { name: "Forest Hill", lat: 43.6950, lng: -79.4140, price: 4000, schools: 10, safety: 9, transit: 6, parks: 8, walk: 7, nightlife: 3, quiet: 9, family: 10 },
  { name: "Lawrence Park", lat: 43.7240, lng: -79.4000, price: 3600, schools: 10, safety: 9, transit: 6, parks: 9, walk: 6, nightlife: 2, quiet: 10, family: 10 },
  { name: "Leaside", lat: 43.7090, lng: -79.3660, price: 2700, schools: 9, safety: 9, transit: 6, parks: 8, walk: 7, nightlife: 3, quiet: 9, family: 10 },
  { name: "Davisville Village", lat: 43.7010, lng: -79.3890, price: 2300, schools: 9, safety: 8, transit: 9, parks: 8, walk: 8, nightlife: 5, quiet: 7, family: 9 },
  { name: "Roncesvalles", lat: 43.6470, lng: -79.4480, price: 1800, schools: 7, safety: 8, transit: 8, parks: 10, walk: 9, nightlife: 7, quiet: 6, family: 8 },
  { name: "High Park North", lat: 43.6600, lng: -79.4660, price: 1900, schools: 8, safety: 8, transit: 8, parks: 10, walk: 8, nightlife: 5, quiet: 7, family: 9 },
  { name: "Junction", lat: 43.6650, lng: -79.4700, price: 1500, schools: 7, safety: 7, transit: 7, parks: 7, walk: 8, nightlife: 7, quiet: 6, family: 8 },
  { name: "Little Italy", lat: 43.6555, lng: -79.4140, price: 1800, schools: 7, safety: 7, transit: 8, parks: 6, walk: 10, nightlife: 9, quiet: 4, family: 6 },
  { name: "Trinity Bellwoods", lat: 43.6480, lng: -79.4140, price: 1900, schools: 6, safety: 7, transit: 8, parks: 9, walk: 10, nightlife: 9, quiet: 4, family: 6 },
  { name: "Danforth (Greektown)", lat: 43.6780, lng: -79.3500, price: 1600, schools: 7, safety: 7, transit: 9, parks: 7, walk: 9, nightlife: 7, quiet: 6, family: 8 },
  { name: "Cabbagetown", lat: 43.6650, lng: -79.3640, price: 1800, schools: 6, safety: 6, transit: 7, parks: 8, walk: 9, nightlife: 6, quiet: 6, family: 7 },
  { name: "Distillery / Corktown", lat: 43.6520, lng: -79.3570, price: 900, schools: 5, safety: 6, transit: 7, parks: 7, walk: 9, nightlife: 8, quiet: 4, family: 4 },
  { name: "St. Lawrence", lat: 43.6490, lng: -79.3720, price: 900, schools: 5, safety: 6, transit: 9, parks: 6, walk: 10, nightlife: 8, quiet: 4, family: 4 },
  { name: "Bloor West Village", lat: 43.6500, lng: -79.4850, price: 2000, schools: 8, safety: 9, transit: 8, parks: 9, walk: 8, nightlife: 4, quiet: 8, family: 9 },
  { name: "The Kingsway", lat: 43.6550, lng: -79.5100, price: 2800, schools: 9, safety: 9, transit: 7, parks: 8, walk: 6, nightlife: 3, quiet: 9, family: 10 },
  { name: "Mimico", lat: 43.6160, lng: -79.4970, price: 1300, schools: 6, safety: 7, transit: 6, parks: 8, walk: 7, nightlife: 4, quiet: 7, family: 7 },
  { name: "Willowdale", lat: 43.7700, lng: -79.4130, price: 2000, schools: 9, safety: 8, transit: 8, parks: 6, walk: 7, nightlife: 5, quiet: 6, family: 8 },
  { name: "Don Mills", lat: 43.7360, lng: -79.3430, price: 1800, schools: 8, safety: 8, transit: 5, parks: 8, walk: 5, nightlife: 3, quiet: 8, family: 9 },
  { name: "Scarborough Village", lat: 43.7380, lng: -79.2120, price: 1100, schools: 6, safety: 6, transit: 5, parks: 9, walk: 4, nightlife: 2, quiet: 8, family: 7 },
  { name: "Agincourt", lat: 43.7850, lng: -79.2780, price: 1200, schools: 7, safety: 7, transit: 5, parks: 6, walk: 5, nightlife: 4, quiet: 7, family: 8 },
  { name: "Etobicoke Centre", lat: 43.6430, lng: -79.5650, price: 1500, schools: 8, safety: 8, transit: 6, parks: 7, walk: 5, nightlife: 3, quiet: 8, family: 9 },
  { name: "Weston", lat: 43.7000, lng: -79.5150, price: 1000, schools: 5, safety: 5, transit: 8, parks: 7, walk: 6, nightlife: 3, quiet: 6, family: 6 },
  { name: "East York", lat: 43.6910, lng: -79.3280, price: 1500, schools: 7, safety: 8, transit: 6, parks: 8, walk: 6, nightlife: 3, quiet: 8, family: 9 },
  { name: "Mount Pleasant West", lat: 43.7040, lng: -79.3930, price: 1000, schools: 7, safety: 7, transit: 10, parks: 6, walk: 9, nightlife: 7, quiet: 5, family: 5 }
];

window.FACTORS = [
  { key: "schools", label: "School quality" },
  { key: "safety", label: "Safety" },
  { key: "transit", label: "Transit access" },
  { key: "parks", label: "Parks & green space" },
  { key: "walk", label: "Walkability" },
  { key: "nightlife", label: "Restaurants & nightlife" },
  { key: "quiet", label: "Peace & quiet" },
  { key: "family", label: "Family-friendly" }
];
