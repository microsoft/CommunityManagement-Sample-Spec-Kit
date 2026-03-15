import pg from "pg";

let pool: pg.Pool | null = null;

export interface DbClient {
  query<T extends pg.QueryResultRow = pg.QueryResultRow>(
    text: string,
    params?: unknown[],
  ): Promise<pg.QueryResult<T>>;
}

export function getDb(): DbClient {
  if (!pool) {
    pool = new pg.Pool({
      connectionString: process.env.DATABASE_URL,
      max: 10,
    });
  }
  return pool;
}

/** For tests: inject a PGlite-compatible client */
let testClient: DbClient | null = null;

export function setTestDb(client: DbClient): void {
  testClient = client;
}

export function clearTestDb(): void {
  testClient = null;
}

export function db(): DbClient {
  if (testClient) return testClient;
  return getDb();
}
