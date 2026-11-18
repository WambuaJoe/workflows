import "server-only";
import postgres from "postgres";

const connectionString = process.env.DATABASE_URL;

if (!connectionString && process.env.NODE_ENV === "production") {
  console.warn("DATABASE_URL is not configured; workflow persistence is unavailable.");
}

type SqlClient = ReturnType<typeof postgres>;

const TRANSIENT_CONNECTION_CODES = new Set([
  "ECONNREFUSED",
  "ECONNRESET",
  "ETIMEDOUT",
  "EHOSTUNREACH",
  "ENETUNREACH",
  "EAI_AGAIN",
]);

const RETRY_DELAYS_MS = [250, 750];

function isTransientConnectionError(error: unknown, depth = 0): boolean {
  if (!error || typeof error !== "object" || depth > 4) return false;

  const candidate = error as {
    code?: unknown;
    errors?: unknown;
    cause?: unknown;
  };

  if (
    typeof candidate.code === "string" &&
    TRANSIENT_CONNECTION_CODES.has(candidate.code)
  ) {
    return true;
  }

  if (Array.isArray(candidate.errors)) {
    return candidate.errors.some((nested) =>
      isTransientConnectionError(nested, depth + 1),
    );
  }

  return isTransientConnectionError(candidate.cause, depth + 1);
}

function wait(milliseconds: number) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

export async function withTransientConnectionRetry<T>(
  operation: () => Promise<T>,
): Promise<T> {
  for (let attempt = 0; ; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      const delay = RETRY_DELAYS_MS[attempt];
      if (delay === undefined || !isTransientConnectionError(error)) {
        throw error;
      }

      await wait(delay);
    }
  }
}

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
