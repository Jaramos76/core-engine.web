// Apply pending SQL migrations. Run explicitly — never on app startup.
//
//   DATABASE_URL=postgres://… npx tsx scripts/migrate.ts
//
// Used locally, in the deploy script, and by the importer before it writes.

import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error("DATABASE_URL is required");
    process.exit(1);
  }
  const sql = postgres(url, { max: 1, onnotice: () => {} });
  const db = drizzle(sql);
  console.log("[migrate] applying migrations from ./drizzle …");
  await migrate(db, { migrationsFolder: "./drizzle" });
  await sql.end();
  console.log("[migrate] done");
}

main().catch((err) => {
  console.error("[migrate] failed:", err);
  process.exit(1);
});
