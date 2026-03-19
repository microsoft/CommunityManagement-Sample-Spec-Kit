import { db } from "@/lib/db/client";

const COUNTRIES = [
  { name: "United Kingdom", code: "GB", continent: "EU" },
  { name: "France", code: "FR", continent: "EU" },
  { name: "Germany", code: "DE", continent: "EU" },
  { name: "Portugal", code: "PT", continent: "EU" },
  { name: "United States", code: "US", continent: "NA" },
  { name: "Canada", code: "CA", continent: "NA" },
  { name: "Australia", code: "AU", continent: "OC" },
  { name: "Thailand", code: "TH", continent: "AS" },
  { name: "Indonesia", code: "ID", continent: "AS" },
];

interface CityDef {
  name: string;
  slug: string;
  countryCode: string;
  lat: number;
  lon: number;
  timezone: string;
}

const CITIES: CityDef[] = [
  { name: "Bristol", slug: "bristol", countryCode: "GB", lat: 51.4545, lon: -2.5879, timezone: "Europe/London" },
  { name: "London", slug: "london", countryCode: "GB", lat: 51.5074, lon: -0.1278, timezone: "Europe/London" },
  { name: "Brighton", slug: "brighton", countryCode: "GB", lat: 50.8225, lon: -0.1372, timezone: "Europe/London" },
  { name: "Manchester", slug: "manchester", countryCode: "GB", lat: 53.4808, lon: -2.2426, timezone: "Europe/London" },
  { name: "Paris", slug: "paris", countryCode: "FR", lat: 48.8566, lon: 2.3522, timezone: "Europe/Paris" },
  { name: "Lyon", slug: "lyon", countryCode: "FR", lat: 45.7640, lon: 4.8357, timezone: "Europe/Paris" },
  { name: "Berlin", slug: "berlin", countryCode: "DE", lat: 52.5200, lon: 13.4050, timezone: "Europe/Berlin" },
  { name: "Lisbon", slug: "lisbon", countryCode: "PT", lat: 38.7223, lon: -9.1393, timezone: "Europe/Lisbon" },
  { name: "San Francisco", slug: "san-francisco", countryCode: "US", lat: 37.7749, lon: -122.4194, timezone: "America/Los_Angeles" },
  { name: "New York", slug: "new-york", countryCode: "US", lat: 40.7128, lon: -74.0060, timezone: "America/New_York" },
  { name: "Los Angeles", slug: "los-angeles", countryCode: "US", lat: 34.0522, lon: -118.2437, timezone: "America/Los_Angeles" },
  { name: "Austin", slug: "austin", countryCode: "US", lat: 30.2672, lon: -97.7431, timezone: "America/Chicago" },
  { name: "Toronto", slug: "toronto", countryCode: "CA", lat: 43.6532, lon: -79.3832, timezone: "America/Toronto" },
  { name: "Vancouver", slug: "vancouver", countryCode: "CA", lat: 49.2827, lon: -123.1207, timezone: "America/Vancouver" },
  { name: "Sydney", slug: "sydney", countryCode: "AU", lat: -33.8688, lon: 151.2093, timezone: "Australia/Sydney" },
  { name: "Melbourne", slug: "melbourne", countryCode: "AU", lat: -37.8136, lon: 144.9631, timezone: "Australia/Melbourne" },
  { name: "Bangkok", slug: "bangkok", countryCode: "TH", lat: 13.7563, lon: 100.5018, timezone: "Asia/Bangkok" },
  { name: "Bali", slug: "bali", countryCode: "ID", lat: -8.3405, lon: 115.0920, timezone: "Asia/Makassar" },
];

async function seed() {
  console.log("Seeding countries...");
  for (const c of COUNTRIES) {
    await db().query(
      "INSERT INTO countries (name, code, continent_code) VALUES ($1, $2, $3) ON CONFLICT (code) DO NOTHING",
      [c.name, c.code, c.continent],
    );
  }
  console.log(`  ${COUNTRIES.length} countries seeded.`);

  console.log("Seeding cities...");
  for (const city of CITIES) {
    const country = await db().query<{ id: string }>(
      "SELECT id FROM countries WHERE code = $1",
      [city.countryCode],
    );
    if (country.rows.length === 0) {
      console.warn(`  Country ${city.countryCode} not found, skipping ${city.name}`);
      continue;
    }
    await db().query(
      "INSERT INTO cities (name, slug, country_id, latitude, longitude, timezone) VALUES ($1, $2, $3, $4, $5, $6) ON CONFLICT (slug) DO NOTHING",
      [city.name, city.slug, country.rows[0].id, city.lat, city.lon, city.timezone],
    );
  }
  console.log(`  ${CITIES.length} cities seeded.`);
}

seed()
  .then(() => {
    console.log("Done!");
    process.exit(0);
  })
  .catch((err) => {
    console.error("Seed failed:", err);
    process.exit(1);
  });
