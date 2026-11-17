import "server-only";
import postgres from "postgres";

const connectionString = process.env.DATABASE_URL;

if (!connectionString && process.env.NODE_ENV === "production") {
  console.warn("DATABASE_URL is not configured; workflow persistence is unavailable.");
}

type SqlClient = ReturnType<typeof postgres>;

const globalForPostgres = globalThis as typeof globalThis & {
  workflowsSql?: SqlClient;
};

function createClient(): SqlClient | null {
  if (!connectionString) return null;

  return postgres(connectionString, {
    max: 1,
    idle_timeout: 20,
    connect_timeout: 10,
    prepare: false,
    ...(process.env.DATABASE_SSL === "require" ? { ssl: "require" as const } : {}),
  });
}

export const db = globalForPostgres.workflowsSql ?? createClient();

if (process.env.NODE_ENV !== "production" && db) {
  globalForPostgres.workflowsSql = db;
}

export function requireDb(): SqlClient {
  if (!db) {
    throw new Error("Database is not configured. Set DATABASE_URL on the server.");
  }
  return db;
}
