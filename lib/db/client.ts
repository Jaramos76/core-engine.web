import "server-only";

import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import * as schema from "./schema";

// Single pooled connection, reused across hot reloads in dev.
declare global {
  var __ce_pg: ReturnType<typeof postgres> | undefined;
}

function connectionString(): string {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      "DATABASE_URL is not set. Core Engine's application database is required for /dashboard/projects.",
    );
  }
  return url;
}

const client =
  globalThis.__ce_pg ??
  postgres(connectionString(), {
    max: Number(process.env.DATABASE_POOL_MAX ?? 10),
    idle_timeout: 30,
    connect_timeout: 10,
  });

if (process.env.NODE_ENV !== "production") globalThis.__ce_pg = client;

export const db = drizzle(client, { schema });
export { schema };
