// Nigerian places used for search suggestions (homepage) and the host's "Area" field.
// Suggestions only: hosts can still type any neighbourhood, and the search matches free text.

/** 36 states + the Federal Capital Territory. */
export const STATES = [
  "Abia", "Adamawa", "Akwa Ibom", "Anambra", "Bauchi", "Bayelsa", "Benue", "Borno",
  "Cross River", "Delta", "Ebonyi", "Edo", "Ekiti", "Enugu", "Gombe", "Imo", "Jigawa",
  "Kaduna", "Kano", "Katsina", "Kebbi", "Kogi", "Kwara", "Lagos", "Nasarawa", "Niger",
  "Ogun", "Ondo", "Osun", "Oyo", "Plateau", "Rivers", "Sokoto", "Taraba", "Yobe",
  "Zamfara", "FCT Abuja",
];

/** Major cities, written as "City, State" so one pick narrows the search well. */
export const CITIES = [
  "Lagos", "Abuja", "Port Harcourt, Rivers", "Ibadan, Oyo", "Kano", "Benin City, Edo",
  "Kaduna", "Enugu", "Calabar, Cross River", "Uyo, Akwa Ibom", "Owerri, Imo",
  "Abeokuta, Ogun", "Jos, Plateau", "Ilorin, Kwara", "Warri, Delta", "Asaba, Delta",
  "Akure, Ondo", "Osogbo, Osun", "Maiduguri, Borno", "Sokoto", "Awka, Anambra",
  "Onitsha, Anambra", "Aba, Abia", "Umuahia, Abia", "Yola, Adamawa", "Makurdi, Benue",
  "Lokoja, Kogi", "Minna, Niger", "Bauchi", "Gombe", "Katsina", "Birnin Kebbi, Kebbi",
  "Dutse, Jigawa", "Damaturu, Yobe", "Jalingo, Taraba", "Lafia, Nasarawa",
  "Abakaliki, Ebonyi", "Ado-Ekiti, Ekiti", "Yenagoa, Bayelsa", "Zaria, Kaduna",
  "Gusau, Zamfara", "Ile-Ife, Osun", "Ogbomosho, Oyo", "Ikorodu, Lagos", "Sagamu, Ogun",
];

/** Popular neighbourhoods, written as "Area, City". */
export const AREAS = [
  // Lagos
  "Lekki, Lagos", "Victoria Island, Lagos", "Ikoyi, Lagos", "Ikeja, Lagos", "Surulere, Lagos",
  "Yaba, Lagos", "Ajah, Lagos", "Maryland, Lagos", "Gbagada, Lagos", "Festac Town, Lagos",
  "Apapa, Lagos", "Oshodi, Lagos", "Badagry, Lagos", "Magodo, Lagos", "Ojodu Berger, Lagos",
  "Isolo, Lagos", "Mushin, Lagos", "Banana Island, Lagos", "Oniru, Lagos", "Agege, Lagos",
  "Ipaja, Lagos", "Ojota, Lagos", "Ketu, Lagos", "Egbeda, Lagos",
  // Abuja
  "Wuse 2, Abuja", "Maitama, Abuja", "Asokoro, Abuja", "Garki, Abuja", "Gwarinpa, Abuja",
  "Jabi, Abuja", "Utako, Abuja", "Kubwa, Abuja", "Lugbe, Abuja", "Life Camp, Abuja",
  "Katampe, Abuja", "Gwagwalada, Abuja", "Nyanya, Abuja", "Apo, Abuja", "Lokogoma, Abuja",
  "Jahi, Abuja", "Durumi, Abuja", "Kado, Abuja", "Central Business District, Abuja",
  // Port Harcourt
  "GRA, Port Harcourt", "Rumuola, Port Harcourt", "Trans Amadi, Port Harcourt",
  "Rumuokoro, Port Harcourt", "Diobu, Port Harcourt",
  // Ibadan
  "Bodija, Ibadan", "Ring Road, Ibadan", "Challenge, Ibadan", "Dugbe, Ibadan", "Agodi, Ibadan",
  // Others
  "Independence Layout, Enugu", "Trans-Ekulu, Enugu", "GRA, Benin City", "Ugbowo, Benin City",
  "Calabar South, Calabar", "Nasarawa GRA, Kano", "Sabon Gari, Kano", "Ahmadu Bello Way, Kaduna",
];

/** Everything, de-duplicated, in the order: cities, states, neighbourhoods. */
export const NIGERIAN_LOCATIONS: string[] = Array.from(new Set([...CITIES, ...STATES, ...AREAS]));

/** Shortcut chips under the search box. */
export const POPULAR = ["Lagos", "Abuja", "Port Harcourt", "Ibadan", "Kano", "Enugu", "Benin City", "Calabar"];

/**
 * True when every word of the query appears somewhere in the listing text. This lets
 * "Lekki, Lagos" match a listing in "Lekki Phase 1, Lagos", and "Abuja" match "Wuse 2, Abuja".
 */
export function matchesQuery(text: string, query: string): boolean {
  const words = query
    .toLowerCase()
    .split(/[,\s]+/)
    .filter(Boolean);
  if (words.length === 0) return true;
  const haystack = text.toLowerCase();
  return words.every((w) => haystack.includes(w));
}
