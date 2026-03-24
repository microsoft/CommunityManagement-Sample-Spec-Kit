import pg from "pg";

let pool: pg.Pool | null = null;

export interface DbClient {
  query<T extends pg.QueryResultRow = pg.QueryResultRow>(
    text: string,
    params?: unknown[],
  ): Promise<pg.QueryResult<T>>;
}

let devDb: DbClient | null = null;

/**
 * Returns a token-fetching password function for Azure Entra auth.
 * Used when AZURE_CLIENT_ID and PGHOST are set (deployed environment).
 */
async function getEntraPassword(): Promise<string> {
  const { DefaultAzureCredential } = await import("@azure/identity");
  const credential = new DefaultAzureCredential({
    managedIdentityClientId: process.env.AZURE_CLIENT_ID,
  });
  const token = await credential.getToken(
    "https://ossrdbms-aad.database.windows.net/.default",
  );
  return token.token;
}

export function getDb(): DbClient {
  const dbUrl = process.env.DATABASE_URL;
  const pgHost = process.env.PGHOST;
  const azureClientId = process.env.AZURE_CLIENT_ID;

  // Managed Identity token auth (deployed environment)
  if (pgHost && azureClientId) {
    if (!pool) {
      pool = new pg.Pool({
        host: pgHost,
        port: 5432,
        database: process.env.PGDATABASE || "acroyoga",
        user: process.env.PGUSER || azureClientId,
        password: getEntraPassword,
        ssl: { rejectUnauthorized: true },
        max: 10,
      });
    }
    return pool;
  }

  // No DATABASE_URL or explicitly set to "pglite" → use PGlite file-backed dev DB
  if (!dbUrl || dbUrl === "pglite") {
    if (!devDb) {
      let ready: Promise<DbClient> | null = null;
      devDb = {
        async query(text: string, params?: unknown[]) {
          if (!ready) {
            ready = import("./pglite-dev").then((m) => m.getDevDb());
          }
          const client = await ready;
          return client.query(text, params);
        },
      } as DbClient;
    }
    return devDb;
  }

  if (!pool) {
    pool = new pg.Pool({
      connectionString: dbUrl,
      max: 10,
    });
  }
  return pool;
}

/** For tests: inject a PGlite-compatible client */
let testClient: DbClient | null = null;

/** Accepts PGlite or pg Pool — PGlite's Results shape is close enough at runtime */
export function setTestDb(client: { query(text: string, params?: unknown[]): Promise<{ rows: unknown[] }> }): void {
  testClient = client as DbClient;
}

export function clearTestDb(): void {
  testClient = null;
}

export function db(): DbClient {
  if (testClient) return testClient;
  return getDb();
}
