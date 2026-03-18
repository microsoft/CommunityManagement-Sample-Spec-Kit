import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { setTestDb, clearTestDb } from "@/lib/db/client";
import { listCities, getCityById, getCityBySlug, findNearestCity } from "@/lib/cities/service";
import fs from "fs";
import path from "path";

let db: PGlite;

async function applyMigrations(db: PGlite) {
  const migrationsDir = path.resolve(__dirname, "../../../src/db/migrations");
  const files = fs.readdirSync(migrationsDir).filter((f) => f.endsWith(".sql")).sort();
  for (const file of files) {
    const sql = fs.readFileSync(path.join(migrationsDir, file), "utf-8");
    await db.exec(sql);
  }
}

async function seedCityData(db: PGlite) {
  await db.query(
    "INSERT INTO countries (id, name, code, continent_code) VALUES ('00000000-0000-0000-0000-000000000001', 'United Kingdom', 'GB', 'EU')",
  );
  await db.query(
    "INSERT INTO countries (id, name, code, continent_code) VALUES ('00000000-0000-0000-0000-000000000002', 'France', 'FR', 'EU')",
  );
  await db.query(
    "INSERT INTO cities (id, name, slug, country_id, latitude, longitude, timezone) VALUES ('10000000-0000-0000-0000-000000000001', 'London', 'london', '00000000-0000-0000-0000-000000000001', 51.5074, -0.1278, 'Europe/London')",
  );
  await db.query(
    "INSERT INTO cities (id, name, slug, country_id, latitude, longitude, timezone) VALUES ('10000000-0000-0000-0000-000000000002', 'Bristol', 'bristol', '00000000-0000-0000-0000-000000000001', 51.4545, -2.5879, 'Europe/London')",
  );
  await db.query(
    "INSERT INTO cities (id, name, slug, country_id, latitude, longitude, timezone) VALUES ('10000000-0000-0000-0000-000000000003', 'Paris', 'paris', '00000000-0000-0000-0000-000000000002', 48.8566, 2.3522, 'Europe/Paris')",
  );
}

describe("Cities Service", () => {
  beforeEach(async () => {
    db = new PGlite();
    await applyMigrations(db);
    setTestDb(db);
    await seedCityData(db);
  });

  afterEach(async () => {
    clearTestDb();
    await db.close();
  });

  it("should list all cities", async () => {
    const cities = await listCities();
    expect(cities).toHaveLength(3);
  });

  it("should filter cities by country code", async () => {
    const cities = await listCities({ countryCode: "GB" });
    expect(cities).toHaveLength(2);
    expect(cities.every((c) => c.countryCode === "GB")).toBe(true);
  });

  it("should search cities by name", async () => {
    const cities = await listCities({ q: "lond" });
    expect(cities).toHaveLength(1);
    expect(cities[0].name).toBe("London");
  });

  it("should get city by id", async () => {
    const city = await getCityById("10000000-0000-0000-0000-000000000001");
    expect(city).not.toBeNull();
    expect(city!.name).toBe("London");
    expect(city!.slug).toBe("london");
  });

  it("should get city by slug", async () => {
    const city = await getCityBySlug("bristol");
    expect(city).not.toBeNull();
    expect(city!.name).toBe("Bristol");
  });

  it("should return null for nonexistent city", async () => {
    const city = await getCityById("99999999-9999-9999-9999-999999999999");
    expect(city).toBeNull();
  });

  it("should find nearest city within 100km", async () => {
    // Coordinates near London
    const result = await findNearestCity(51.51, -0.13);
    expect(result.matched).toBe(true);
    expect(result.city).not.toBeNull();
    expect(result.city!.name).toBe("London");
    expect(result.distanceKm).toBeLessThan(10);
  });

  it("should not match when no city within 100km", async () => {
    // Middle of the Atlantic
    const result = await findNearestCity(40.0, -30.0);
    expect(result.matched).toBe(false);
    expect(result.city).toBeNull();
  });
});
