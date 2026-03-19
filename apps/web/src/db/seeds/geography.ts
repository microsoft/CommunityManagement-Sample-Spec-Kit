import { getDb } from "../../lib/db/client";

const CITIES = [
  { city: "bristol", country: "uk", continent: "europe", displayCity: "Bristol", displayCountry: "United Kingdom", displayContinent: "Europe" },
  { city: "london", country: "uk", continent: "europe", displayCity: "London", displayCountry: "United Kingdom", displayContinent: "Europe" },
  { city: "brighton", country: "uk", continent: "europe", displayCity: "Brighton", displayCountry: "United Kingdom", displayContinent: "Europe" },
  { city: "manchester", country: "uk", continent: "europe", displayCity: "Manchester", displayCountry: "United Kingdom", displayContinent: "Europe" },
  { city: "paris", country: "france", continent: "europe", displayCity: "Paris", displayCountry: "France", displayContinent: "Europe" },
  { city: "lyon", country: "france", continent: "europe", displayCity: "Lyon", displayCountry: "France", displayContinent: "Europe" },
  { city: "berlin", country: "germany", continent: "europe", displayCity: "Berlin", displayCountry: "Germany", displayContinent: "Europe" },
  { city: "lisbon", country: "portugal", continent: "europe", displayCity: "Lisbon", displayCountry: "Portugal", displayContinent: "Europe" },
  { city: "san_francisco", country: "us", continent: "north_america", displayCity: "San Francisco", displayCountry: "United States", displayContinent: "North America" },
  { city: "new_york", country: "us", continent: "north_america", displayCity: "New York", displayCountry: "United States", displayContinent: "North America" },
  { city: "los_angeles", country: "us", continent: "north_america", displayCity: "Los Angeles", displayCountry: "United States", displayContinent: "North America" },
  { city: "austin", country: "us", continent: "north_america", displayCity: "Austin", displayCountry: "United States", displayContinent: "North America" },
  { city: "toronto", country: "canada", continent: "north_america", displayCity: "Toronto", displayCountry: "Canada", displayContinent: "North America" },
  { city: "vancouver", country: "canada", continent: "north_america", displayCity: "Vancouver", displayCountry: "Canada", displayContinent: "North America" },
  { city: "sydney", country: "australia", continent: "oceania", displayCity: "Sydney", displayCountry: "Australia", displayContinent: "Oceania" },
  { city: "melbourne", country: "australia", continent: "oceania", displayCity: "Melbourne", displayCountry: "Australia", displayContinent: "Oceania" },
  { city: "bangkok", country: "thailand", continent: "asia", displayCity: "Bangkok", displayCountry: "Thailand", displayContinent: "Asia" },
  { city: "bali", country: "indonesia", continent: "asia", displayCity: "Bali", displayCountry: "Indonesia", displayContinent: "Asia" },
];

async function seed() {
  const db = getDb();

  for (const c of CITIES) {
    await db.query(
      `INSERT INTO geography (city, country, continent, display_name_city, display_name_country, display_name_continent)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (city) DO NOTHING`,
      [c.city, c.country, c.continent, c.displayCity, c.displayCountry, c.displayContinent],
    );
  }

  console.log(`Seeded ${CITIES.length} cities.`);
  process.exit(0);
}

seed();
