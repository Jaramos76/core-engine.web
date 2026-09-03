import { defineConfig } from "drizzle-kit";

// Migrations are generated from lib/db/schema.ts into ./drizzle and applied
// explicitly by scripts/migrate.ts (never on app startup).
export default defineConfig({
  schema: "./lib/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL ?? "postgres://localhost:5432/core_engine",
  },
  strict: true,
  verbose: true,
});
