"use server";

import postgres from "postgres";

type SqlClient = ReturnType<typeof postgres>;

const globalForPostgres = globalThis as typeof globalThis & {
  workflowsSql?: SqlClient;
};

export function getDatabase(): SqlClient {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is not configured for the Workflows database.");
  }

  if (!globalForPostgres.workflowsSql) {
    globalForPostgres.workflowsSql = postgres(connectionString, {
      max: 5,
      idle_timeout: 20,
      connect_timeout: 10,
      prepare: false,
    });
  }

  return globalForPostgres.workflowsSql;
}
