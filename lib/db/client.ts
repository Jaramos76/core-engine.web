import "server-only";

import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import * as schema from "./schema";

// The connection is created lazily on first query, never at module load —
// `next build` evaluates route modules with no DATABASE_URL and must not throw.
declare global {
  var __ce_pg: ReturnType<typeof postgres> | undefined;
  var __ce_db: PostgresJsDatabase<typeof schema> | undefined;
}

function connectionString(): string {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      "DATABASE_URL is not set. Core Engine's application database is required at runtime.",
    );
  }
  return url;
}

function init(): PostgresJsDatabase<typeof schema> {
  if (globalThis.__ce_db) return globalThis.__ce_db;
  const client =
    globalThis.__ce_pg ??
    postgres(connectionString(), {
      max: Number(process.env.DATABASE_POOL_MAX ?? 10),
      idle_timeout: 30,
      connect_timeout: 10,
    });
  const d = drizzle(client, { schema });
  globalThis.__ce_pg = client;
  globalThis.__ce_db = d;
  return d;
}

// A thin proxy so callers keep using `db.select()...` unchanged while the
// underlying connection is deferred until the first property access.
export const db = new Proxy({} as PostgresJsDatabase<typeof schema>, {
  get(_target, prop, receiver) {
    const real = init();
    const value = Reflect.get(real as object, prop, receiver);
    return typeof value === "function" ? value.bind(real) : value;
  },
});

export { schema };
